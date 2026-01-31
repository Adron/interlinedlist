'use client';

import { useState, useEffect } from 'react';
import { Avatar } from '@/components/Avatar';

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
  emailVerified: boolean;
  createdAt: string;
  isAdministrator?: boolean;
}

interface UserManagementProps {
  initialUsers: User[];
  initialTotal: number;
}

export default function UserManagement({ initialUsers, initialTotal }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<User>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const itemsPerPage = 20;

  useEffect(() => {
    // Only fetch if search term exists or page changed from initial
    if (!searchTerm && currentPage === 1) {
      return;
    }

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
          ...(searchTerm && { search: searchTerm }),
        });

        const response = await fetch(`/api/admin/users?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
          setTotal(data.pagination?.total || 0);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchUsers();
    }, searchTerm ? 300 : 0);

    return () => clearTimeout(timeoutId);
  }, [currentPage, searchTerm]);

  const totalPages = Math.ceil(total / itemsPerPage);

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      email: user.email,
      username: user.username,
      displayName: user.displayName || '',
      avatar: user.avatar || '',
      bio: user.bio || '',
      emailVerified: user.emailVerified,
      isAdministrator: user.isAdministrator || false,
    });
    setSaveError(null);
  };

  const handleCloseModal = () => {
    setEditingUser(null);
    setEditFormData({});
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!editingUser) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      });

      const data = await response.json();

      if (!response.ok) {
        setSaveError(data.error || 'Failed to update user');
        setIsSaving(false);
        return;
      }

      // Update the user in the list
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === editingUser.id ? data.user : u))
      );

      handleCloseModal();
    } catch (error) {
      console.error('Failed to update user:', error);
      setSaveError('An error occurred while updating the user');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="h5 mb-0">User Management</h4>
          <div className="text-muted small">
            Total Users: <strong>{total}</strong>
          </div>
        </div>

        {/* Search */}
        <div className="mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Search by email, username, or display name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-4 text-muted">
            No users found
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Username</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          {user.avatar ? (
                            <Avatar
                              src={user.avatar}
                              alt={`${user.displayName || user.username}'s avatar`}
                              size={32}
                            />
                          ) : (
                            <div
                              className="rounded-circle d-flex align-items-center justify-content-center"
                              style={{
                                width: '32px',
                                height: '32px',
                                backgroundColor: 'var(--bs-secondary)',
                                color: 'white',
                                fontSize: '0.875rem',
                                fontWeight: 'bold',
                                flexShrink: 0,
                              }}
                            >
                              {(user.displayName || user.username)[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="fw-medium">
                              {user.displayName || user.username}
                            </div>
                            {user.isAdministrator && (
                              <span className="badge bg-primary badge-sm">Admin</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>@{user.username}</td>
                      <td>
                        {user.emailVerified ? (
                          <span className="badge bg-success">Verified</span>
                        ) : (
                          <span className="badge bg-warning">Unverified</span>
                        )}
                      </td>
                      <td>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleEditClick(user)}
                          title="Edit user"
                        >
                          <i className="bx bx-edit"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <nav aria-label="User pagination">
                <ul className="pagination justify-content-center mb-0">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                  </li>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <li
                          key={page}
                          className={`page-item ${currentPage === page ? 'active' : ''}`}
                        >
                          <button
                            className="page-link"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </button>
                        </li>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <li key={page} className="page-item disabled">
                          <span className="page-link">...</span>
                        </li>
                      );
                    }
                    return null;
                  })}
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            )}
          </>
        )}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex={-1}
          role="dialog"
          aria-labelledby="editUserModalLabel"
          aria-hidden="false"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="editUserModalLabel">
                  Edit User: {editingUser.email}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseModal}
                  aria-label="Close"
                  disabled={isSaving}
                ></button>
              </div>
              <div className="modal-body">
                {saveError && (
                  <div className="alert alert-danger" role="alert">
                    {saveError}
                  </div>
                )}

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="editEmail" className="form-label">
                      Email <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      id="editEmail"
                      value={editFormData.email || ''}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, email: e.target.value })
                      }
                      disabled={isSaving}
                      required
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label htmlFor="editUsername" className="form-label">
                      Username <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="editUsername"
                      value={editFormData.username || ''}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, username: e.target.value })
                      }
                      disabled={isSaving}
                      required
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="editDisplayName" className="form-label">
                      Display Name
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="editDisplayName"
                      value={editFormData.displayName || ''}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          displayName: e.target.value || null,
                        })
                      }
                      disabled={isSaving}
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label htmlFor="editAvatar" className="form-label">
                      Avatar URL
                    </label>
                    <input
                      type="url"
                      className="form-control"
                      id="editAvatar"
                      value={editFormData.avatar || ''}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          avatar: e.target.value || null,
                        })
                      }
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="editBio" className="form-label">
                    Bio
                  </label>
                  <textarea
                    className="form-control"
                    id="editBio"
                    rows={3}
                    value={editFormData.bio || ''}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        bio: e.target.value || null,
                      })
                    }
                    disabled={isSaving}
                  />
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="editEmailVerified"
                        checked={editFormData.emailVerified || false}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            emailVerified: e.target.checked,
                          })
                        }
                        disabled={isSaving}
                      />
                      <label className="form-check-label" htmlFor="editEmailVerified">
                        Email Verified
                      </label>
                    </div>
                  </div>

                  <div className="col-md-6 mb-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="editIsAdministrator"
                        checked={editFormData.isAdministrator || false}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            isAdministrator: e.target.checked,
                          })
                        }
                        disabled={isSaving}
                      />
                      <label className="form-check-label" htmlFor="editIsAdministrator">
                        Administrator
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
