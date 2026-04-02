'use client';

import { useState, useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import DeleteListButton from './DeleteListButton';
import GitHubIssuesListMark from './GitHubIssuesListMark';
import ListVisibilityMark from './ListVisibilityMark';

interface ListForGrid {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date | string;
  parentId: string | null;
  parent?: { id: string; title: string } | null;
  children?: { id: string; title: string }[];
  source?: string;
  isPublic?: boolean;
}

interface ListsDataGridProps {
  lists: ListForGrid[];
}

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50] as const;
type SortField = 'title' | 'description' | 'parent' | 'created';
type SortOrder = 'asc' | 'desc';

export default function ListsDataGrid({ lists }: ListsDataGridProps) {
  const [titleFilter, setTitleFilter] = useState('');
  const [descFilter, setDescFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filtered = useMemo(() => {
    const title = titleFilter.trim().toLowerCase();
    const desc = descFilter.trim().toLowerCase();
    return lists.filter((list) => {
      const matchesTitle = !title || (list.title || '').toLowerCase().includes(title);
      const matchesDesc = !desc || (list.description || '').toLowerCase().includes(desc);
      return matchesTitle && matchesDesc;
    });
  }, [lists, titleFilter, descFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title':
          cmp = (a.title || '').localeCompare(b.title || '');
          break;
        case 'description':
          cmp = (a.description || '').localeCompare(b.description || '');
          break;
        case 'parent':
          cmp = (a.parent?.title || '').localeCompare(b.parent?.title || '');
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
    setDescFilter('');
    setPage(1);
  };

  const hasActiveFilters = titleFilter.trim() !== '' || descFilter.trim() !== '';

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
        style={{ cursor: 'pointer', minWidth: field === 'description' ? 120 : undefined }}
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
          <i className="bx bx-table fs-1 text-muted mb-3 d-block"></i>
          <p className="text-muted mb-0">No lists to display.</p>
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
            <label className="form-label small mb-0">Filter by Description</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Filter description..."
              value={descFilter}
              onChange={(e) => {
                setDescFilter(e.target.value);
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
              <col style={{ width: '25%' }} />
              <col style={{ width: '35%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '15%', minWidth: 140 }} />
            </colgroup>
            <thead>
              <tr>
                <SortableTh field="title" label="Title" />
                <SortableTh field="description" label="Description" />
                <SortableTh field="parent" label="Parent" />
                <SortableTh field="created" label="Created" />
                <th className="text-nowrap text-end" style={{ minWidth: 140 }}>Actions</th>
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
                    <div className="d-flex align-items-center gap-2 flex-wrap min-w-0">
                      <Link
                        href={`/lists/${list.id}`}
                        className="fw-medium text-decoration-none text-truncate"
                        style={{ maxWidth: '100%', minWidth: 0 }}
                      >
                        {list.title}
                      </Link>
                      {list.source === 'github' && <GitHubIssuesListMark showLabel />}
                      <ListVisibilityMark isPublic={Boolean(list.isPublic)} showLabel />
                    </div>
                  </td>
                  <td className="align-middle overflow-hidden" style={{ maxWidth: 0 }}>
                    <span className="text-muted text-truncate d-block" style={{ maxWidth: '100%' }} title={list.description || ''}>
                      {list.description || '—'}
                    </span>
                  </td>
                  <td className="align-middle overflow-hidden">
                    {list.parent ? (
                      <Link href={`/lists/${list.parent.id}`} className="text-decoration-none text-truncate d-block" style={{ maxWidth: '100%' }}>
                        {list.parent.title}
                      </Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="align-middle text-nowrap text-muted small">
                    {new Date(list.createdAt).toLocaleDateString()}
                  </td>
                  <td className="align-middle text-end" style={{ whiteSpace: 'nowrap' }}>
                    <div className="btn-group btn-group-sm">
                      <Link
                        href={`/lists/${list.id}`}
                        className="btn btn-outline-primary"
                        title="View"
                      >
                        <i className="bx bx-show"></i>
                      </Link>
                      <Link
                        href={list.source === 'github'
                          ? `/lists/${list.id}?editParent=true`
                          : `/lists/${list.id}?edit=true`}
                        className="btn btn-outline-secondary"
                        title={list.source === 'github' ? 'Edit' : 'Edit Schema'}
                      >
                        <i className="bx bx-edit"></i>
                      </Link>
                      <DeleteListButton listId={list.id} listTitle={list.title} />
                    </div>
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
