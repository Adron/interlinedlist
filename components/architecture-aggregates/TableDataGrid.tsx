'use client';

import { useEffect, useState } from 'react';

interface TableDataGridProps {
  tableName: string;
}

interface TableRow {
  [key: string]: any;
}

export default function TableDataGrid({ tableName }: TableDataGridProps) {
  const [data, setData] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [columns, setColumns] = useState<string[]>([]);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, [tableName, page]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/architecture-aggregates/${tableName}?page=${page}&limit=${itemsPerPage}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const result = await response.json();
      setData(result.data || []);
      setTotal(result.total || 0);

      // Extract columns from first row if available
      if (result.data && result.data.length > 0) {
        setColumns(Object.keys(result.data[0]));
      } else {
        setColumns([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '—';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (value instanceof Date) {
      return new Date(value).toLocaleString();
    }
    return String(value);
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <i className="bx bx-error-circle me-2"></i>
        {error}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="alert alert-info" role="alert">
        <i className="bx bx-info-circle me-2"></i>
        No data available in this table.
      </div>
    );
  }

  return (
    <div>
      <div className="table-responsive">
        <table className="table table-hover table-sm">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} className="text-nowrap">
                  {column.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td key={column} className="text-break" style={{ maxWidth: '300px' }}>
                    <span className="text-truncate d-inline-block" style={{ maxWidth: '100%' }} title={formatValue(row[column])}>
                      {formatValue(row[column])}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="text-muted small">
            Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, total)} of {total} entries
          </div>
          <nav>
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </button>
              </li>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                // Show first page, last page, current page, and pages around current
                if (
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  (pageNum >= page - 1 && pageNum <= page + 1)
                ) {
                  return (
                    <li key={pageNum} className={`page-item ${pageNum === page ? 'active' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    </li>
                  );
                } else if (pageNum === page - 2 || pageNum === page + 2) {
                  return (
                    <li key={pageNum} className="page-item disabled">
                      <span className="page-link">...</span>
                    </li>
                  );
                }
                return null;
              })}
              <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}
