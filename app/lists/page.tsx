import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserLists, getUserListsWithProperties, getWatchedLists } from '@/lib/lists/queries';
import Link from 'next/link';
import DeleteListButton from '@/components/lists/DeleteListButton';
import ListConnections from '@/components/lists/ListConnections';
import ListsTabs from '@/components/lists/ListsTabs';
import ListsDataGrid from '@/components/lists/ListsDataGrid';
import ListsTreePane from '@/components/lists/ListsTreePane';
import ListsERDDiagram from '@/components/lists/ListsERDDiagram';
import WatchedListsDataGrid from '@/components/lists/WatchedListsDataGrid';
import ParentLink from '@/components/lists/ParentLink';
import ChildLink from '@/components/lists/ChildLink';

export default async function ListsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const [result, resultWithProperties, watchedResult] = await Promise.all([
    getUserLists(user.id, { limit: 100 }),
    getUserListsWithProperties(user.id, { limit: 100 }),
    getWatchedLists(user.id, { limit: 100 }),
  ]);

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row mb-4">
        <div className="col-12 d-flex justify-content-end">
          {user.cleared ? (
            <Link href="/lists/new" className="btn btn-primary">
              <i className="bx bx-plus me-2"></i>
              Create New List
            </Link>
          ) : (
            <span className="text-muted small align-self-center">Contact an administrator to create lists.</span>
          )}
        </div>
      </div>

      {result.lists.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <i className="bx bx-list-ul fs-1 text-muted mb-3 d-block"></i>
            <h3 className="h5 mb-2">No lists yet</h3>
            <p className="text-muted mb-4">
              {user.cleared ? 'Create your first list to get started!' : 'Contact an administrator to create lists.'}
            </p>
            {user.cleared && (
              <Link href="/lists/new" className="btn btn-primary">
                <i className="bx bx-plus me-2"></i>
                Create Your First List
              </Link>
            )}
          </div>
        </div>
      ) : (
        <ListsTabs
          cardsView={
            <ListConnections lists={result.lists}>
              <div className="row position-relative" style={{ minHeight: '400px' }}>
                {result.lists.map((list: any) => (
                  <div
                    key={list.id}
                    className="col-md-6 col-lg-4 mb-4"
                    data-list-id={list.id}
                    data-parent-id={list.parentId || ''}
                  >
                    <div
                      className={`card h-100 ${list.parentId ? 'border-start border-primary border-3' : ''}`}
                      style={{
                        position: 'relative',
                        ...(list.parentId && {
                          backgroundColor: 'rgba(13, 110, 253, 0.02)',
                        }),
                      }}
                    >
                      {list.parentId && (
                        <div
                          className="position-absolute"
                          style={{
                            top: '-8px',
                            left: '-12px',
                            width: '24px',
                            height: '24px',
                            backgroundColor: '#0d6efd',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10,
                          }}
                          title={`Child of: ${list.parent?.title || 'Unknown'}`}
                        >
                          <i className="bx bx-link text-white" style={{ fontSize: '12px' }}></i>
                        </div>
                      )}
                      <div className="card-body d-flex flex-column">
                        <div className="d-flex align-items-start justify-content-between mb-2">
                          <h5 className="card-title mb-0 flex-grow-1">
                            {list.title}
                            {(list as { source?: string }).source === 'github' && (
                              <i className="bx bxl-github ms-1 text-muted" style={{ fontSize: '0.9rem' }} title="GitHub-backed" />
                            )}
                          </h5>
                          {list.parentId && (
                            <span
                              className="badge bg-primary ms-2"
                              style={{ fontSize: '0.65rem' }}
                              title={`Parent: ${list.parent?.title || 'Unknown'}`}
                            >
                              <i className="bx bx-up-arrow-alt"></i>
                            </span>
                          )}
                        </div>
                        {list.parent && (
                          <div className="mb-2">
                            <small className="text-muted d-flex align-items-center">
                              <i className="bx bx-up-arrow-alt me-1" style={{ fontSize: '0.75rem' }}></i>
                              <span>Parent: </span>
                              <ParentLink parentId={list.parent.id} parentTitle={list.parent.title} />
                            </small>
                          </div>
                        )}
                        {list.children && list.children.length > 0 && (
                          <div className="mb-2">
                            <small className="text-muted d-flex align-items-center flex-wrap">
                              <i className="bx bx-down-arrow-alt me-1" style={{ fontSize: '0.75rem' }}></i>
                              <span>Children: </span>
                              {list.children.slice(0, 3).map((child: any, index: number) => (
                                <span key={child.id}>
                                  <ChildLink childId={child.id} childTitle={child.title} />
                                  {index < Math.min(list.children.length, 3) - 1 && <span className="text-muted ms-1">, </span>}
                                </span>
                              ))}
                              {list.children.length > 3 && (
                                <span className="badge bg-secondary ms-1" style={{ fontSize: '0.65rem' }}>
                                  +{list.children.length - 3} more
                                </span>
                              )}
                            </small>
                          </div>
                        )}
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
                              href={(list as { source?: string }).source === 'github'
                                ? `/lists/${list.id}?editParent=true`
                                : `/lists/${list.id}?edit=true`}
                              className="btn btn-sm btn-outline-secondary"
                              title={(list as { source?: string }).source === 'github' ? 'Edit' : 'Edit Schema'}
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
            </ListConnections>
          }
          datagridView={<ListsDataGrid lists={result.lists} />}
          treeView={<ListsTreePane lists={resultWithProperties.lists} />}
          erdView={<ListsERDDiagram lists={resultWithProperties.lists} />}
        />
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

      {watchedResult.lists.length > 0 && (
        <div className="row mt-5">
          <div className="col-12">
            <h4 className="h5 mb-3">Lists you&apos;re watching</h4>
            <p className="text-muted small mb-3">
              Lists owned by others that you have access to (watcher or other role).
            </p>
            <WatchedListsDataGrid lists={watchedResult.lists} />
          </div>
        </div>
      )}
    </div>
  );
}
