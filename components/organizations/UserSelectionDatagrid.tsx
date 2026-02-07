'use client';

import { useState, useEffect, useMemo } from 'react';
import { User } from '@/lib/types';
import { Avatar } from '../Avatar';
import AvatarPlaceholder from '../AvatarPlaceholder';

interface UserSelectionDatagridProps {
  organizationId: string;
  existingMemberIds?: string[];
  onMemberAdded?: () => void;
}

interface UserWithDate extends Omit<User, 'createdAt'> {
  createdAt: string;
}

export default function UserSelectionDatagrid({
  organizationId,
  existingMemberIds = [],
  onMemberAdded,
}: UserSelectionDatagridProps) {
  const [allUsers, setAllUsers] = useState<UserWithDate[]>([]); // Top 1000 users
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [addingUsers, setAddingUsers] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTotal, setSearchTotal] = useState<number | null>(null);
  const [newlyAddedMemberIds, setNewlyAddedMemberIds] = useState<Set<string>>(new Set());

  const usersPerPage = 5;

  // Combine existing member IDs with newly added ones
  const allExcludedMemberIds = useMemo(() => {
    return new Set([...existingMemberIds, ...newlyAddedMemberIds]);
  }, [existingMemberIds, newlyAddedMemberIds]);

  // Filter out existing members from all users
  const filteredAllUsers = useMemo(() => {
    if (allExcludedMemberIds.size === 0) return allUsers;
    return allUsers.filter((u) => !allExcludedMemberIds.has(u.id));
  }, [allUsers, allExcludedMemberIds]);

  // Client-side filtered users (from top 1000)
  const clientFilteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return filteredAllUsers;
    const query = searchQuery.toLowerCase();
    return filteredAllUsers.filter(
      (u) =>
        u.username.toLowerCase().includes(query) ||
        (u.displayName && u.displayName.toLowerCase().includes(query)) ||
        u.email.toLowerCase().includes(query)
    );
  }, [filteredAllUsers, searchQuery]);

  // Server-side search results
  const [serverSearchUsers, setServerSearchUsers] = useState<UserWithDate[]>([]);

  // Determine which users to display
  const displayUsers = isSearching ? serverSearchUsers : clientFilteredUsers;
  const totalUsers = isSearching ? (searchTotal ?? 0) : filteredAllUsers.length;

  // Pagination
  const totalPages = Math.ceil(totalUsers / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const paginatedUsers = displayUsers.slice(startIndex, endIndex);

  // Initial load: Fetch top 1000 users
  useEffect(() => {
    fetchInitialUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, existingMemberIds.join(',')]);

  const fetchInitialUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const excludeMembers = Array.from(allExcludedMemberIds).join(',');
      const response = await fetch(
        `/api/organizations/${organizationId}/users?limit=1000&offset=0${excludeMembers ? `&excludeMembers=${excludeMembers}` : ''}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users');
      }

      setAllUsers(data.users || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Server-side search
  const performServerSearch = async () => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      setServerSearchUsers([]);
      setSearchTotal(null);
      setCurrentPage(1);
      return;
    }

    setIsSearching(true);
    setLoading(true);
    setError(null);
    try {
      const excludeMembers = Array.from(allExcludedMemberIds).join(',');
      const response = await fetch(
        `/api/organizations/${organizationId}/users?limit=1000&offset=0&search=${encodeURIComponent(searchQuery)}${excludeMembers ? `&excludeMembers=${excludeMembers}` : ''}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search users');
      }

      setServerSearchUsers(data.users || []);
      setSearchTotal(data.total || 0);
      setCurrentPage(1);
    } catch (err: any) {
      setError(err.message || 'Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performServerSearch();
    }
  };

  const handleSearchButtonClick = () => {
    performServerSearch();
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(paginatedUsers.map((u) => u.id));
      setSelectedUsers(allIds);
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleAddUser = async (userId: string) => {
    if (addingUsers.has(userId)) return;

    setAddingUsers((prev) => new Set(prev).add(userId));
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/organizations/${organizationId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          role: 'member',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add user');
      }

      // Add to excluded members and remove from display
      setNewlyAddedMemberIds((prev) => new Set(prev).add(userId));
      setAllUsers((prev) => prev.filter((u) => u.id !== userId));
      setServerSearchUsers((prev) => prev.filter((u) => u.id !== userId));
      setSelectedUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });

      const user = displayUsers.find((u) => u.id === userId);
      setSuccessMessage(
        `Successfully added ${user?.displayName || user?.username || 'user'} to the organization.`
      );
      
      // Notify parent component to refresh members list
      if (onMemberAdded) {
        onMemberAdded();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add user');
    } finally {
      setAddingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleBulkAdd = async () => {
    if (selectedUsers.size === 0) return;

    const userIds = Array.from(selectedUsers);
    setAddingUsers(new Set(userIds));
    setSuccessMessage(null);
    setErrorMessage(null);

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const userId of userIds) {
      try {
        const response = await fetch(`/api/organizations/${organizationId}/members`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            role: 'member',
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to add user');
        }

        successCount++;
        // Add to excluded members and remove from display
        setNewlyAddedMemberIds((prev) => new Set(prev).add(userId));
        setAllUsers((prev) => prev.filter((u) => u.id !== userId));
        setServerSearchUsers((prev) => prev.filter((u) => u.id !== userId));
      } catch (err: any) {
        failCount++;
        errors.push(err.message || 'Failed to add user');
      }
    }

    setSelectedUsers(new Set());
    setAddingUsers(new Set());

    if (successCount > 0) {
      setSuccessMessage(`Successfully added ${successCount} user(s) to the organization.`);
      // Notify parent component to refresh members list
      if (onMemberAdded) {
        onMemberAdded();
      }
    }
    if (failCount > 0) {
      setErrorMessage(`Failed to add ${failCount} user(s). ${errors[0]}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const allSelected = paginatedUsers.length > 0 && paginatedUsers.every((u) => selectedUsers.has(u.id));
  const someSelected = paginatedUsers.some((u) => selectedUsers.has(u.id));

  return (
    <div className="mt-5">
      <h3 className="mb-3">Add Members to Organization</h3>

      {/* Search Box */}
      <div className="mb-3">
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            placeholder="Search users by username, display name, or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearching(false);
              setServerSearchUsers([]);
              setSearchTotal(null);
              setCurrentPage(1);
            }}
            onKeyDown={handleSearchKeyDown}
            disabled={loading}
          />
          <button
            className="btn btn-outline-secondary"
            type="button"
            onClick={handleSearchButtonClick}
            disabled={loading || !searchQuery.trim()}
          >
            Search
          </button>
        </div>
        <small className="text-muted">
          {isSearching
            ? `Searching entire database... (${totalUsers} result${totalUsers !== 1 ? 's' : ''})`
            : searchQuery.trim()
            ? `Filtering ${filteredAllUsers.length} loaded users...`
            : `Showing top ${filteredAllUsers.length} users`}
        </small>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {successMessage}
          <button
            type="button"
            className="btn-close"
            onClick={() => setSuccessMessage(null)}
            aria-label="Close"
          ></button>
        </div>
      )}
      {errorMessage && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {errorMessage}
          <button
            type="button"
            className="btn-close"
            onClick={() => setErrorMessage(null)}
            aria-label="Close"
          ></button>
        </div>
      )}

      {/* Bulk Add Button */}
      {selectedUsers.size > 0 && (
        <div className="mb-3">
          <button
            className="btn btn-primary"
            onClick={handleBulkAdd}
            disabled={addingUsers.size > 0}
          >
            {addingUsers.size > 0 ? 'Adding...' : `Add Selected (${selectedUsers.size})`}
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && allUsers.length === 0 && (
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Data Grid */}
      {!loading && !error && (
        <>
          {paginatedUsers.length === 0 ? (
            <div className="alert alert-info" role="alert">
              {isSearching
                ? 'No users found matching your search.'
                : searchQuery.trim()
                ? 'No users found matching your filter.'
                : 'No users available to add.'}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={allSelected}
                        ref={(input) => {
                          if (input) {
                            input.indeterminate = someSelected && !allSelected;
                          }
                        }}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                    <th style={{ width: '60px' }}>Avatar</th>
                    <th>Username</th>
                    <th>Display Name</th>
                    <th>Email</th>
                    <th>Created Date</th>
                    <th style={{ width: '100px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((user) => {
                    const isAdding = addingUsers.has(user.id);
                    const isSelected = selectedUsers.has(user.id);
                    return (
                      <tr key={user.id}>
                        <td>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={isSelected}
                            onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                            disabled={isAdding}
                          />
                        </td>
                        <td>
                          {user.avatar ? (
                            <Avatar
                              src={user.avatar}
                              alt={user.displayName || user.username}
                              size={40}
                            />
                          ) : (
                            <AvatarPlaceholder
                              name={user.displayName || user.username}
                              size={40}
                            />
                          )}
                        </td>
                        <td>{user.username}</td>
                        <td>{user.displayName || <span className="text-muted">—</span>}</td>
                        <td>{user.email}</td>
                        <td>{formatDate(user.createdAt)}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleAddUser(user.id)}
                            disabled={isAdding}
                          >
                            {isAdding ? 'Adding...' : 'Add'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div className="text-muted small">
                Showing {startIndex + 1} to {Math.min(endIndex, totalUsers)} of {totalUsers} users
              </div>
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                  </li>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
                  ))}
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
            </div>
          )}
        </>
      )}
    </div>
  );
}
