"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { ParsedField, FormData } from "@/lib/lists/dsl-types";
import { validateFormData } from "@/lib/lists/dsl-validator";
import { parseFieldValue, getFieldComponent, formatFieldValue } from "@/lib/lists/form-generator";
import { formatListCellDisplay } from "@/lib/lists/row-value-display";
import { buildRowMarkdownMarkdown, buildExportDocumentPaths } from "@/lib/lists/row-to-markdown";
import { parseDateFromInput } from "@/lib/lists/date-utils";
import CreateDocFromRowModal from "./CreateDocFromRowModal";
import GitHubIssuesListMark from "./GitHubIssuesListMark";
import ListVisibilityMark from "./ListVisibilityMark";

interface ListDataRow {
  id: string;
  rowData: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
}

/** Client-side row sort: nulls last; uses field type for dates/numbers. */
function compareRowDataValues(
  a: unknown,
  b: unknown,
  field: ParsedField | undefined,
  order: "asc" | "desc"
): number {
  const dir = order === "asc" ? 1 : -1;
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  const type = field?.propertyType;

  if (type === "number") {
    const na = Number(a);
    const nb = Number(b);
    if (isNaN(na) && isNaN(nb)) return 0;
    if (isNaN(na)) return 1;
    if (isNaN(nb)) return -1;
    const cmp = na < nb ? -1 : na > nb ? 1 : 0;
    return cmp * dir;
  }

  if (type === "boolean") {
    if (Boolean(a) === Boolean(b)) return 0;
    return (Boolean(a) ? 1 : -1) * dir;
  }

  if (type === "date" || type === "datetime") {
    const ta =
      a instanceof Date ? a.getTime() : new Date(String(a)).getTime();
    const tb =
      b instanceof Date ? b.getTime() : new Date(String(b)).getTime();
    if (isNaN(ta) && isNaN(tb)) return 0;
    if (isNaN(ta)) return 1;
    if (isNaN(tb)) return -1;
    const cmp = ta < tb ? -1 : ta > tb ? 1 : 0;
    return cmp * dir;
  }

  if (type === "multiselect") {
    const sa = Array.isArray(a) ? a.join("\0") : String(a);
    const sb = Array.isArray(b) ? b.join("\0") : String(b);
    return sa.localeCompare(sb, undefined, { numeric: true }) * dir;
  }

  return (
    String(a).localeCompare(String(b), undefined, { numeric: true }) * dir
  );
}

interface ListDataTableProps {
  listId: string;
  /** Used for row → document export headings and filenames */
  listTitle: string;
  fields: ParsedField[];
  /** When false, hide “create document from row” (e.g. non-subscribers). */
  canCreateDocuments?: boolean;
  onEdit?: (rowId: string) => void;
  onAdd?: () => void;
  /** When set, fetch from this URL instead of /api/lists/[id]/data */
  dataApiUrl?: string;
  /** When true, hide inline edit, add row, delete - show read-only table */
  readOnly?: boolean;
  /** Increment to trigger a refetch (e.g. after manual refresh from GitHub) */
  refreshTrigger?: number;
  /** For GitHub lists: fetch labels/assignees options from repo */
  listSource?: 'local' | 'github';
  githubRepo?: string;
  /** When set, show public/private marker in the table card header */
  listIsPublic?: boolean;
}

