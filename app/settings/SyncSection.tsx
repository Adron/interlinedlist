'use client';

import { useState, FormEvent } from 'react';

export default function SyncSection() {
  const [name, setName] = useState('CLI');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newToken, setNewToken] = useState<string | null>(null);

  const handleCreateToken = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setNewToken(null);
    setLoading(true);

    try {
      const res = await fetch('/api/user/sync-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || 'CLI' }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create token');
        setLoading(false);
        return;
      }

      setNewToken(data.token);
      setLoading(false);
    } catch {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h5 className="card-title mb-0">Document Sync (CLI)</h5>
      </div>
      <div className="card-body">
        <p className="text-muted small mb-3">
          Create an API key to authenticate the CLI sync daemon. Use <code>sync init</code> and paste the key when prompted.
        </p>
        <form onSubmit={handleCreateToken} className="mb-3">
          <div className="mb-2">
            <label htmlFor="sync-token-name" className="form-label">Token name</label>
            <input
              id="sync-token-name"
              type="text"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="CLI"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating…' : 'Create API key'}
          </button>
        </form>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        {newToken && (
          <div className="alert alert-success py-2">
            <strong>API key created.</strong> Copy it now — it will not be shown again:
            <pre className="bg-dark text-light p-2 rounded mt-2 mb-0 small" style={{ wordBreak: 'break-all' }}>
              {newToken}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
