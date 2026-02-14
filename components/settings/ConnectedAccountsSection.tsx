'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface LinkedIdentity {
  id: string;
  provider: string;
  providerUsername: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
  connectedAt: string;
  lastVerifiedAt: string | null;
}

interface ConnectedAccountsSectionProps {
  initialIdentities: LinkedIdentity[];
}

function getProviderLabel(provider: string): string {
  if (provider === 'github') return 'GitHub';
  if (provider === 'bluesky') return 'Bluesky';
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
  if (provider.startsWith('mastodon:') || instance) {
    const inst = instance || provider.replace('mastodon:', '');
    return `/api/auth/mastodon/authorize?instance=${encodeURIComponent(inst)}&link=true`;
  }
  return '#';
}

export default function ConnectedAccountsSection({
  initialIdentities,
}: ConnectedAccountsSectionProps) {
  const router = useRouter();
  const [identities, setIdentities] = useState<LinkedIdentity[]>(initialIdentities);
  const [mastodonInstance, setMastodonInstance] = useState('');
  const [blueskyHandle, setBlueskyHandle] = useState('');
  const [verifying, setVerifying] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
  const mastodonIdentities = identities.filter((i) => i.provider.startsWith('mastodon:'));

  return (
    <div className="mt-4">
      <h4 className="h6 mb-3">Connected Accounts</h4>
      <p className="text-muted small mb-3">
        Link your GitHub, Mastodon, and Bluesky accounts for sign-in and verification.
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
            <div className="d-flex gap-1">
              {githubIdentity ? (
                <>
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
          {!blueskyIdentity && (
            <p className="text-muted small mt-2 mb-0">
              Enter your Bluesky handle to pre-fill the sign-in form (e.g. adron.bsky.social).
            </p>
          )}
        </div>
      </div>

      {/* Mastodon - multiple instances */}
      <div className="mb-3">
        <div className="d-flex align-items-center gap-2 mb-2">
          <span className="badge bg-secondary">Mastodon</span>
          <span className="text-muted small">Add multiple instances</span>
        </div>
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
  );
}
