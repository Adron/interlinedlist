'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { LinkedInPostingTargetOption } from '@/lib/types';

function linkedInPostingTargetKey(target: LinkedInPostingTargetOption): string {
  if (target.kind === 'personal') return 'personal';
  return target.kind === 'orgPage' ? target.pageId : `personalPage-${target.personalPageId}`;
}

export interface LinkedIdentity {
  id: string;
  provider: string;
  providerUsername: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
  connectedAt: string;
  lastVerifiedAt: string | null;
  hasIssuesScope?: boolean;
}

interface ConnectedAccountsSectionProps {
  initialIdentities: LinkedIdentity[];
  githubDefaultRepo?: string;
  onGithubDefaultRepoChange?: (repo: string) => void;
  onGithubDefaultRepoSave?: () => Promise<void>;
  githubRepoSaving?: boolean;
}

function getProviderLabel(provider: string): string {
  if (provider === 'github') return 'GitHub';
  if (provider === 'bluesky') return 'Bluesky';
  if (provider === 'linkedin') return 'LinkedIn';
  if (provider === 'twitter') return 'Twitter / X';
  if (provider.startsWith('mastodon:')) {
    const instance = provider.replace('mastodon:', '');
    return `Mastodon @ ${instance}`;
  }
  return provider;
}

function getProviderConnectUrl(provider: string, instance?: string, handle?: string): string {
  if (provider === 'github') {
    return '/api/auth/github/authorize?link=true';
  }
  if (provider === 'bluesky') {
    const params = new URLSearchParams({ link: 'true' });
    if (handle?.trim()) params.set('handle', handle.trim());
    return `/api/auth/bluesky/authorize?${params}`;
  }
  if (provider === 'linkedin') {
    return '/api/auth/linkedin/authorize?link=true';
  }
  if (provider === 'twitter') {
    return '/api/auth/twitter/authorize?link=true';
  }
  if (provider.startsWith('mastodon:') || instance) {
    const inst = instance || provider.replace('mastodon:', '');
    return `/api/auth/mastodon/authorize?instance=${encodeURIComponent(inst)}&link=true`;
  }
  return '#';
}

