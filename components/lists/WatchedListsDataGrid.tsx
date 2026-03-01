'use client';

import { useState, useMemo, type ReactNode } from 'react';
import Link from 'next/link';

interface WatchedListForGrid {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date | string;
  parentId: string | null;
  parent?: { id: string; title: string } | null;
  role: string;
  owner: {
    id: string;
    username: string;
    displayName: string | null;
  };
}

interface WatchedListsDataGridProps {
  lists: WatchedListForGrid[];
}

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50] as const;
type SortField = 'title' | 'owner' | 'role' | 'created';
type SortOrder = 'asc' | 'desc';

export default function WatchedListsDataGrid({ lists }: WatchedListsDataGridProps) {
  const [titleFilter, setTitleFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filtered = useMemo(() => {
    const title = titleFilter.trim().toLowerCase();
    const owner = ownerFilter.trim().toLowerCase();
    return lists.filter((list) => {
      const matchesTitle = !title || (list.title || '').toLowerCase().includes(title);
      const ownerName = list.owner.displayName || list.owner.username;
      const matchesOwner = !owner || ownerName.toLowerCase().includes(owner) || list.owner.username.toLowerCase().includes(owner);
      return matchesTitle && matchesOwner;
    });
  }, [lists, titleFilter, ownerFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title':
          cmp = (a.title || '').localeCompare(b.title || '');
          break;
        case 'owner':
          cmp = (a.owner.displayName || a.owner.username).localeCompare(b.owner.displayName || b.owner.username);
          break;
        case 'role':
          cmp = (a.role || '').localeCompare(b.role || '');
          break;
        case 'created':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
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
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleClearFilters = () => {
    setTitleFilter('');
    setOwnerFilter('');
    setPage(1);
  };

  const hasActiveFilters = titleFilter.trim() !== '' || ownerFilter.trim() !== '';

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <i className="bx bx-sort-alt-2 ms-1 opacity-50" style={{ fontSize: '0.75rem' }} />;
    return sortOrder === 'asc' ? (
      <i className="bx bx-sort-up ms-1" style={{ fontSize: '0.75rem' }} />
    ) : (
      <i className="bx bx-sort-down ms-1" style={{ fontSize: '0.75rem' }} />
    );
  };

  const SortableTh = ({ field, label }: { field: SortField; label: string }) => {
    const ariaSort = sortField === field ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none';
    const ariaLabel = sortField === field
      ? `Sort by ${label}, ${sortOrder === 'asc' ? 'ascending' : 'descending'}. Click to change sort.`
      : `Sort by ${label}. Click to sort.`;
    return (
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
        aria-sort={ariaSort}
        aria-label={ariaLabel}
      >
        {label} <SortIcon field={field} />
      </th>
    );
  };

  if (lists.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center py-5">
          <i className="bx bx-show fs-1 text-muted mb-3 d-block"></i>
          <p className="text-muted mb-0">No watched lists. Visit another user&apos;s profile to watch their public lists.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="row g-2 mb-3 align-items-end">
          <div className="col-md-4">
            <label className="form-label small mb-0">Filter by Title</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Filter title..."
              value={titleFilter}
              onChange={(e) => {
                setTitleFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small mb-0">Filter by Owner</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Filter owner..."
              value={ownerFilter}
              onChange={(e) => {
                setOwnerFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="col-md-4 d-flex justify-content-md-end">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
            >
              Clear filters
            </button>
          </div>
        </div>
        <div className="table-responsive border-top">
          <table className="table table-hover table-sm mb-0" style={{ tableLayout: 'fixed', width: '100%' }}>
            <colgroup>
              <col style={{ width: '30%' }} />
              <col style={{ width: '30%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '10%', minWidth: 80 }} />
            </colgroup>
            <thead>
              <tr>
                <SortableTh field="title" label="Title" />
                <SortableTh field="owner" label="Owner" />
                <SortableTh field="role" label="Role" />
                <SortableTh field="created" label="Created" />
                <th className="text-nowrap text-end" style={{ minWidth: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    No lists match the current filters.
                  </td>
                </tr>
              ) : (
                paginated.map((list) => (
                  <tr key={list.id}>
                    <td className="align-middle overflow-hidden">
                      <Link
                        href={`/user/${encodeURIComponent(list.owner.username)}/lists/${list.id}`}
                        className="fw-medium text-decoration-none text-truncate d-block"
                        style={{ maxWidth: '100%' }}
                      >
                        {list.title}
                      </Link>
                    </td>
                    <td className="align-middle overflow-hidden">
                      <Link
                        href={`/user/${encodeURIComponent(list.owner.username)}`}
                        className="text-decoration-none text-truncate d-block"
                        style={{ maxWidth: '100%' }}
                      >
                        {list.owner.displayName || list.owner.username}
                      </Link>
                      {list.owner.displayName && (
                        <span className="text-muted small ms-1">@{list.owner.username}</span>
                      )}
                    </td>
                    <td className="align-middle">
                      <span className="badge bg-secondary text-capitalize">{list.role}</span>
                    </td>
                    <td className="align-middle text-nowrap text-muted small">
                      {new Date(list.createdAt).toLocaleDateString()}
                    </td>
                    <td className="align-middle text-end" style={{ whiteSpace: 'nowrap' }}>
                      <Link
                        href={`/user/${encodeURIComponent(list.owner.username)}/lists/${list.id}`}
                        className="btn btn-sm btn-outline-primary"
                        title="View"
                      >
                        <i className="bx bx-show"></i>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {sorted.length > 0 && (
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 px-0 py-2 border-top">
            <div className="d-flex align-items-center gap-2 flex-wrap">
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
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>
            {totalPages > 1 && (
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                  </li>
                  {(() => {
                    const pages: number[] = [];
                    for (let n = 1; n <= totalPages; n++) {
                      if (n === 1 || n === totalPages || (n >= currentPage - 1 && n <= currentPage + 1)) {
                        pages.push(n);
                      }
                    }
                    const items: ReactNode[] = [];
                    let prev = 0;
                    pages.forEach((n) => {
                      if (prev && n > prev + 1) {
                        items.push(
                          <li key={`ellipsis-${n}`} className="page-item disabled">
                            <span className="page-link">…</span>
                          </li>
                        );
                      }
                      items.push(
                        <li key={n} className={`page-item ${n === currentPage ? 'active' : ''}`}>
                          <button type="button" className="page-link" onClick={() => setPage(n)}>
                            {n}
                          </button>
                        </li>
                      );
                      prev = n;
                    });
                    return items;
                  })()}
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
