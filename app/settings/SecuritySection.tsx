'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ConnectedAccountsSection from '@/components/settings/ConnectedAccountsSection';

interface SecuritySectionProps {
  isPrivateAccount: boolean | null;
  linkedIdentities: Array<{
    id: string;
    provider: string;
    providerUsername: string | null;
    profileUrl: string | null;
    avatarUrl: string | null;
    connectedAt: string;
    lastVerifiedAt: string | null;
  }>;
  initialError?: string;
  initialSuccess?: string;
}

export default function SecuritySection({ isPrivateAccount: initialIsPrivateAccount, linkedIdentities, initialError, initialSuccess }: SecuritySectionProps) {
  const router = useRouter();
  const [isPrivateAccount, setIsPrivateAccount] = useState(initialIsPrivateAccount ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError ?? '');
  const [success, setSuccess] = useState(initialSuccess ?? '');

  const handlePrivacyToggle = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isPrivateAccount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Update failed');
        setLoading(false);
        return;
      }

      setSuccess('Privacy setting updated successfully!');
      setLoading(false);
      router.refresh();
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="card h-100">
      <div className="card-body">
        <h3 className="h5 mb-4">Security</h3>
        
        {/* Privacy Account Setting */}
        <form onSubmit={handlePrivacyToggle} className="mb-4">
          <div className="mb-3">
            <label className="form-label fw-medium">Private Account</label>
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="isPrivateAccount"
                checked={isPrivateAccount}
                onChange={(e) => setIsPrivateAccount(e.target.checked)}
                disabled={loading}
              />
              <label className="form-check-label" htmlFor="isPrivateAccount">
                Make my account private
              </label>
            </div>
            <small className="form-text text-muted d-block mt-2">
              When your account is private, only approved followers can see your messages. 
              New follow requests will require your approval. Existing approved followers will remain approved.
            </small>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success" role="alert">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Privacy Setting'}
          </button>
        </form>

        <hr className="my-4" />

        <ConnectedAccountsSection initialIdentities={linkedIdentities} />

        <hr className="my-4" />
        
        <div>
          <h4 className="h6 mb-2">Change Password</h4>
          <p className="text-muted small mb-3">
            If you want to change your password, we'll send you a secure link to reset it via email.
          </p>
          <Link href="/forgot-password" className="btn btn-secondary">
            Reset Password
          </Link>
        </div>
      </div>
    </div>
  );
}

