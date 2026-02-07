'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OrganizationCard from './OrganizationCard';
import { Organization, OrganizationRole } from '@/lib/types';

interface UserOrganizationsProps {
  userId?: string;
}

export default function UserOrganizations({ userId }: UserOrganizationsProps) {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<(Organization & { role: OrganizationRole; memberCount?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<OrganizationRole | ''>('');

  useEffect(() => {
    fetchUserOrganizations();
  }, [userId, roleFilter]);

  const fetchUserOrganizations = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = userId
        ? `/api/organizations?userId=${userId}${roleFilter ? `&role=${roleFilter}` : ''}`
        : `/api/user/organizations${roleFilter ? `?role=${roleFilter}` : ''}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch organizations');
      }

      setOrganizations(data.organizations || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async (organizationId: string) => {
    if (!confirm('Are you sure you want to leave this organization?')) {
      return;
    }

    try {
      // Get current user ID from session
      const userResponse = await fetch('/api/user');
      const userData = await userResponse.json();
      const currentUserId = userData.user?.id;

      if (!currentUserId) {
        throw new Error('User not found');
      }

      const targetUserId = userId || currentUserId;

      const response = await fetch(`/api/organizations/${organizationId}/members/${targetUserId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to leave organization');
      }

      // Refresh organizations list
      fetchUserOrganizations();
    } catch (err: any) {
      alert(err.message || 'Failed to leave organization');
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

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">My Organizations</h4>
        <div className="d-flex gap-2">
          <select
            className="form-select form-select-sm"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as OrganizationRole | '')}
            style={{ width: 'auto' }}
          >
            <option value="">All Roles</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
          </select>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => router.push('/organizations/new')}
          >
            <i className="bx bx-plus me-1"></i>
            Create
          </button>
        </div>
      </div>

      {organizations.length === 0 ? (
        <div className="alert alert-info" role="alert">
          You are not a member of any organizations yet.
          <div className="mt-2">
            <button
              className="btn btn-sm btn-primary"
              onClick={() => router.push('/organizations')}
            >
              Browse Organizations
            </button>
          </div>
        </div>
      ) : (
        <div>
          {organizations.map((org) => (
            <OrganizationCard
              key={org.id}
              organization={org}
              onLeave={handleLeave}
              isMember={true}
              showEditButton={org.role === 'owner'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
