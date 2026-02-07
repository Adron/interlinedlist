'use client';

import { useState, useEffect } from 'react';
import { Avatar } from '../Avatar';
import AvatarPlaceholder from '../AvatarPlaceholder';
import { OrganizationRole } from '@/lib/types';

interface Member {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  role: OrganizationRole;
  joinedAt: string;
  active?: boolean;
}

interface OrganizationMembersDatagridProps {
  organizationId: string;
  currentUserRole?: OrganizationRole | null;
  onRefresh?: () => void;
}

export default function OrganizationMembersDatagrid({
  organizationId,
  currentUserRole,
  onRefresh,
}: OrganizationMembersDatagridProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [updatingMembers, setUpdatingMembers] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<OrganizationRole | null>(null);
  const [editActive, setEditActive] = useState<boolean | null>(null);

  const canEdit = currentUserRole === 'owner' || currentUserRole === 'admin';

  useEffect(() => {
    fetchMembers();
  }, [organizationId]);

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/members?limit=1000&offset=0`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch members');
      }

      setMembers(data.members || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (member: Member) => {
    if (editingMemberId === member.id) {
      // Cancel editing
      setEditingMemberId(null);
      setEditRole(null);
      setEditActive(null);
    } else {
      // Start editing this member
      setEditingMemberId(member.id);
      setEditRole(member.role);
      setEditActive(member.active !== undefined ? member.active : true);
    }
  };

  const handleSave = async (memberId: string) => {
    if (!editRole) return;

    setUpdatingMembers((prev) => new Set(prev).add(memberId));
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: editRole,
          active: editActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update member');
      }

      setSuccessMessage('Member updated successfully');
      setEditingMemberId(null);
      setEditRole(null);
      setEditActive(null);
      
      // Refresh members list
      fetchMembers();
      if (onRefresh) {
        onRefresh();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update member');
    } finally {
      setUpdatingMembers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(memberId);
        return newSet;
      });
    }
  };

  const handleRemoveMember = async (memberId: string, username: string) => {
    if (!confirm(`Are you sure you want to remove ${username} from this organization?`)) {
      return;
    }

    setUpdatingMembers((prev) => new Set(prev).add(memberId));
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove member');
      }

      setSuccessMessage('Member removed successfully');
      setEditingMemberId(null);
      
      // Refresh members list
      fetchMembers();
      if (onRefresh) {
        onRefresh();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to remove member');
    } finally {
      setUpdatingMembers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(memberId);
        return newSet;
      });
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

  const getRoleBadgeClass = (role: OrganizationRole) => {
    switch (role) {
      case 'owner':
        return 'bg-danger';
      case 'admin':
        return 'bg-primary';
      default:
        return 'bg-secondary';
    }
  };

  if (loading && members.length === 0) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error && members.length === 0) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div className="mt-5">
      <h3 className="mb-3">Organization Members</h3>

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

      {members.length === 0 ? (
        <div className="alert alert-info" role="alert">
          No members found.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Avatar</th>
                <th>Username</th>
                <th>Display Name</th>
                <th>Join Date</th>
                <th>Role</th>
                <th style={{ width: '150px' }}>Status</th>
                {canEdit && <th style={{ width: '120px' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const isEditing = editingMemberId === member.id;
                const isUpdating = updatingMembers.has(member.id);
                const isActive = member.active !== undefined ? member.active : true;

                return (
                  <tr key={member.id} className={!isActive ? 'table-secondary' : ''}>
                    <td>
                      {member.avatar ? (
                        <Avatar
                          src={member.avatar}
                          alt={member.displayName || member.username}
                          size={40}
                        />
                      ) : (
                        <AvatarPlaceholder
                          name={member.displayName || member.username}
                          size={40}
                        />
                      )}
                    </td>
                    <td>{member.username}</td>
                    <td>{member.displayName || <span className="text-muted">—</span>}</td>
                    <td>{formatDate(member.joinedAt)}</td>
                    <td>
                      {isEditing ? (
                        <select
                          className="form-select form-select-sm"
                          value={editRole || member.role}
                          onChange={(e) => setEditRole(e.target.value as OrganizationRole)}
                          disabled={isUpdating}
                          style={{ width: 'auto', display: 'inline-block' }}
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                          <option value="owner">Owner</option>
                        </select>
                      ) : (
                        <span className={`badge ${getRoleBadgeClass(member.role)}`}>
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <div className="form-check form-switch">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={editActive !== null ? editActive : isActive}
                            onChange={(e) => setEditActive(e.target.checked)}
                            disabled={isUpdating}
                          />
                          <label className="form-check-label">
                            {editActive !== null ? (editActive ? 'Active' : 'Inactive') : (isActive ? 'Active' : 'Inactive')}
                          </label>
                        </div>
                      ) : (
                        <span className={`badge ${isActive ? 'bg-success' : 'bg-warning'}`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    {canEdit && (
                      <td>
                        {isEditing ? (
                          <div className="d-flex gap-1">
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => handleSave(member.id)}
                              disabled={isUpdating || !editRole}
                            >
                              {isUpdating ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleEditClick(member)}
                              disabled={isUpdating}
                            >
                              Cancel
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleRemoveMember(member.id, member.displayName || member.username)}
                              disabled={isUpdating}
                              title="Remove Member"
                            >
                              <i className="bx bx-trash"></i>
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleEditClick(member)}
                            disabled={isUpdating || editingMemberId !== null}
                            title="Edit Member"
                          >
                            <i className="bx bx-edit"></i>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
