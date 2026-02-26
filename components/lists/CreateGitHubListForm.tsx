'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Repo {
  full_name: string;
  name: string;
  private: boolean;
}

export default function CreateGitHubListForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [repos, setRepos] = useState<Repo[]>([]);
  const [reposLoading, setReposLoading] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [title, setTitle] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    fetch('/api/github/repos')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRepos(data);
          if (data.length > 0 && !selectedRepo) {
            setSelectedRepo(data[0].full_name);
            setTitle(data[0].name);
          }
        }
      })
      .catch(() => setRepos([]))
      .finally(() => setReposLoading(false));
  }, []);

  useEffect(() => {
    if (selectedRepo && !title) {
      const repo = repos.find((r) => r.full_name === selectedRepo);
      if (repo) setTitle(repo.name);
    }
  }, [selectedRepo, repos, title]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedRepo) {
      setError('Please select a repository');
      return;
    }
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'github',
          githubRepo: selectedRepo,
          title: title.trim(),
          isPublic,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create list');
      }
      router.push(`/lists/${data.data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create list');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      <div className="mb-3">
        <label className="form-label fw-medium">Repository (required)</label>
        <select
          className="form-select"
          value={selectedRepo}
          onChange={(e) => {
            setSelectedRepo(e.target.value);
            const repo = repos.find((r) => r.full_name === e.target.value);
            if (repo) setTitle(repo.name);
          }}
          disabled={reposLoading}
          required
        >
          <option value="">Select repository...</option>
          {repos.map((r) => (
            <option key={r.full_name} value={r.full_name}>
              {r.full_name}
            </option>
          ))}
        </select>
        {reposLoading && <small className="text-muted">Loading repositories...</small>}
        {!reposLoading && repos.length === 0 && (
          <small className="text-warning">No repositories found. Connect GitHub with Issues scope in Settings.</small>
        )}
      </div>
      <div className="mb-3">
        <label className="form-label fw-medium">List title</label>
        <input
          type="text"
          className="form-control"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. My Issues"
          required
        />
      </div>
      <div className="mb-4">
        <div className="form-check form-switch">
          <input
            type="checkbox"
            className="form-check-input"
            id="githubListIsPublic"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="githubListIsPublic">
            Public list (visible to others)
          </label>
        </div>
      </div>
      <div className="d-flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={loading || reposLoading || !selectedRepo}>
          {loading ? 'Creating...' : 'Create GitHub-backed List'}
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => router.push('/lists')}
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
