'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isSafeAppPath } from '@/lib/notifications/safe-navigate-url';

export type NotificationGridRow = {
  id: string;
  title: string;
  body: string;
  actionUrl: string | null;
  type: string | null;
  createdAt: string;
  readAt: string | null;
};

interface NotificationsDataGridProps {
  notifications: NotificationGridRow[];
}

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50] as const;
type SortField = 'created' | 'title' | 'read';
type SortOrder = 'asc' | 'desc';

export default function NotificationsDataGrid({ notifications }: NotificationsDataGridProps) {
  const router = useRouter();
  const [titleFilter, setTitleFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('created');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filtered = useMemo(() => {
    const q = titleFilter.trim().toLowerCase();
    if (!q) return notifications;
    return notifications.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q) ||
        (n.type && n.type.toLowerCase().includes(q))
    );
  }, [notifications, titleFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'read':
          cmp = (a.readAt ? 1 : 0) - (b.readAt ? 1 : 0);
          if (cmp === 0) {
            cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          }
          break;
        case 'created':
        default:
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sorted.slice(start, start + rowsPerPage);
  }, [sorted, currentPage, rowsPerPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'created' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const markReadAndMaybeNavigate = async (n: NotificationGridRow) => {
    try {
      await fetch(`/api/notifications/${encodeURIComponent(n.id)}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });
    } catch {
      /* continue */
    }
    router.refresh();
    if (n.actionUrl && isSafeAppPath(n.actionUrl)) {
      router.push(n.actionUrl);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <i className="bx bx-sort-alt-2 ms-1 opacity-50" style={{ fontSize: '0.75rem' }} />;
    return sortOrder === 'asc' ? (
      <i className="bx bx-sort-up ms-1" style={{ fontSize: '0.75rem' }} />
    ) : (
      <i className="bx bx-sort-down ms-1" style={{ fontSize: '0.75rem' }} />
    );
  };

  const SortableTh = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="text-nowrap"
      style={{ cursor: 'pointer' }}
      onClick={() => handleSort(field)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSort(field);
        }
      }}
      role="button"
      tabIndex={0}
    >
      {label} <SortIcon field={field} />
    </th>
  );

  if (notifications.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center py-5">
          <i className="bx bx-bell fs-1 text-muted mb-3 d-block"></i>
          <p className="text-muted mb-0">No notifications yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="row g-2 mb-3 align-items-end">
          <div className="col-md-6">
            <label className="form-label small mb-0">Filter</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Title, body, or type…"
              value={titleFilter}
              onChange={(e) => {
                setTitleFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        <div className="table-responsive border-top">
          <table className="table table-hover table-sm mb-0" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr>
                <SortableTh field="created" label="Created" />
                <SortableTh field="title" label="Title" />
                <th>Body</th>
                <SortableTh field="read" label="Read" />
                <th className="text-end text-nowrap" style={{ width: '100px' }}>
                  Open
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    No rows match the filter.
                  </td>
                </tr>
              ) : (
                paginated.map((n) => (
                  <tr
                    key={n.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      void markReadAndMaybeNavigate(n);
                    }}
                  >
                    <td className="align-middle text-muted small text-nowrap">
                      {new Date(n.createdAt).toLocaleString()}
                    </td>
                    <td className="align-middle small fw-medium">{n.title}</td>
                    <td className="align-middle small text-muted">
                      <span className="d-block text-truncate" title={n.body}>
                        {n.body}
                      </span>
                    </td>
                    <td className="align-middle small">
                      {n.readAt ? (
                        <span className="text-muted">{new Date(n.readAt).toLocaleString()}</span>
                      ) : (
                        <span className="badge text-bg-secondary">Unread</span>
                      )}
                    </td>
                    <td className="align-middle text-end" onClick={(e) => e.stopPropagation()}>
                      {n.actionUrl && isSafeAppPath(n.actionUrl) ? (
                        <Link
                          href={n.actionUrl}
                          className="btn btn-sm btn-outline-primary"
                          onClick={async (e) => {
                            e.preventDefault();
                            await markReadAndMaybeNavigate(n);
                          }}
                        >
                          Open
                        </Link>
                      ) : (
                        <span className="text-muted small">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {sorted.length > 0 && (
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 px-0 py-2 border-top">
            <span className="text-muted small">
              Showing {(currentPage - 1) * rowsPerPage + 1} to{' '}
              {Math.min(currentPage * rowsPerPage, sorted.length)} of {sorted.length}
            </span>
            <label className="d-flex align-items-center gap-1 small">
              <span className="text-muted">Rows per page</span>
              <select
                className="form-select form-select-sm"
                style={{ width: 'auto' }}
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setPage(1);
                }}
              >
                {ROWS_PER_PAGE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
