'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OrganizationCard from './OrganizationCard';
import { Organization, OrganizationRole } from '@/lib/types';

interface OrganizationListProps {
  initialOrganizations?: (Organization & { role?: OrganizationRole; memberCount?: number })[];
  showCreateButton?: boolean;
  filterPublic?: boolean;
}

export default function OrganizationList({
  initialOrganizations = [],
  showCreateButton = false,
  filterPublic = false,
}: OrganizationListProps) {
  const router = useRouter();
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicOnly, setPublicOnly] = useState(filterPublic);
  // Initialize userLoggedIn from showCreateButton prop (which comes from server-side user check)
  // This ensures button is visible immediately if user is logged in
  const [userLoggedIn, setUserLoggedIn] = useState(showCreateButton);

  // Ensure userLoggedIn stays in sync with showCreateButton prop
  useEffect(() => {
    if (showCreateButton) {
      setUserLoggedIn(true);
    }
  }, [showCreateButton]);

  // Fetch organizations when filter changes (but not on initial mount if we have initial data)
  useEffect(() => {
    // Only fetch if filter changed from initial value, or if we don't have initial organizations
    if (initialOrganizations.length === 0 || publicOnly !== filterPublic) {
      fetchOrganizations();
    }
  }, [publicOnly]);

  const fetchOrganizations = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/organizations?public=${publicOnly}&limit=50&offset=0`;
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

  const handleJoin = async (organizationId: string) => {
    try {
      const response = await fetch('/api/user/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organizationId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join organization');
      }

      // Refresh organizations list
      fetchOrganizations();
    } catch (err: any) {
      alert(err.message || 'Failed to join organization');
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
      const userId = userData.user?.id;

      if (!userId) {
        throw new Error('User not found');
      }

      const response = await fetch(`/api/organizations/${organizationId}/members/${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to leave organization');
      }

      // Refresh organizations list
      fetchOrganizations();
    } catch (err: any) {
      alert(err.message || 'Failed to leave organization');
    }
  };

  if (loading && organizations.length === 0) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error && organizations.length === 0) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2">
          <h4 className="mb-0">Organizations</h4>
          {!filterPublic && (
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="publicOnly"
                checked={publicOnly}
                onChange={(e) => setPublicOnly(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="publicOnly">
                Public only
              </label>
            </div>
          )}
        </div>
        {/* Always show button if user is logged in - check both prop and state */}
        {(showCreateButton || userLoggedIn) && (
          <button
            className="btn btn-primary"
            onClick={() => router.push('/organizations/new')}
            type="button"
          >
            <i className="bx bx-plus me-1"></i>
            Create Organization
          </button>
        )}
      </div>

      {organizations.length === 0 ? (
        <div className="alert alert-info" role="alert">
          No organizations found.
        </div>
      ) : (
        <div>
          {organizations.map((org) => (
            <OrganizationCard
              key={org.id}
              organization={org}
              onJoin={handleJoin}
              onLeave={handleLeave}
              isMember={!!org.role}
              showEditButton={org.role === 'owner'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
