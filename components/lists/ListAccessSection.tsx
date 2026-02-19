'use client';

import { useState, useEffect } from 'react';
import { Avatar } from '../Avatar';
import AvatarPlaceholder from '../AvatarPlaceholder';

const ROLES = [
  { value: 'watcher', label: 'Watcher', description: 'Can follow this list. Shown when viewing your public profile.' },
  { value: 'collaborator', label: 'Collaborator', description: 'Can add, edit, and delete rows in this list.' },
  { value: 'manager', label: 'Manager', description: 'Can do everything a Collaborator can, plus edit the list schema.' },
] as const;

type Role = (typeof ROLES)[number]['value'];

interface AccessEntry {
  id: string;
  userId: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  };
}

interface ListAccessSectionProps {
  listId: string;
  isPublic: boolean;
}

export default function ListAccessSection({ listId, isPublic }: ListAccessSectionProps) {
  const [entries, setEntries] = useState<AccessEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    username: string;
    displayName: string | null;
    email: string;
    avatar: string | null;
  }>>([]);
  const [searching, setSearching] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [addRole, setAddRole] = useState<Role>('watcher');
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/lists/${listId}/watchers`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch list access');
      }
      const data = await res.json();
      setEntries(data.watchers || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load list access');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [listId]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    setSearchResults([]);
    try {
      const excludeUserIds = entries.map((e) => e.userId).join(',');
      const res = await fetch(
        `/api/lists/${listId}/watchers/users?search=${encodeURIComponent(searchQuery)}&limit=20&excludeWatchers=${excludeUserIds}`
      );
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setSearchResults(data.users || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddUser = async (userId: string) => {
    setAddingUserId(userId);
    setMessage(null);
    try {
      const res = await fetch(`/api/lists/${listId}/watchers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: addRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add user');
      }
      setMessage({ type: 'success', text: `User added as ${addRole}` });
      setSearchResults((prev) => prev.filter((u) => u.id !== userId));
      fetchEntries();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to add user' });
    } finally {
      setAddingUserId(null);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Remove this user from list access?')) return;
    setRemovingUserId(userId);
    setMessage(null);
    try {
      const res = await fetch(`/api/lists/${listId}/watchers/${userId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove user');
      }
      setMessage({ type: 'success', text: 'User removed from list access' });
      fetchEntries();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to remove user' });
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: Role) => {
    setUpdatingUserId(userId);
    setMessage(null);
    try {
      const res = await fetch(`/api/lists/${listId}/watchers/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update role');
      }
      setMessage({ type: 'success', text: 'Role updated' });
      fetchEntries();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update role' });
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (!isPublic) {
    return (
      <div className="card mt-4">
        <div className="card-body">
          <h6 className="card-title">List access & permissions</h6>
          <p className="text-muted small mb-0">
            Make the list public to manage who can access it and their permission level.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card mt-4">
      <div className="card-body">
        <h6 className="card-title">List access & permissions</h6>
        <p className="text-muted small mb-3">
          Manage who can access this list and their permission level.
        </p>

        {message && (
          <div
            className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`}
            role="alert"
          >
            {message.text}
            <button
              type="button"
              className="btn-close"
              onClick={() => setMessage(null)}
              aria-label="Close"
            />
          </div>
        )}

        {/* Search */}
        <div className="input-group mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Search by username, display name, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={handleSearch}
            disabled={searching}
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Role for new adds */}
        <div className="mb-3">
          <label className="form-label small">Role for new users</label>
          <select
            className="form-select form-select-sm"
            value={addRole}
            onChange={(e) => setAddRole(e.target.value as Role)}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label} - {r.description}
              </option>
            ))}
          </select>
        </div>

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="mb-3">
            <small className="text-muted d-block mb-2">Search results</small>
            <ul className="list-group">
              {searchResults.map((u) => (
                <li
                  key={u.id}
                  className="list-group-item d-flex align-items-center justify-content-between"
                >
                  <div className="d-flex align-items-center gap-2">
                    {u.avatar ? (
                      <Avatar src={u.avatar} alt={u.username} size={32} />
                    ) : (
                      <AvatarPlaceholder name={u.displayName || u.username} size={32} />
                    )}
                    <div>
                      <span className="fw-medium">{u.displayName || u.username}</span>
                      {u.displayName && (
                        <span className="text-muted small ms-1">@{u.username}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => handleAddUser(u.id)}
                    disabled={addingUserId === u.id}
                  >
                    {addingUserId === u.id ? 'Adding...' : `Add as ${addRole}`}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Current users with access */}
        <div>
          <small className="text-muted d-block mb-2">
            Users with access ({entries.length})
          </small>
          {loading ? (
            <div className="text-muted small">Loading...</div>
          ) : error ? (
            <div className="alert alert-danger py-2">{error}</div>
          ) : entries.length === 0 ? (
            <p className="text-muted small mb-0">No users with access yet. Search and add users above.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          {e.user.avatar ? (
                            <Avatar src={e.user.avatar} alt={e.user.username} size={28} />
                          ) : (
                            <AvatarPlaceholder name={e.user.displayName || e.user.username} size={28} />
                          )}
                          <div>
                            <span className="fw-medium">{e.user.displayName || e.user.username}</span>
                            {e.user.displayName && (
                              <span className="text-muted small ms-1">@{e.user.username}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <select
                          className="form-select form-select-sm"
                          style={{ width: 'auto', minWidth: '120px' }}
                          value={e.role || 'watcher'}
                          onChange={(ev) => handleRoleChange(e.userId, ev.target.value as Role)}
                          disabled={updatingUserId === e.userId}
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleRemoveUser(e.userId)}
                          disabled={removingUserId === e.userId}
                        >
                          {removingUserId === e.userId ? '...' : 'Remove'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