export default function ListDataTable({
  listId,
  listTitle,
  fields,
  canCreateDocuments = false,
  onEdit,
  onAdd,
  dataApiUrl,
  readOnly = false,
  refreshTrigger = 0,
  listSource,
  githubRepo,
  listIsPublic,
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
  const [filters, setFilters] = useState<Record<string, string>>(
    listSource === 'github' ? { state: 'open' } : ({} as Record<string, string>)
  );
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

  // For GitHub lists: fetch labels/assignees options
  const [fieldsWithOptions, setFieldsWithOptions] = useState(fields);
  useEffect(() => {
    if (listSource !== 'github' || !githubRepo) {
      setFieldsWithOptions(fields);
      return;
    }
    const [owner, repo] = githubRepo.split('/');
    if (!owner || !repo) {
      setFieldsWithOptions(fields);
      return;
    }
    Promise.all([
      fetch(`/api/github/repos/${owner}/${repo}/labels`).then((r) => r.json()),
      fetch(`/api/github/repos/${owner}/${repo}/assignees`).then((r) => r.json()),
    ])
      .then(([labelsData, assigneesData]) => {
        const labels = Array.isArray(labelsData) ? labelsData.map((l: { name?: string }) => l.name).filter(Boolean) : [];
        const assignees = Array.isArray(assigneesData) ? assigneesData.map((a: { login?: string }) => a.login).filter(Boolean) : [];
        setFieldsWithOptions(
          fields.map((f) => {
            if (f.propertyKey === 'labels' && labels.length > 0) {
              return { ...f, validationRules: { ...f.validationRules, options: labels } };
            }
            if (f.propertyKey === 'assignees' && assignees.length > 0) {
              return { ...f, validationRules: { ...f.validationRules, options: assignees } };
            }
            return f;
          })
        );
      })
      .catch(() => setFieldsWithOptions(fields));
  }, [listSource, githubRepo, fields]);

  const sortedFields = [...fieldsWithOptions].sort((a, b) => a.displayOrder - b.displayOrder);

  const [docExport, setDocExport] = useState<{
    markdown: string;
    title: string;
    relativePath: string;
  } | null>(null);

  const openCreateDocFromRow = (row: ListDataRow) => {
    setDocExport({
      markdown: buildRowMarkdownMarkdown({
        listTitle,
        fields: sortedFields,
        rowData: row.rowData,
      }),
      ...buildExportDocumentPaths(listTitle, row.id),
    });
  };

  // When 4+ field columns, use form-only mode: no inline new row, no inline editing
  const useFormOnlyMode = sortedFields.length >= 4;

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

      const url = dataApiUrl ?? `/api/lists/${listId}/data`;
      const response = await fetch(`${url}?${params.toString()}`);

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
  }, [listId, pagination.offset, filters, refreshTrigger]);

  const sortFieldMeta = useMemo(
    () => sortedFields.find((f) => f.propertyKey === sortField),
    [sortedFields, sortField]
  );

  const displayRows = useMemo(() => {
    if (!sortField) return rows;
    const copy = [...rows];
    copy.sort((a, b) =>
      compareRowDataValues(
        a.rowData[sortField],
        b.rowData[sortField],
        sortFieldMeta,
        sortOrder
      )
    );
    return copy;
  }, [rows, sortField, sortOrder, sortFieldMeta]);

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

      setRows((prev) => prev.filter((r) => r.id !== rowId));
      setPagination((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }));
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

    // Convert date/datetime ISO strings to Date for validation
    const dataToValidate = { ...updatedData };
    sortedFields.forEach((field) => {
      if (field.propertyType === "date" || field.propertyType === "datetime") {
        const v = dataToValidate[field.propertyKey];
        if (typeof v === "string" && v.trim() !== "") {
          dataToValidate[field.propertyKey] = parseDateFromInput(v, field.propertyType);
        } else if (!v) {
          dataToValidate[field.propertyKey] = null;
        }
      }
    });

    // Validate
    const validation = validateFormData(sortedFields, dataToValidate);
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

      const result = await response.json();
      const updatedRow = result.data;
      if (updatedRow) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === rowId
              ? {
                  id: updatedRow.id,
                  rowData: updatedRow.rowData,
                  createdAt: updatedRow.createdAt,
                  updatedAt: updatedRow.updatedAt,
                }
              : r
          )
        );
      }
      setEditingCell(null);
      setEditingData({});
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

    // Convert date/datetime ISO strings to Date for validation
    const dataToValidate = { ...newRowData };
    sortedFields.forEach((field) => {
      if (field.propertyType === "date" || field.propertyType === "datetime") {
        const v = dataToValidate[field.propertyKey];
        if (typeof v === "string" && v.trim() !== "") {
          dataToValidate[field.propertyKey] = parseDateFromInput(v, field.propertyType);
        } else if (!v) {
          dataToValidate[field.propertyKey] = null;
        }
      }
    });

    // Validate
    const validation = validateFormData(sortedFields, dataToValidate);
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

      const result = await response.json();
      const newRow = result.data;
      if (newRow) {
        setRows((prev) => [
          {
            id: newRow.id,
            rowData: newRow.rowData,
            createdAt: newRow.createdAt,
            updatedAt: newRow.updatedAt,
          },
          ...prev,
        ]);
        setPagination((prev) => ({ ...prev, total: prev.total + 1 }));
      }
      setNewRowData({});
      setNewRowErrors({});

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

  const isUrlValue = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    const s = String(value).trim();
    return s.startsWith("http://") || s.startsWith("https://");
  };

  const renderCellContent = (field: ParsedField, value: any) => {
    const formatted = formatListCellDisplay(field, value);
    if (!formatted) return formatted;
    if (field.propertyType === "url" || isUrlValue(value)) {
      return (
        <a href={formatted} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
          {formatted}
        </a>
      );
    }
    return formatted;
  };

  const renderEditableCell = (row: ListDataRow, field: ParsedField) => {
    if (readOnly || useFormOnlyMode) {
      const value = row.rowData[field.propertyKey];
      return (
        <td key={field.propertyKey}>
          {renderCellContent(field, value)}
        </td>
      );
    }
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
      } else if (field.propertyType === "date" || field.propertyType === "datetime") {
        return (
          <td key={field.propertyKey} className="p-1">
            <input
              className="form-control form-control-sm"
              type={field.propertyType === "date" ? "date" : "datetime-local"}
              value={formatFieldValue(field, value) || ""}
              onChange={(e) => handleCellChange(field.propertyKey, e.target.value)}
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
              min={field.validationRules?.min}
              max={field.validationRules?.max}
            />
          </td>
        );
      } else if (fieldComponent.type === "input" && field.propertyType !== "date" && field.propertyType !== "datetime") {
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
        {renderCellContent(field, value)}
      </td>
    );
  };

  const renderEmptyRowCell = (field: ParsedField) => {
    const fieldComponent = getFieldComponent(field);
    const value = newRowData[field.propertyKey];
    const hasError = !!newRowErrors[field.propertyKey];

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
    } else if (field.propertyType === "date" || field.propertyType === "datetime") {
      return (
        <td key={field.propertyKey} className="p-1">
          <input
            id={`new-row-${field.propertyKey}`}
            className={`form-control form-control-sm ${hasError ? "is-invalid" : ""}`}
            type={field.propertyType === "date" ? "date" : "datetime-local"}
            value={formatFieldValue(field, value) || ""}
            onChange={(e) => handleNewRowChange(field.propertyKey, e.target.value)}
            disabled={isSavingNewRow}
            required={field.isRequired}
            min={field.validationRules?.min}
            max={field.validationRules?.max}
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
    <>
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center gap-2 flex-wrap">
        <h5 className="mb-0 d-flex align-items-center gap-2 flex-wrap min-w-0">
          <span>List Data</span>
          {listSource === "github" && (
            <>
              <span className="text-secondary" aria-hidden>
                ·
              </span>
              <span
                className="text-truncate fw-semibold"
                style={{ maxWidth: "min(320px, 55vw)" }}
                title={listTitle}
              >
                {listTitle}
              </span>
              <GitHubIssuesListMark showLabel />
            </>
          )}
          {typeof listIsPublic === "boolean" && (
            <ListVisibilityMark isPublic={listIsPublic} showLabel />
          )}
        </h5>
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
                    {!readOnly && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row) => (
                    <tr key={row.id}>
                      {sortedFields.map((field) => renderEditableCell(row, field))}
                      {!readOnly && (
                        <td>
                          <div className="btn-group btn-group-sm">
                            {useFormOnlyMode ? (
                              <>
                                <Link
                                  href={`/lists/${listId}/edit/${row.id}`}
                                  className="btn btn-outline-secondary btn-sm"
                                  title="Edit in form"
                                >
                                  <i className="bx bx-edit"></i>
                                </Link>
                                {canCreateDocuments && (
                                  <button
                                    type="button"
                                    className="btn btn-outline-primary btn-sm"
                                    title="Create document from row"
                                    onClick={() => openCreateDocFromRow(row)}
                                  >
                                    <i className="bx bx-file-blank"></i>
                                  </button>
                                )}
                                {listSource !== 'github' && (
                                  <button
                                    className="btn btn-outline-danger"
                                    onClick={() => handleDelete(row.id)}
                                    title="Delete row"
                                  >
                                    <i className="bx bx-trash"></i>
                                  </button>
                                )}
                              </>
                            ) : editingCell?.rowId === row.id ? (
                              <>
                                <Link
                                  href={`/lists/${listId}/edit/${row.id}`}
                                  className="btn btn-outline-secondary btn-sm"
                                  title="Edit in form"
                                >
                                  <i className="bx bx-edit"></i>
                                </Link>
                                {canCreateDocuments && (
                                  <button
                                    type="button"
                                    className="btn btn-outline-primary btn-sm"
                                    title="Create document from row"
                                    onClick={() => openCreateDocFromRow(row)}
                                  >
                                    <i className="bx bx-file-blank"></i>
                                  </button>
                                )}
                              </>
                            ) : (
                              <>
                                <button
                                  className="btn btn-outline-secondary"
                                  onClick={() => sortedFields[0] && startEditing(row.id, sortedFields[0].propertyKey)}
                                  title="Edit row"
                                >
                                  <i className="bx bx-edit"></i>
                                </button>
                                <Link
                                  href={`/lists/${listId}/edit/${row.id}`}
                                  className="btn btn-outline-secondary btn-sm"
                                  title="Edit in form"
                                >
                                  <i className="bx bx-edit"></i>
                                </Link>
                                {canCreateDocuments && (
                                  <button
                                    type="button"
                                    className="btn btn-outline-primary btn-sm"
                                    title="Create document from row"
                                    onClick={() => openCreateDocFromRow(row)}
                                  >
                                    <i className="bx bx-file-blank"></i>
                                  </button>
                                )}
                                {listSource !== 'github' && (
                                  <button
                                    className="btn btn-outline-danger"
                                    onClick={() => handleDelete(row.id)}
                                    title="Delete row"
                                  >
                                    <i className="bx bx-trash"></i>
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  
                  {/* Empty row - only when not readOnly and not form-only mode (4+ columns) */}
                  {!readOnly && !useFormOnlyMode && (
                    <tr className="table-light">
                      {sortedFields.map((field) => renderEmptyRowCell(field))}
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
                  )}
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
    <CreateDocFromRowModal
      open={docExport !== null}
      onClose={() => setDocExport(null)}
      markdown={docExport?.markdown ?? ""}
      title={docExport?.title ?? ""}
      relativePath={docExport?.relativePath ?? ""}
    />
    </>
  );
}
