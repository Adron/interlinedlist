"use client";

import { useState, useEffect } from "react";
import { ParsedField } from "@/lib/lists/dsl-types";

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

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">List Data</h5>
        {onAdd && (
          <button className="btn btn-sm btn-primary" onClick={onAdd}>
            Add Row
          </button>
        )}
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
        ) : rows.length === 0 ? (
          <div className="text-center py-4 text-muted">No data found</div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-striped table-hover">
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
                      {sortedFields.map((field) => (
                        <td key={field.propertyKey}>
                          {formatValue(field, row.rowData[field.propertyKey])}
                        </td>
                      ))}
                      <td>
                        <div className="btn-group btn-group-sm">
                          {onEdit && (
                            <button
                              className="btn btn-outline-primary"
                              onClick={() => onEdit(row.id)}
                            >
                              Edit
                            </button>
                          )}
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
