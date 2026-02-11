'use client';

import Link from 'next/link';
import DeleteListButton from './DeleteListButton';

interface ListForGrid {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date | string;
  parentId: string | null;
  parent?: { id: string; title: string } | null;
  children?: { id: string; title: string }[];
}

interface ListsDataGridProps {
  lists: ListForGrid[];
}

export default function ListsDataGrid({ lists }: ListsDataGridProps) {
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
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover table-sm mb-0">
            <thead>
              <tr>
                <th className="text-nowrap">Title</th>
                <th className="text-nowrap">Description</th>
                <th className="text-nowrap">Parent</th>
                <th className="text-nowrap">Created</th>
                <th className="text-nowrap text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lists.map((list) => (
                <tr key={list.id}>
                  <td className="align-middle">
                    <Link href={`/lists/${list.id}`} className="fw-medium text-decoration-none">
                      {list.title}
                    </Link>
                  </td>
                  <td className="align-middle text-break" style={{ maxWidth: '300px' }}>
                    <span className="text-muted text-truncate d-inline-block" style={{ maxWidth: '280px' }} title={list.description || ''}>
                      {list.description || '—'}
                    </span>
                  </td>
                  <td className="align-middle">
                    {list.parent ? (
                      <Link href={`/lists/${list.parent.id}`} className="text-decoration-none">
                        {list.parent.title}
                      </Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="align-middle text-nowrap text-muted small">
                    {new Date(list.createdAt).toLocaleDateString()}
                  </td>
                  <td className="align-middle text-end">
                    <div className="btn-group btn-group-sm">
                      <Link
                        href={`/lists/${list.id}`}
                        className="btn btn-outline-primary"
                        title="View"
                      >
                        <i className="bx bx-show"></i>
                      </Link>
                      <Link
                        href={`/lists/${list.id}?edit=true`}
                        className="btn btn-outline-secondary"
                        title="Edit"
                      >
                        <i className="bx bx-edit"></i>
                      </Link>
                      <DeleteListButton listId={list.id} listTitle={list.title} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
