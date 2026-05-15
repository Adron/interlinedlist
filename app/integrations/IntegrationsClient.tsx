'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ConnectedAccountsSection, { LinkedIdentity } from '@/components/settings/ConnectedAccountsSection';

interface IntegrationsClientProps {
  initialIdentities: LinkedIdentity[];
  initialGithubDefaultRepo: string;
  initialError?: string;
  initialSuccess?: string;
}

export default function IntegrationsClient({
  initialIdentities,
  initialGithubDefaultRepo,
  initialError,
  initialSuccess,
}: IntegrationsClientProps) {
  const router = useRouter();
  const [githubDefaultRepo, setGithubDefaultRepo] = useState(initialGithubDefaultRepo);
  const [githubRepoSaving, setGithubRepoSaving] = useState(false);
  const [error, setError] = useState(initialError ?? '');
  const [success, setSuccess] = useState(initialSuccess ?? '');

  const handleGithubDefaultRepoSave = async () => {
    setGithubRepoSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubDefaultRepo: githubDefaultRepo || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save default repo');
        return;
      }
      setSuccess('Default GitHub repo saved');
      router.refresh();
    } catch {
      setError('Failed to save default repo');
    } finally {
      setGithubRepoSaving(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="alert alert-danger mb-4" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success mb-4" role="alert">
          {success}
        </div>
      )}
      <ConnectedAccountsSection
        initialIdentities={initialIdentities}
        githubDefaultRepo={githubDefaultRepo}
        onGithubDefaultRepoChange={setGithubDefaultRepo}
        onGithubDefaultRepoSave={handleGithubDefaultRepoSave}
        githubRepoSaving={githubRepoSaving}
      />
    </div>
  );
}
