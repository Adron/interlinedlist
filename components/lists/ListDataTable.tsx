"use client";

import { useState, useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import { ParsedField, FormData } from "@/lib/lists/dsl-types";
import { validateFormData } from "@/lib/lists/dsl-validator";
import { parseFieldValue, getFieldComponent } from "@/lib/lists/form-generator";

interface ListDataRow {
  id: string;
  rowData: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
}

interface ListDataTableProps {
  listId: string;
  fields: ParsedField[];
  onEdit?: (rowId: string) => void;
  onDelete?: (rowId: string) => void;
  onAdd?: () => void;
}

export default function ListDataTable({
  listId,
  fields,
  onEdit,
  onDelete,
  onAdd,
}: ListDataTableProps) {
  const [rows, setRows] = useState<ListDataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 100,
    offset: 0,
    hasMore: false,
  });
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortField, setSortField] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ rowId: string; fieldKey: string } | null>(null);
  const [editingData, setEditingData] = useState<Record<string, any>>({});
  
  // Empty row state
  const [newRowData, setNewRowData] = useState<Record<string, any>>({});
  const [newRowErrors, setNewRowErrors] = useState<Record<string, string>>({});
  const [isSavingNewRow, setIsSavingNewRow] = useState(false);
  
  // Refs for focus management
  const newRowInputRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>>({});

  const sortedFields = [...fields].sort((a, b) => a.displayOrder - b.displayOrder);

  const fetchData = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString(),
      });

      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });

      // Add sort
      if (sortField) {
        params.append("sort", sortField);
        params.append("order", sortOrder);
      }

      const response = await fetch(`/api/lists/${listId}/data?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const data = await response.json();
      setRows(data.rows || []);
      setPagination(data.pagination || pagination);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [listId, pagination.offset, filters, sortField, sortOrder]);

  const handleFilterChange = (fieldKey: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [fieldKey]: value,
    }));
    setPagination((prev) => ({ ...prev, offset: 0 }));
  };

  const handleSort = (fieldKey: string) => {
    if (sortField === fieldKey) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(fieldKey);
      setSortOrder("asc");
    }
    setPagination((prev) => ({ ...prev, offset: 0 }));
  };

  const handleDelete = async (rowId: string) => {
    if (!confirm("Are you sure you want to delete this row?")) {
      return;
    }

    try {
      const response = await fetch(`/api/lists/${listId}/data/${rowId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete row");
      }

      // Refresh data
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to delete row");
    }
  };

  // Inline editing handlers
  const startEditing = (rowId: string, fieldKey: string) => {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    
    setEditingCell({ rowId, fieldKey });
    setEditingData({ [fieldKey]: row.rowData[fieldKey] ?? "" });
  };

  const handleCellChange = (fieldKey: string, value: any) => {
    setEditingData((prev) => ({ ...prev, [fieldKey]: value }));
  };

  const handleSaveRow = async (rowId: string) => {
    if (!editingCell || editingCell.rowId !== rowId) return;

    const row = rows.find((r) => r.id === rowId);
    if (!row) return;

    // Merge editing data with existing row data
    const updatedData = { ...row.rowData, ...editingData };
    
    // Validate
    const validation = validateFormData(sortedFields, updatedData);
    if (!validation.isValid) {
      // Show validation errors (could be enhanced with toast/alert)
      const errorMessages = validation.errors.map((e) => e.message).join(", ");
      setError(`Validation failed: ${errorMessages}`);
      setEditingCell(null);
      setEditingData({});
      return;
    }

    try {
      const response = await fetch(`/api/lists/${listId}/data/${rowId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: updatedData }),
      });

      if (!response.ok) {
        throw new Error("Failed to update row");
      }

      setEditingCell(null);
      setEditingData({});
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to update row");
      setEditingCell(null);
      setEditingData({});
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditingData({});
  };

  // Empty row handlers
  const handleNewRowChange = (fieldKey: string, value: any) => {
    const field = sortedFields.find((f) => f.propertyKey === fieldKey);
    if (!field) return;

    const parsed = parseFieldValue(field, value);
    setNewRowData((prev) => ({ ...prev, [fieldKey]: parsed }));
    
    // Clear error for this field
    setNewRowErrors((prev) => {
      const updated = { ...prev };
      delete updated[fieldKey];
      return updated;
    });
  };

  const checkRequiredFieldsComplete = (): boolean => {
    return sortedFields.every((field) => {
      if (!field.isRequired) return true;
      const value = newRowData[field.propertyKey];
      return value !== null && value !== undefined && value !== "";
    });
  };

  const handleSaveNewRow = async () => {
    setIsSavingNewRow(true);
    setNewRowErrors({});
    setError("");

    // Validate
    const validation = validateFormData(sortedFields, newRowData);
    if (!validation.isValid) {
      const errorMap: Record<string, string> = {};
      validation.errors.forEach((error) => {
        errorMap[error.field] = error.message;
      });
      setNewRowErrors(errorMap);
      setIsSavingNewRow(false);
      
      // Focus on first invalid field
      const firstInvalidField = sortedFields.find((f) => errorMap[f.propertyKey]);
      if (firstInvalidField) {
        const inputRef = newRowInputRefs.current[firstInvalidField.propertyKey];
        inputRef?.focus();
      }
      return;
    }

    try {
      const response = await fetch(`/api/lists/${listId}/data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: newRowData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add row");
      }

      // Clear empty row and refresh
      setNewRowData({});
      setNewRowErrors({});
      fetchData();
      
      // Focus first input of new empty row after a brief delay
      setTimeout(() => {
        const firstField = sortedFields[0];
        if (firstField) {
          const inputRef = newRowInputRefs.current[firstField.propertyKey];
          inputRef?.focus();
        }
      }, 100);
    } catch (err: any) {
      setError(err.message || "Failed to add row");
    } finally {
      setIsSavingNewRow(false);
    }
  };

  const handleCancelNewRow = () => {
    setNewRowData({});
    setNewRowErrors({});
  };

  const handleTabFromLastColumn = async (e: KeyboardEvent<HTMLElement>) => {
    e.preventDefault();
    
    // Check if all required fields have data
    if (!checkRequiredFieldsComplete()) {
      // Validate to show which fields are missing
      const validation = validateFormData(sortedFields, newRowData);
      if (!validation.isValid) {
        const errorMap: Record<string, string> = {};
        validation.errors.forEach((error) => {
          errorMap[error.field] = error.message;
        });
        setNewRowErrors(errorMap);
        
        // Focus on first invalid field
        const firstInvalidField = sortedFields.find((f) => 
          f.isRequired && (!newRowData[f.propertyKey] || newRowData[f.propertyKey] === "")
        );
        if (firstInvalidField) {
          const inputRef = newRowInputRefs.current[firstInvalidField.propertyKey];
          inputRef?.focus();
        }
        return;
      }
    }
    
    // All required fields have data, validate and save
    await handleSaveNewRow();
  };

  const formatValue = (field: ParsedField, value: any): string => {
    if (value === null || value === undefined) {
      return "";
    }

    switch (field.propertyType) {
      case "boolean":
        return value ? "Yes" : "No";
      case "date":
      case "datetime":
        if (typeof value === "string") {
          return new Date(value).toLocaleString();
        }
        return String(value);
      case "multiselect":
        if (Array.isArray(value)) {
          return value.join(", ");
        }
        return String(value);
      default:
        return String(value);
    }
  };

  const renderEditableCell = (row: ListDataRow, field: ParsedField) => {
    const isEditing = editingCell?.rowId === row.id && editingCell?.fieldKey === field.propertyKey;
    const value = isEditing ? editingData[field.propertyKey] : row.rowData[field.propertyKey];
    const fieldComponent = getFieldComponent(field);

    if (isEditing) {
      if (field.propertyType === "boolean" || fieldComponent.type === "checkbox") {
        return (
          <td key={field.propertyKey} className="p-1 text-center">
            <input
              type="checkbox"
              className="form-check-input"
              checked={Boolean(value)}
              onChange={(e) => handleCellChange(field.propertyKey, e.target.checked)}
              onBlur={() => handleSaveRow(row.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") {
                  e.preventDefault();
                  if (e.key === "Enter") {
                    handleSaveRow(row.id);
                  } else {
                    handleCancelEdit();
                  }
                }
              }}
              autoFocus
            />
          </td>
        );
      } else if (fieldComponent.type === "input") {
        return (
          <td key={field.propertyKey} className="p-1">
            <input
              className="form-control form-control-sm"
              type={fieldComponent.props.type}
              value={value !== null && value !== undefined ? String(value) : ""}
              onChange={(e) => {
                const parsed = parseFieldValue(field, e.target.value);
                handleCellChange(field.propertyKey, parsed);
              }}
              onBlur={() => handleSaveRow(row.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSaveRow(row.id);
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  handleCancelEdit();
                }
              }}
              autoFocus
            />
          </td>
        );
      } else if (fieldComponent.type === "select") {
        return (
          <td key={field.propertyKey} className="p-1">
            <select
              className="form-select form-select-sm"
              value={value !== null && value !== undefined ? String(value) : ""}
              onChange={(e) => handleCellChange(field.propertyKey, e.target.value)}
              onBlur={() => handleSaveRow(row.id)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  handleCancelEdit();
                }
              }}
              autoFocus
            >
              {!field.isRequired && <option value="">-- Select --</option>}
              {fieldComponent.props.options?.map((option: string) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </td>
        );
      }
    }

    return (
      <td
        key={field.propertyKey}
        onClick={() => startEditing(row.id, field.propertyKey)}
        style={{ cursor: "pointer" }}
        className={isEditing ? "table-active" : ""}
      >
        {formatValue(field, value)}
      </td>
    );
  };

  const renderEmptyRowCell = (field: ParsedField, index: number) => {
    const fieldComponent = getFieldComponent(field);
    const value = newRowData[field.propertyKey];
    const hasError = !!newRowErrors[field.propertyKey];
    const isLastColumn = index === sortedFields.length - 1;

    if (field.propertyType === "boolean" || fieldComponent.type === "checkbox") {
      return (
        <td key={field.propertyKey} className="p-1 text-center">
          <input
            ref={(el) => {
              if (el) newRowInputRefs.current[field.propertyKey] = el as any;
            }}
            id={`new-row-${field.propertyKey}`}
            type="checkbox"
            className={`form-check-input ${hasError ? "is-invalid" : ""}`}
            checked={Boolean(value)}
            onChange={(e) => handleNewRowChange(field.propertyKey, e.target.checked)}
            disabled={isSavingNewRow}
          />
          {hasError && (
            <div className="invalid-feedback d-block small">
              {newRowErrors[field.propertyKey]}
            </div>
          )}
        </td>
      );
    } else if (fieldComponent.type === "input") {
      return (
        <td key={field.propertyKey} className="p-1">
          <input
            ref={(el) => {
              if (el) newRowInputRefs.current[field.propertyKey] = el;
            }}
            id={`new-row-${field.propertyKey}`}
            className={`form-control form-control-sm ${hasError ? "is-invalid" : ""}`}
            type={fieldComponent.props.type}
            placeholder={field.propertyName}
            value={value !== null && value !== undefined ? String(value) : ""}
            onChange={(e) => {
              const parsed = parseFieldValue(field, e.target.value);
              handleNewRowChange(field.propertyKey, parsed);
            }}
            onKeyDown={(e) => {
              if (e.key === "Tab" && isLastColumn && !e.shiftKey) {
                handleTabFromLastColumn(e);
              }
              if (e.key === "Escape") {
                handleCancelNewRow();
              }
            }}
            disabled={isSavingNewRow}
          />
          {hasError && (
            <div className="invalid-feedback d-block small">
              {newRowErrors[field.propertyKey]}
            </div>
          )}
        </td>
      );
    } else if (fieldComponent.type === "select") {
      return (
        <td key={field.propertyKey} className="p-1">
          <select
            ref={(el) => {
              if (el) newRowInputRefs.current[field.propertyKey] = el;
            }}
            id={`new-row-${field.propertyKey}`}
            className={`form-select form-select-sm ${hasError ? "is-invalid" : ""}`}
            value={value !== null && value !== undefined ? String(value) : ""}
            onChange={(e) => handleNewRowChange(field.propertyKey, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Tab" && isLastColumn && !e.shiftKey) {
                handleTabFromLastColumn(e);
              }
              if (e.key === "Escape") {
                handleCancelNewRow();
              }
            }}
            disabled={isSavingNewRow}
          >
            {!field.isRequired && <option value="">-- Select --</option>}
            {fieldComponent.props.options?.map((option: string) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {hasError && (
            <div className="invalid-feedback d-block small">
              {newRowErrors[field.propertyKey]}
            </div>
          )}
        </td>
      );
    } else if (fieldComponent.type === "textarea") {
      return (
        <td key={field.propertyKey} className="p-1">
          <textarea
            ref={(el) => {
              if (el) newRowInputRefs.current[field.propertyKey] = el;
            }}
            id={`new-row-${field.propertyKey}`}
            className={`form-control form-control-sm ${hasError ? "is-invalid" : ""}`}
            placeholder={field.propertyName}
            value={value !== null && value !== undefined ? String(value) : ""}
            onChange={(e) => handleNewRowChange(field.propertyKey, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                handleCancelNewRow();
              }
            }}
            disabled={isSavingNewRow}
            rows={fieldComponent.props.rows || 2}
          />
          {hasError && (
            <div className="invalid-feedback d-block small">
              {newRowErrors[field.propertyKey]}
            </div>
          )}
        </td>
      );
    }

    return <td key={field.propertyKey}></td>;
  };

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">List Data</h5>
      </div>
      <div className="card-body">
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="row mb-3">
          {sortedFields.map((field) => (
            <div key={field.propertyKey} className="col-md-3 mb-2">
              <label className="form-label small">{field.propertyName}</label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={filters[field.propertyKey] || ""}
                onChange={(e) => handleFilterChange(field.propertyKey, e.target.value)}
                placeholder={`Filter ${field.propertyName}...`}
              />
            </div>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-striped table-hover table-sm">
                <thead>
                  <tr>
                    {sortedFields.map((field) => (
                      <th
                        key={field.propertyKey}
                        style={{ cursor: "pointer" }}
                        onClick={() => handleSort(field.propertyKey)}
                      >
                        {field.propertyName}
                        {sortField === field.propertyKey && (
                          <span className="ms-1">
                            {sortOrder === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </th>
                    ))}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      {sortedFields.map((field) => renderEditableCell(row, field))}
                      <td>
                        <div className="btn-group btn-group-sm">
                          {(onDelete || true) && (
                            <button
                              className="btn btn-outline-danger"
                              onClick={() => handleDelete(row.id)}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  
                  {/* Empty row - always visible at bottom */}
                  <tr className="table-light">
                    {sortedFields.map((field, index) => renderEmptyRowCell(field, index))}
                    <td>
                      {checkRequiredFieldsComplete() && (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={handleSaveNewRow}
                          disabled={isSavingNewRow}
                        >
                          {isSavingNewRow ? "Adding..." : "Add"}
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-outline-secondary ms-1"
                        onClick={handleCancelNewRow}
                        disabled={isSavingNewRow}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div className="text-muted small">
                Showing {pagination.offset + 1} to{" "}
                {Math.min(pagination.offset + pagination.limit, pagination.total)} of{" "}
                {pagination.total} rows
              </div>
              <div className="btn-group">
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      offset: Math.max(0, prev.offset - prev.limit),
                    }))
                  }
                  disabled={pagination.offset === 0 || loading}
                >
                  Previous
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      offset: prev.offset + prev.limit,
                    }))
                  }
                  disabled={!pagination.hasMore || loading}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
