'use client';

import { useState } from 'react';
import type { OrganizationRole } from '@/lib/types';

interface OrgMember {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  role: OrganizationRole;
}

interface PageAssignment {
  id: string;
  userId: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  };
}

interface OrgPage {
  id: string;
  linkedInPageId: string;
  pageName: string;
  pageLogoUrl: string | null;
  lastSyncedAt: Date | string | null;
  assignments: PageAssignment[];
}

interface OrgCredential {
  id: string;
  providerUsername: string | null;
  connectedAt: Date | string;
  expiresAt: Date | string | null;
  disconnectedAt: Date | string | null;
  pages: OrgPage[];
}

interface Props {
  organization: { id: string; name: string; slug: string };
  credential: OrgCredential | null;
  members: OrgMember[];
  userRole: OrganizationRole;
  canManage: boolean;
}

function isExpiringSoon(expiresAt: Date | string | null): boolean {
  if (!expiresAt) return false;
  const expiry = new Date(expiresAt);
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return expiry.getTime() - Date.now() < sevenDays;
}

function isExpired(expiresAt: Date | string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) <= new Date();
}

export default function OrgLinkedInSettings({
  organization,
  credential: initialCredential,
  members,
  userRole,
  canManage,
}: Props) {
  const [credential, setCredential] = useState<OrgCredential | null>(initialCredential);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isActive = credential && !credential.disconnectedAt;

  async function handleSyncPages() {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizations/${organization.id}/linkedin/sync-pages`, {
        method: 'POST',
      });
      const data = await res.json() as { pages?: OrgPage[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Sync failed');
      if (credential && data.pages) {
        setCredential({ ...credential, pages: data.pages.map((p) => ({ ...p, assignments: [] })) });
      }
      setSuccess('Pages synced successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect the org LinkedIn account? Members will fall back to personal LinkedIn.')) return;
    setDisconnecting(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizations/${organization.id}/linkedin/credential`, {
        method: 'DELETE',
      });
      const data = await res.json() as { disconnected?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Disconnect failed');
      if (credential) {
        setCredential({ ...credential, disconnectedAt: new Date().toISOString() });
      }
      setSuccess('LinkedIn disconnected');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed');
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleAssign(userId: string, pageId: string | null) {
    setAssigningUserId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/organizations/${organization.id}/linkedin/assignments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, pageId }),
      });
      const data = await res.json() as { assignment?: PageAssignment; assigned?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Assignment failed');

      // Refresh status
      const statusRes = await fetch(`/api/organizations/${organization.id}/linkedin/status`);
      const statusData = await statusRes.json() as { credential?: OrgCredential };
      if (statusData.credential) setCredential(statusData.credential);
      setSuccess('Assignment updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setAssigningUserId(null);
    }
  }

  function getMemberAssignment(memberId: string): string {
    if (!credential) return '';
    for (const page of credential.pages) {
      const match = page.assignments.find((a) => a.userId === memberId);
      if (match) return page.id;
    }
    return '';
  }

  return (
    <div>
      {error && (
        <div className="alert alert-danger mb-3" role="alert">
          {error}
          <button className="btn-close float-end" onClick={() => setError(null)} />
        </div>
      )}
      {success && (
        <div className="alert alert-success mb-3" role="alert">
          {success}
          <button className="btn-close float-end" onClick={() => setSuccess(null)} />
        </div>
      )}

      {/* Credential status card */}
      <div className="card mb-4">
        <div className="card-body">
          <h5 className="card-title">LinkedIn Account</h5>

          {!credential || !isActive ? (
            <div>
              <p className="text-muted mb-3">
                No LinkedIn account connected. Connect an account to let members cross-post to its Company Pages.
              </p>
              {canManage && (
                <a
                  href={`/api/auth/linkedin/org-authorize?organizationId=${organization.id}`}
                  className="btn btn-primary"
                >
                  Connect LinkedIn
                </a>
              )}
            </div>
          ) : (
            <div>
              {isExpired(credential.expiresAt) && (
                <div className="alert alert-danger mb-3">
                  LinkedIn token expired. Reconnect to resume org posting.
                </div>
              )}
              {!isExpired(credential.expiresAt) && isExpiringSoon(credential.expiresAt) && (
                <div className="alert alert-warning mb-3">
                  LinkedIn token expires soon. Reconnect to avoid interruption.
                </div>
              )}

              <p className="mb-1">
                <strong>Connected as:</strong>{' '}
                {credential.providerUsername ?? 'LinkedIn user'}
              </p>
              <p className="mb-1 text-muted small">
                Connected {new Date(credential.connectedAt).toLocaleDateString()}
                {credential.expiresAt && (
                  <> &middot; Expires {new Date(credential.expiresAt).toLocaleDateString()}</>
                )}
              </p>

              {canManage && (
                <div className="mt-3 d-flex gap-2 flex-wrap">
                  <a
                    href={`/api/auth/linkedin/org-authorize?organizationId=${organization.id}`}
                    className="btn btn-outline-primary btn-sm"
                  >
                    Reconnect
                  </a>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={handleSyncPages}
                    disabled={syncing}
                  >
                    {syncing ? 'Syncing…' : 'Sync Pages'}
                  </button>
                  {userRole === 'owner' && (
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                    >
                      {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pages & assignments */}
      {isActive && (
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title">Company Pages</h5>

            {credential!.pages.length === 0 ? (
              <p className="text-muted">
                No Company Pages found. Make sure the connected account is an admin of at least one LinkedIn Company Page, then click Sync Pages.
              </p>
            ) : (
              <div className="mb-3">
                {credential!.pages.map((page) => (
                  <div key={page.id} className="d-flex align-items-center gap-2 mb-2">
                    {page.pageLogoUrl && (
                      <img
                        src={page.pageLogoUrl}
                        alt={page.pageName}
                        width={24}
                        height={24}
                        className="rounded"
                      />
                    )}
                    <span className="fw-medium">{page.pageName}</span>
                    <span className="text-muted small">ID: {page.linkedInPageId}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Member assignment table */}
      {isActive && credential!.pages.length > 0 && canManage && (
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">Member Page Assignments</h5>
            <p className="text-muted small mb-3">
              Each member&apos;s cross-posts will use the assigned Company Page. Members without an assignment fall back to their personal LinkedIn.
            </p>

            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Assigned Page</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        {member.avatar && (
                          <img
                            src={member.avatar}
                            alt={member.displayName ?? member.username}
                            width={24}
                            height={24}
                            className="rounded-circle"
                          />
                        )}
                        <span>{member.displayName ?? member.username}</span>
                        <span className="badge bg-secondary">{member.role}</span>
                      </div>
                    </td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        value={getMemberAssignment(member.id)}
                        disabled={assigningUserId === member.id}
                        onChange={(e) => handleAssign(member.id, e.target.value || null)}
                        style={{ maxWidth: 260 }}
                      >
                        <option value="">— Personal LinkedIn —</option>
                        {credential!.pages.map((page) => (
                          <option key={page.id} value={page.id}>
                            {page.pageName}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!canManage && isActive && (
        <div className="alert alert-info">
          Contact an owner or admin to manage LinkedIn Company Page assignments.
        </div>
      )}
    </div>
  );
}