export default function ConnectedAccountsSection({
  initialIdentities,
  githubDefaultRepo = '',
  onGithubDefaultRepoChange,
  onGithubDefaultRepoSave,
  githubRepoSaving = false,
}: ConnectedAccountsSectionProps) {
  const router = useRouter();
  const [identities, setIdentities] = useState<LinkedIdentity[]>(initialIdentities);
  const [mastodonInstance, setMastodonInstance] = useState('');
  const [blueskyHandle, setBlueskyHandle] = useState('');
  const [verifying, setVerifying] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [linkedinConfigured, setLinkedinConfigured] = useState<boolean | null>(null);
  const [twitterConfigured, setTwitterConfigured] = useState<boolean | null>(null);
  const [linkedInPostingTargets, setLinkedInPostingTargets] = useState<
    LinkedInPostingTargetOption[] | null
  >(null);
  const [savingLinkedInTargets, setSavingLinkedInTargets] = useState(false);
  const [syncingLinkedInPages, setSyncingLinkedInPages] = useState(false);
  const [linkedInOrgScopeMissing, setLinkedInOrgScopeMissing] = useState(false);

  useEffect(() => {
    fetch('/api/auth/linkedin/status')
      .then((res) => res.json())
      .then((data) => setLinkedinConfigured(data.configured === true))
      .catch(() => setLinkedinConfigured(false));
  }, []);

  useEffect(() => {
    fetch('/api/auth/twitter/status')
      .then((res) => res.json())
      .then((data) => setTwitterConfigured(data.configured === true))
      .catch(() => setTwitterConfigured(false));
  }, []);

  useEffect(() => {
    fetch('/api/linkedin/posting-targets')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.targets)) {
          setLinkedInPostingTargets(data.targets);
        }
      })
      .catch(() => {});
  }, []);

  const refreshLinkedInPostingTargets = async () => {
    try {
      const res = await fetch('/api/linkedin/posting-targets');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.targets)) {
        setLinkedInPostingTargets(data.targets);
      }
    } catch {
      // Ignore — the existing list stays in place.
    }
  };

  const handleSyncLinkedInPages = async () => {
    setSyncingLinkedInPages(true);
    setMessage(null);
    setLinkedInOrgScopeMissing(false);
    try {
      const res = await fetch('/api/linkedin/sync-pages', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'org_scope_missing') {
          setLinkedInOrgScopeMissing(true);
        } else {
          setMessage({
            type: 'error',
            text: data.error || 'Failed to sync LinkedIn company pages',
          });
        }
        return;
      }
      const count = Array.isArray(data.pages) ? data.pages.length : 0;
      setMessage({
        type: 'success',
        text:
          count > 0
            ? `Synced ${count} LinkedIn company page${count === 1 ? '' : 's'}`
            : 'No LinkedIn company pages found for your account',
      });
      await refreshLinkedInPostingTargets();
    } catch {
      setMessage({ type: 'error', text: 'Failed to sync LinkedIn company pages' });
    } finally {
      setSyncingLinkedInPages(false);
    }
  };

  const handleToggleLinkedInTarget = async (key: string) => {
    if (!linkedInPostingTargets) return;
    const previous = linkedInPostingTargets;
    const next = linkedInPostingTargets.map((t) =>
      linkedInPostingTargetKey(t) === key ? { ...t, enabled: !t.enabled } : t
    );
    const enabled = next.filter((t) => t.enabled);
    if (enabled.length === 0) {
      setMessage({
        type: 'error',
        text: 'At least one LinkedIn posting target must remain enabled',
      });
      return;
    }
    setLinkedInPostingTargets(next);
    setSavingLinkedInTargets(true);
    setMessage(null);
    try {
      const res = await fetch('/api/linkedin/posting-targets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targets: enabled.map((t) =>
            t.kind === 'personal'
              ? { kind: 'personal' }
              : t.kind === 'orgPage'
                ? { kind: 'orgPage', pageId: t.pageId }
                : { kind: 'personalPage', personalPageId: t.personalPageId }
          ),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLinkedInPostingTargets(previous);
        setMessage({
          type: 'error',
          text: data.error || 'Failed to update LinkedIn posting targets',
        });
        return;
      }
      if (Array.isArray(data.targets)) {
        setLinkedInPostingTargets(data.targets);
      }
    } catch {
      setLinkedInPostingTargets(previous);
      setMessage({ type: 'error', text: 'Failed to update LinkedIn posting targets' });
    } finally {
      setSavingLinkedInTargets(false);
    }
  };

  const hasIdentity = (provider: string) =>
    identities.some((i) => i.provider === provider);

  const getIdentity = (provider: string) =>
    identities.find((i) => i.provider === provider);

  const handleVerify = async (provider: string) => {
    setVerifying(provider);
    setMessage(null);
    try {
      const res = await fetch('/api/user/identities/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Verification failed' });
        return;
      }
      setMessage({ type: 'success', text: 'Verification successful' });
      router.refresh();
    } catch {
      setMessage({ type: 'error', text: 'Verification failed' });
    } finally {
      setVerifying(null);
    }
  };

  const handleDisconnect = async (provider: string) => {
    setDisconnecting(provider);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/user/identities?provider=${encodeURIComponent(provider)}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to disconnect' });
        return;
      }
      setIdentities((prev) => prev.filter((i) => i.provider !== provider));
      setMessage({ type: 'success', text: 'Account disconnected' });
      router.refresh();
    } catch {
      setMessage({ type: 'error', text: 'Failed to disconnect' });
    } finally {
      setDisconnecting(null);
    }
  };

  const handleAddMastodon = () => {
    const inst = mastodonInstance.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    if (!inst) {
      setMessage({ type: 'error', text: 'Enter instance domain (e.g. mastodon.social)' });
      return;
    }
    if (hasIdentity(`mastodon:${inst}`)) {
      setMessage({ type: 'error', text: 'Already connected to this instance' });
      return;
    }
    window.location.href = getProviderConnectUrl('mastodon', inst);
  };

  const githubIdentity = getIdentity('github');
  const blueskyIdentity = getIdentity('bluesky');
  const linkedinIdentity = getIdentity('linkedin');
  const twitterIdentity = getIdentity('twitter');
  const mastodonIdentities = identities.filter((i) => i.provider.startsWith('mastodon:'));

  return (
    <div>
      <h3 className="h5 mb-2">Connected Accounts</h3>
      <p className="text-muted small mb-4">
        Link your social and developer accounts to enable single sign-on, cross-posting, and
        identity verification. Each provider unlocks specific features within the platform.
      </p>

      {message && (
        <div
          className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} mb-3`}
          role="alert"
        >
          {message.text}
        </div>
      )}

      {/* GitHub */}
      <div className="card mb-3">
        <div className="card-body py-3">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-dark">GitHub</span>
              {githubIdentity ? (
                <>
                  {githubIdentity.avatarUrl && (
                    <img
                      src={githubIdentity.avatarUrl}
                      alt=""
                      className="rounded-circle"
                      width={24}
                      height={24}
                    />
                  )}
                  <span>{githubIdentity.providerUsername || 'Connected'}</span>
                </>
              ) : (
                <span className="text-muted">Not connected</span>
              )}
            </div>
            <div className="d-flex gap-1 flex-wrap">
              {githubIdentity ? (
                <>
                  {!githubIdentity.hasIssuesScope && (
                    <a
                      href={getProviderConnectUrl('github')}
                      className="btn btn-sm btn-outline-primary"
                    >
                      Reconnect for GitHub Issues
                    </a>
                  )}
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => handleVerify('github')}
                    disabled={verifying === 'github'}
                  >
                    {verifying === 'github' ? 'Verifying...' : 'Verify'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleDisconnect('github')}
                    disabled={disconnecting === 'github'}
                  >
                    {disconnecting === 'github' ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                </>
              ) : (
                <a
                  href={getProviderConnectUrl('github')}
                  className="btn btn-sm btn-primary"
                >
                  Connect
                </a>
              )}
            </div>
          </div>
          <p className="text-muted small mt-2 mb-0">
            Connect GitHub to sign in with your GitHub account and sync issues with your lists.
            Reconnecting with the &ldquo;issues&rdquo; scope grants deeper list integration for
            reading and writing issues directly from your GitHub repositories.
          </p>
          {githubIdentity?.hasIssuesScope && (onGithubDefaultRepoChange != null || onGithubDefaultRepoSave != null) && (
            <div className="mt-3 pt-3 border-top">
              <label className="form-label small mb-1">Default GitHub repo (owner/repo)</label>
              <div className="d-flex gap-2 align-items-center flex-wrap">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  style={{ maxWidth: 220 }}
                  placeholder="owner/repo"
                  value={githubDefaultRepo}
                  onChange={(e) => onGithubDefaultRepoChange?.(e.target.value)}
                />
                {onGithubDefaultRepoSave && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={onGithubDefaultRepoSave}
                    disabled={githubRepoSaving}
                  >
                    {githubRepoSaving ? 'Saving...' : 'Save'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bluesky */}
      <div className="card mb-3">
        <div className="card-body py-3">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-info">Bluesky</span>
              {blueskyIdentity ? (
                <>
                  {blueskyIdentity.avatarUrl && (
                    <img
                      src={blueskyIdentity.avatarUrl}
                      alt=""
                      className="rounded-circle"
                      width={24}
                      height={24}
                    />
                  )}
                  <span>{blueskyIdentity.providerUsername || 'Connected'}</span>
                </>
              ) : (
                <span className="text-muted">Not connected</span>
              )}
            </div>
            <div className="d-flex gap-1">
              {blueskyIdentity ? (
                <>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => handleVerify('bluesky')}
                    disabled={verifying === 'bluesky'}
                  >
                    {verifying === 'bluesky' ? 'Verifying...' : 'Verify'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleDisconnect('bluesky')}
                    disabled={disconnecting === 'bluesky'}
                  >
                    {disconnecting === 'bluesky' ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                </>
              ) : (
                <div className="d-flex gap-2 align-items-center flex-wrap">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    style={{ maxWidth: 200 }}
                    placeholder="yourhandle.bsky.social"
                    value={blueskyHandle}
                    onChange={(e) => setBlueskyHandle(e.target.value)}
                  />
                  <a
                    href={getProviderConnectUrl('bluesky', undefined, blueskyHandle)}
                    className="btn btn-sm btn-primary"
                  >
                    Connect
                  </a>
                </div>
              )}
            </div>
          </div>
          <p className="text-muted small mt-2 mb-0">
            Connect Bluesky to sign in with your Bluesky account and automatically cross-post
            messages to your Bluesky timeline. Enter your handle above to pre-fill the
            sign-in form (e.g. adron.bsky.social).
          </p>
        </div>
      </div>

      {/* LinkedIn */}
      <div className="card mb-3">
        <div className="card-body py-3">
          <div className="d-flex align-items-center justify-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-primary">LinkedIn</span>
              {linkedinIdentity ? (
                <>
                  {linkedinIdentity.avatarUrl && (
                    <img
                      src={linkedinIdentity.avatarUrl}
                      alt=""
                      className="rounded-circle"
                      width={24}
                      height={24}
                    />
                  )}
                  <span>{linkedinIdentity.providerUsername || 'Connected'}</span>
                </>
              ) : (
                <span className="text-muted">Not connected</span>
              )}
            </div>
            <div className="d-flex gap-1">
              {linkedinIdentity ? (
                <>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => handleVerify('linkedin')}
                    disabled={verifying === 'linkedin'}
                  >
                    {verifying === 'linkedin' ? 'Verifying...' : 'Verify'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleDisconnect('linkedin')}
                    disabled={disconnecting === 'linkedin'}
                  >
                    {disconnecting === 'linkedin' ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                </>
              ) : linkedinConfigured === true ? (
                <a
                  href={getProviderConnectUrl('linkedin')}
                  className="btn btn-sm btn-primary"
                >
                  Connect
                </a>
              ) : (
                <span className="btn btn-sm btn-outline-secondary disabled">
                  {linkedinConfigured === null ? 'Loading...' : 'Coming soon'}
                </span>
              )}
            </div>
          </div>
          <p className="text-muted small mt-2 mb-0">
            Connect LinkedIn to use it as a sign-in and identity verification method. Your
            LinkedIn profile is used to confirm your professional identity across the platform.
          </p>
          {linkedInPostingTargets && linkedInPostingTargets.length > 0 && (
            <div className="mt-3 pt-3 border-top">
              <label className="form-label small mb-1">Posting targets</label>
              <p className="text-muted small mb-2">
                Choose which LinkedIn destinations are available when cross-posting messages.
              </p>
              {linkedInPostingTargets.map((target) => {
                const key = linkedInPostingTargetKey(target);
                return (
                  <div key={key} className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`linkedin-posting-target-${key}`}
                      checked={target.enabled}
                      disabled={savingLinkedInTargets}
                      onChange={() => handleToggleLinkedInTarget(key)}
                    />
                    <label
                      className="form-check-label small"
                      htmlFor={`linkedin-posting-target-${key}`}
                    >
                      {target.label} (
                      {target.kind === 'personal'
                        ? 'personal'
                        : target.kind === 'orgPage'
                          ? 'page'
                          : 'company page'}
                      )
                    </label>
                  </div>
                );
              })}
            </div>
          )}
          {linkedinIdentity && (
            <div className="mt-3 pt-3 border-top">
              <label className="form-label small mb-1">Company pages</label>
              <p className="text-muted small mb-2">
                Sync the LinkedIn company pages you administer to use them as posting
                targets when cross-posting messages.
              </p>
              {linkedInOrgScopeMissing && (
                <div className="alert alert-warning py-2 mb-2" role="alert">
                  <span className="small">
                    Your LinkedIn connection does not include company page access.
                    Reconnect LinkedIn to grant the required permissions.
                  </span>
                  <a
                    href={getProviderConnectUrl('linkedin')}
                    className="btn btn-sm btn-outline-primary ms-2"
                  >
                    Reconnect LinkedIn
                  </a>
                </div>
              )}
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={handleSyncLinkedInPages}
                disabled={syncingLinkedInPages}
              >
                {syncingLinkedInPages ? 'Syncing...' : 'Sync company pages'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mastodon - multiple instances */}
      <div className="card mb-3">
        <div className="card-body py-3">
        <div className="d-flex align-items-center gap-2 mb-2">
          <span className="badge bg-secondary">Mastodon</span>
          <span className="text-muted small">Add multiple instances</span>
        </div>
        <p className="text-muted small mb-3">
          Connect one or more Mastodon instances to sign in with Mastodon and cross-post
          messages to your Mastodon timelines. Each instance is managed independently,
          so you can broadcast to multiple communities at once.
        </p>
        {mastodonIdentities.map((id) => (
          <div key={id.id} className="card mb-2">
            <div className="card-body py-3">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2">
                  {id.avatarUrl && (
                    <img
                      src={id.avatarUrl}
                      alt=""
                      className="rounded-circle"
                      width={24}
                      height={24}
                    />
                  )}
                  <span>{getProviderLabel(id.provider)}</span>
                  <span>{id.providerUsername || 'Connected'}</span>
                </div>
                <div className="d-flex gap-1">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => handleVerify(id.provider)}
                    disabled={verifying === id.provider}
                  >
                    {verifying === id.provider ? 'Verifying...' : 'Verify'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleDisconnect(id.provider)}
                    disabled={disconnecting === id.provider}
                  >
                    {disconnecting === id.provider ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        <div className="d-flex gap-2 align-items-center flex-wrap">
          <input
            type="text"
            className="form-control form-control-sm"
            style={{ maxWidth: 200 }}
            placeholder="mastodon.social"
            value={mastodonInstance}
            onChange={(e) => setMastodonInstance(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={handleAddMastodon}
          >
            Add Mastodon instance
          </button>
        </div>
        </div>
      </div>

      {/* Twitter / X */}
      <div className="card mb-3">
        <div className="card-body py-3">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <span className="badge" style={{ backgroundColor: '#000' }}>Twitter / X</span>
              {twitterIdentity ? (
                <>
                  {twitterIdentity.avatarUrl && (
                    <img
                      src={twitterIdentity.avatarUrl}
                      alt=""
                      className="rounded-circle"
                      width={24}
                      height={24}
                    />
                  )}
                  <span>{twitterIdentity.providerUsername || 'Connected'}</span>
                </>
              ) : (
                <span className="text-muted">Not connected</span>
              )}
            </div>
            <div className="d-flex gap-1">
              {twitterIdentity ? (
                <>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => handleVerify('twitter')}
                    disabled={verifying === 'twitter'}
                  >
                    {verifying === 'twitter' ? 'Verifying...' : 'Verify'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleDisconnect('twitter')}
                    disabled={disconnecting === 'twitter'}
                  >
                    {disconnecting === 'twitter' ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                </>
              ) : twitterConfigured === true ? (
                <a href={getProviderConnectUrl('twitter')} className="btn btn-sm btn-primary">
                  Connect
                </a>
              ) : (
                <span className="btn btn-sm btn-outline-secondary disabled">
                  {twitterConfigured === null ? 'Loading...' : 'Coming soon'}
                </span>
              )}
            </div>
          </div>
          <p className="text-muted small mt-2 mb-0">
            Connect Twitter / X to cross-post messages to your timeline. Posts longer than 280 characters are automatically threaded.
          </p>
        </div>
      </div>
    </div>
  );
}
