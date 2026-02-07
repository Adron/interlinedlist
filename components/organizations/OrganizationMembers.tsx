'use client';

import { useState, useEffect } from 'react';
import { Avatar } from '../Avatar';
import { OrganizationRole } from '@/lib/types';

interface Member {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  role: OrganizationRole;
  joinedAt: string;
}

interface OrganizationMembersProps {
  organizationId: string;
  currentUserRole?: OrganizationRole | null;
  canManage?: boolean;
}

export default function OrganizationMembers({
  organizationId,
  currentUserRole,
  canManage = false,
}: OrganizationMembersProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<OrganizationRole | ''>('');

  useEffect(() => {
    fetchMembers();
  }, [organizationId, roleFilter]);

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/organizations/${organizationId}/members?limit=100&offset=0${roleFilter ? `&role=${roleFilter}` : ''}`;
      const response = await fetch(url);
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

  const handleRoleChange = async (userId: string, newRole: OrganizationRole) => {
    if (!confirm(`Change this member's role to ${newRole}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/organizations/${organizationId}/members/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update role');
      }

      // Refresh members list
      fetchMembers();
    } catch (err: any) {
      alert(err.message || 'Failed to update role');
    }
  };

  const handleRemoveMember = async (userId: string, username: string) => {
    if (!confirm(`Remove ${username} from this organization?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/organizations/${organizationId}/members/${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove member');
      }

      // Refresh members list
      fetchMembers();
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  const canModify = canManage && (currentUserRole === 'owner' || currentUserRole === 'admin');

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Members ({members.length})</h5>
        <select
          className="form-select form-select-sm"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as OrganizationRole | '')}
          style={{ width: 'auto' }}
        >
          <option value="">All Roles</option>
          <option value="owner">Owners</option>
          <option value="admin">Admins</option>
          <option value="member">Members</option>
        </select>
      </div>

      {members.length === 0 ? (
        <div className="alert alert-info" role="alert">
          No members found.
        </div>
      ) : (
        <div className="list-group">
          {members.map((member) => (
            <div
              key={member.id}
              className="list-group-item d-flex align-items-center justify-content-between"
            >
              <div className="d-flex align-items-center">
                <Avatar
                  user={{
                    id: member.id,
                    username: member.username,
                    displayName: member.displayName,
                    avatar: member.avatar,
                  }}
                  size={40}
                />
                <div className="ms-3">
                  <div className="fw-bold">
                    {member.displayName || member.username}
                  </div>
                  <small className="text-muted">@{member.username}</small>
                </div>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span className={`badge ${
                  member.role === 'owner' ? 'bg-danger' :
                  member.role === 'admin' ? 'bg-primary' :
                  'bg-secondary'
                }`}>
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </span>
                {canModify && (
                  <div className="dropdown">
                    <button
                      className="btn btn-sm btn-outline-secondary dropdown-toggle"
                      type="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      <i className="bx bx-dots-vertical-rounded"></i>
                    </button>
                    <ul className="dropdown-menu">
                      <li>
                        <h6 className="dropdown-header">Change Role</h6>
                      </li>
                      {member.role !== 'owner' && (
                        <li>
                          <button
                            className="dropdown-item"
                            onClick={() => handleRoleChange(member.id, 'owner')}
                          >
                            Make Owner
                          </button>
                        </li>
                      )}
                      {member.role !== 'admin' && (
                        <li>
                          <button
                            className="dropdown-item"
                            onClick={() => handleRoleChange(member.id, 'admin')}
                          >
                            Make Admin
                          </button>
                        </li>
                      )}
                      {member.role !== 'member' && (
                        <li>
                          <button
                            className="dropdown-item"
                            onClick={() => handleRoleChange(member.id, 'member')}
                          >
                            Make Member
                          </button>
                        </li>
                      )}
                      <li><hr className="dropdown-divider" /></li>
                      <li>
                        <button
                          className="dropdown-item text-danger"
                          onClick={() => handleRemoveMember(member.id, member.displayName || member.username)}
                        >
                          Remove Member
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
