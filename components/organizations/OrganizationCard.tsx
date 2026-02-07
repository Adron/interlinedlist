'use client';

import Link from 'next/link';
import { Avatar } from '../Avatar';
import { Organization, OrganizationRole } from '@/lib/types';

interface OrganizationCardProps {
  organization: Organization & { role?: OrganizationRole; memberCount?: number };
  showActions?: boolean;
  showEditButton?: boolean;
  onJoin?: (organizationId: string) => void;
  onLeave?: (organizationId: string) => void;
  isMember?: boolean;
}

export default function OrganizationCard({
  organization,
  showActions = true,
  showEditButton = false,
  onJoin,
  onLeave,
  isMember,
}: OrganizationCardProps) {
  const isOwner = organization.role === 'owner';
  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="d-flex align-items-start">
          <div className="me-3">
            {organization.avatar ? (
              <img
                src={organization.avatar}
                alt={organization.name}
                className="rounded"
                style={{ width: '48px', height: '48px', objectFit: 'cover' }}
              />
            ) : (
              <div
                className="bg-secondary rounded d-flex align-items-center justify-content-center"
                style={{ width: '48px', height: '48px' }}
              >
                <i className="bx bx-group text-white" style={{ fontSize: '24px' }}></i>
              </div>
            )}
          </div>
          <div className="flex-grow-1">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h5 className="mb-0">
                <Link href={`/organizations/${organization.slug}`} className="text-decoration-none">
                  {organization.name}
                </Link>
              </h5>
              <div className="d-flex align-items-center gap-2">
                {organization.isSystem && (
                  <span className="badge bg-info">System</span>
                )}
                {organization.isPublic ? (
                  <span className="badge bg-success">Public</span>
                ) : (
                  <span className="badge bg-warning">Private</span>
                )}
                {organization.role && (
                  <span className={`badge ${
                    organization.role === 'owner' ? 'bg-danger' :
                    organization.role === 'admin' ? 'bg-primary' :
                    'bg-secondary'
                  }`}>
                    {organization.role.charAt(0).toUpperCase() + organization.role.slice(1)}
                  </span>
                )}
              </div>
            </div>
            {organization.description && (
              <p className="text-muted small mb-2">{organization.description}</p>
            )}
            <div className="d-flex align-items-center justify-content-between">
              <small className="text-muted">
                {organization.memberCount !== undefined
                  ? `${organization.memberCount} member${organization.memberCount !== 1 ? 's' : ''}`
                  : 'Members'}
              </small>
              {showActions && (
                <div className="d-flex gap-2">
                  {isOwner && showEditButton && (
                    <Link
                      href={`/organizations/${organization.slug}/edit`}
                      className="btn btn-sm btn-outline-secondary"
                      title="Edit Organization"
                    >
                      <i className="bx bx-edit"></i>
                    </Link>
                  )}
                  {isMember ? (
                    onLeave && (
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => onLeave(organization.id)}
                      >
                        Leave
                      </button>
                    )
                  ) : (
                    organization.isPublic &&
                    onJoin && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => onJoin(organization.id)}
                      >
                        Join
                      </button>
                    )
                  )}
                  <Link
                    href={`/organizations/${organization.slug}`}
                    className="btn btn-sm btn-outline-primary"
                  >
                    View
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
