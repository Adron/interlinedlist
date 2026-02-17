'use client';

import { useState, useEffect, useRef } from 'react';
import { Avatar } from '@/components/Avatar';

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
  emailVerified: boolean;
  cleared?: boolean;
  createdAt: string;
  isAdministrator?: boolean;
}

interface UserManagementProps {
  initialUsers: User[];
  initialTotal: number;
  currentUserId?: string;
}

export default function UserManagement({ initialUsers, initialTotal, currentUserId }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<User>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteModalUser, setDeleteModalUser] = useState<User | null>(null);
  const [bulkDeleteStep, setBulkDeleteStep] = useState<1 | 2 | null>(null);
  const [bulkDeleteConfirmText, setBulkDeleteConfirmText] = useState('');
  const [setStatusModalOpen, setSetStatusModalOpen] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [selectAllLoading, setSelectAllLoading] = useState(false);
  const itemsPerPage = 10;

  const allInDbSelected = total > 0 && selectedIds.size === total;

  const pageUserIds = users.map((u) => u.id);
  const allOnPageSelected = pageUserIds.length > 0 && pageUserIds.every((id) => selectedIds.has(id));
  const someOnPageSelected = pageUserIds.some((id) => selectedIds.has(id));
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = selectAllCheckboxRef.current;
    if (el) el.indeterminate = someOnPageSelected && !allOnPageSelected;
  }, [someOnPageSelected, allOnPageSelected]);

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageUserIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageUserIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const toggleSelect = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleSelectAllInDb = async () => {
    if (total === 0) return;
    if (allInDbSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectAllLoading(true);
    try {
      const ids: string[] = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '100',
          ...(searchTerm && { search: searchTerm }),
        });
        const res = await fetch(`/api/admin/users?${params.toString()}`);
        const data = await res.json();
        const usersList = data.users || [];
        ids.push(...usersList.map((u: User) => u.id));
        hasMore = data.pagination?.hasMore ?? false;
        page++;
      }
      setSelectedIds(new Set(ids));
    } catch (err) {
      console.error('Failed to fetch all user IDs:', err);
    } finally {
      setSelectAllLoading(false);
    }
  };

  useEffect(() => {
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

    // If search is cleared and we're on page 1, reset to initial users
    if (!searchTerm && currentPage === 1) {
      setUsers(initialUsers);
      setTotal(initialTotal);
      return;
    }

    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchUsers();
    }, searchTerm ? 300 : 0);

    return () => clearTimeout(timeoutId);
  }, [currentPage, searchTerm, initialUsers, initialTotal]);

  const totalPages = Math.ceil(total / itemsPerPage);

  const handleReset = () => {
    setSearchTerm('');
    setCurrentPage(1);
    // Reset to initial users
    setUsers(initialUsers);
    setTotal(initialTotal);
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      email: user.email,
      username: user.username,
      displayName: user.displayName || '',
      avatar: user.avatar || '',
      bio: user.bio || '',
      emailVerified: user.emailVerified,
      cleared: user.cleared ?? false,
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

  const handleSingleDeleteClick = (user: User) => {
    setDeleteModalUser(user);
  };

  const handleSingleDeleteConfirm = async () => {
    if (!deleteModalUser) return;
    setBulkActionLoading(true);
    setBulkError(null);
    try {
      const response = await fetch(`/api/admin/users/${deleteModalUser.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) {
        setBulkError(data.error || 'Failed to delete user');
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== deleteModalUser.id));
      setTotal((t) => Math.max(0, t - 1));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteModalUser.id);
        return next;
      });
      setDeleteModalUser(null);
    } catch (e) {
      console.error(e);
      setBulkError('An error occurred');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDeleteClick = () => {
    setBulkDeleteStep(1);
    setBulkDeleteConfirmText('');
    setBulkError(null);
  };

  const handleBulkDeleteStep1Ok = () => {
    setBulkDeleteStep(2);
  };

  const handleBulkDeleteStep2Confirm = async () => {
    if (bulkDeleteConfirmText !== 'Confirm') return;
    const ids = Array.from(selectedIds).filter((id) => id !== currentUserId);
    if (ids.length === 0) {
      setBulkError('No users to delete (current user excluded).');
      return;
    }
    setBulkActionLoading(true);
    setBulkError(null);
    try {
      const response = await fetch('/api/admin/users/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: ids }),
      });
      const data = await response.json();
      if (!response.ok) {
        setBulkError(data.error || 'Bulk delete failed');
        return;
      }
      setUsers((prev) => prev.filter((u) => !ids.includes(u.id)));
      setTotal((t) => Math.max(0, t - (data.deleted ?? 0)));
      setSelectedIds(new Set());
      setBulkDeleteStep(null);
    } catch (e) {
      console.error(e);
      setBulkError('An error occurred');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleSetStatusClick = () => {
    setSetStatusModalOpen(true);
    setBulkError(null);
  };

  const handleSetStatusApply = async (emailVerified: boolean) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkActionLoading(true);
    setBulkError(null);
    try {
      const response = await fetch('/api/admin/users/bulk-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: ids, emailVerified }),
      });
      const data = await response.json();
      if (!response.ok) {
        setBulkError(data.error || 'Failed to update status');
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (selectedIds.has(u.id) ? { ...u, emailVerified } : u))
      );
      setSelectedIds(new Set());
      setSetStatusModalOpen(false);
    } catch (e) {
      console.error(e);
      setBulkError('An error occurred');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleSetClearanceClick = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkActionLoading(true);
    setBulkError(null);
    try {
      const response = await fetch('/api/admin/users/bulk-clearance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: ids }),
      });
      const data = await response.json();
      if (!response.ok) {
        setBulkError(data.error || 'Failed to update clearance');
        return;
      }
      setUsers((prev) =>
        prev.map((u) =>
          selectedIds.has(u.id) ? { ...u, cleared: !u.cleared } : u
        )
      );
      setSelectedIds(new Set());
    } catch (e) {
      console.error(e);
      setBulkError('An error occurred');
    } finally {
      setBulkActionLoading(false);
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
          <div className="input-group">
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
            {(searchTerm || currentPage !== 1) && (
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={handleReset}
                title="Reset filter"
              >
                <i className="bx bx-x"></i> Reset
              </button>
            )}
          </div>
        </div>

        {/* Bulk actions toolbar */}
        <div className="mb-3 d-flex align-items-center justify-content-between gap-2 flex-wrap">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={handleSelectAllInDb}
              disabled={bulkActionLoading || selectAllLoading || total === 0}
              title={allInDbSelected ? 'Deselect all users' : 'Select all users in database'}
            >
              {selectAllLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                  Loading...
                </>
              ) : (
                allInDbSelected ? `Deselect All (${total})` : `Select All (${total})`
              )}
            </button>
            {selectedIds.size > 0 && (
              <>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={toggleSelectAll}
                  disabled={bulkActionLoading}
                >
                  {allOnPageSelected ? 'Deselect all on page' : 'Select all on page'}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={handleBulkDeleteClick}
                  disabled={bulkActionLoading}
                >
                  <i className="bx bx-trash me-1"></i>
                  Delete All
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={handleSetStatusClick}
                  disabled={bulkActionLoading}
                >
                  <i className="bx bx-check-circle me-1"></i>
                  Set Status
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={handleSetClearanceClick}
                  disabled={bulkActionLoading}
                >
                  <i className="bx bx-shield-quarter me-1"></i>
                  Set Clearance
                </button>
              </>
            )}
          </div>
          <span className="text-muted small ms-auto">
            {selectedIds.size} selected
          </span>
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
                    <th style={{ width: '2.5rem' }}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        ref={selectAllCheckboxRef}
                        checked={allOnPageSelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all on this page"
                      />
                    </th>
                    <th>User</th>
                    <th>Email</th>
                    <th>Username</th>
                    <th>Status</th>
                    <th>Cleared</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedIds.has(user.id)}
                          onChange={() => toggleSelect(user.id)}
                          aria-label={`Select ${user.username}`}
                        />
                      </td>
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
                        {user.cleared ? (
                          <span className="badge bg-success">Cleared</span>
                        ) : (
                          <span className="badge bg-warning">Not cleared</span>
                        )}
                      </td>
                      <td>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-primary"
                            onClick={() => handleEditClick(user)}
                            title="Edit user"
                          >
                            <i className="bx bx-edit"></i>
                          </button>
                          {currentUserId !== user.id && (
                            <button
                              className="btn btn-outline-danger"
                              onClick={() => handleSingleDeleteClick(user)}
                              title="Delete user"
                            >
                              <i className="bx bx-trash"></i>
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
                        id="editCleared"
                        checked={editFormData.cleared ?? false}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            cleared: e.target.checked,
                          })
                        }
                        disabled={isSaving}
                      />
                      <label className="form-check-label" htmlFor="editCleared">
                        Cleared
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

      {/* Single delete confirmation modal */}
      {deleteModalUser && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex={-1}
          role="dialog"
          aria-labelledby="deleteUserModalLabel"
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="deleteUserModalLabel">
                  Delete user?
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => { setDeleteModalUser(null); setBulkError(null); }}
                  aria-label="Close"
                  disabled={bulkActionLoading}
                />
              </div>
              <div className="modal-body">
                {bulkError && (
                  <div className="alert alert-danger" role="alert">{bulkError}</div>
                )}
                <p className="mb-0">
                  Delete user <strong>{deleteModalUser.email}</strong>? This cannot be undone.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setDeleteModalUser(null); setBulkError(null); }}
                  disabled={bulkActionLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleSingleDeleteConfirm}
                  disabled={bulkActionLoading}
                >
                  {bulkActionLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete step 1: confirm intent */}
      {bulkDeleteStep === 1 && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex={-1}
          role="dialog"
          aria-labelledby="bulkDeleteStep1Label"
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="bulkDeleteStep1Label">
                  Delete selected users?
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => { setBulkDeleteStep(null); setBulkError(null); }}
                  aria-label="Close"
                  disabled={bulkActionLoading}
                />
              </div>
              <div className="modal-body">
                <p className="mb-0">
                  You are about to permanently delete <strong>{selectedIds.size} user(s)</strong>. This cannot be undone.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setBulkDeleteStep(null)}
                  disabled={bulkActionLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleBulkDeleteStep1Ok}
                  disabled={bulkActionLoading}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete step 2: type Confirm */}
      {bulkDeleteStep === 2 && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex={-1}
          role="dialog"
          aria-labelledby="bulkDeleteStep2Label"
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="bulkDeleteStep2Label">
                  Confirm deletion
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => { setBulkDeleteStep(null); setBulkError(null); setBulkDeleteConfirmText(''); }}
                  aria-label="Close"
                  disabled={bulkActionLoading}
                />
              </div>
              <div className="modal-body">
                {bulkError && (
                  <div className="alert alert-danger" role="alert">{bulkError}</div>
                )}
                <p className="mb-2">
                  Type <strong>Confirm</strong> (case-sensitive) to proceed.
                </p>
                <input
                  type="text"
                  className="form-control"
                  value={bulkDeleteConfirmText}
                  onChange={(e) => setBulkDeleteConfirmText(e.target.value)}
                  placeholder="Confirm"
                  disabled={bulkActionLoading}
                  aria-label="Type Confirm to proceed"
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setBulkDeleteStep(null); setBulkError(null); setBulkDeleteConfirmText(''); }}
                  disabled={bulkActionLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleBulkDeleteStep2Confirm}
                  disabled={bulkActionLoading || bulkDeleteConfirmText !== 'Confirm'}
                >
                  {bulkActionLoading ? 'Deleting...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Set Status modal */}
      {setStatusModalOpen && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex={-1}
          role="dialog"
          aria-labelledby="setStatusModalLabel"
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="setStatusModalLabel">
                  Set status for selected users
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => { setSetStatusModalOpen(false); setBulkError(null); }}
                  aria-label="Close"
                  disabled={bulkActionLoading}
                />
              </div>
              <div className="modal-body">
                {bulkError && (
                  <div className="alert alert-danger" role="alert">{bulkError}</div>
                )}
                <p className="mb-3">
                  Set status for <strong>{selectedIds.size} user(s)</strong>:
                </p>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={() => handleSetStatusApply(true)}
                    disabled={bulkActionLoading}
                  >
                    Verified
                  </button>
                  <button
                    type="button"
                    className="btn btn-warning"
                    onClick={() => handleSetStatusApply(false)}
                    disabled={bulkActionLoading}
                  >
                    Unverified
                  </button>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setSetStatusModalOpen(false); setBulkError(null); }}
                  disabled={bulkActionLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
