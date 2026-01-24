import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserLists } from '@/lib/lists/queries';
import Link from 'next/link';
import DeleteListButton from '@/components/lists/DeleteListButton';

export default async function ListsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch lists directly using the query function
  const result = await getUserLists(user.id, { limit: 100 });

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row mb-4">
        <div className="col-12 d-flex justify-content-between align-items-center">
          <h1 className="h2 mb-0">My Lists</h1>
          <Link href="/lists/new" className="btn btn-primary">
            <i className="bx bx-plus me-2"></i>
            Create New List
          </Link>
        </div>
      </div>

      {result.lists.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <i className="bx bx-list-ul fs-1 text-muted mb-3 d-block"></i>
            <h3 className="h5 mb-2">No lists yet</h3>
            <p className="text-muted mb-4">Create your first list to get started!</p>
            <Link href="/lists/new" className="btn btn-primary">
              <i className="bx bx-plus me-2"></i>
              Create Your First List
            </Link>
          </div>
        </div>
      ) : (
        <div className="row">
          {result.lists.map((list: any) => (
            <div key={list.id} className="col-md-6 col-lg-4 mb-4">
              <div className="card h-100">
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title">{list.title}</h5>
                  {list.description && (
                    <p className="card-text text-muted flex-grow-1">{list.description}</p>
                  )}
                  <div className="mt-auto">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <small className="text-muted">
                        Created {new Date(list.createdAt).toLocaleDateString()}
                      </small>
                    </div>
                    <div className="d-flex gap-2">
                      <Link
                        href={`/lists/${list.id}`}
                        className="btn btn-sm btn-primary flex-grow-1"
                      >
                        <i className="bx bx-show me-1"></i>
                        View
                      </Link>
                      <Link
                        href={`/lists/${list.id}?edit=true`}
                        className="btn btn-sm btn-outline-secondary"
                        title="Edit"
                      >
                        <i className="bx bx-edit"></i>
                      </Link>
                      <DeleteListButton listId={list.id} listTitle={list.title} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {result.pagination.hasMore && (
        <div className="row mt-4">
          <div className="col-12 text-center">
            <p className="text-muted">
              Showing {result.pagination.offset + 1} to{' '}
              {Math.min(result.pagination.offset + result.pagination.limit, result.pagination.total)} of{' '}
              {result.pagination.total} lists
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
