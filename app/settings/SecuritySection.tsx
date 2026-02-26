'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ConnectedAccountsSection from '@/components/settings/ConnectedAccountsSection';

type DeleteModalStep = 0 | 1 | 2;

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
    hasIssuesScope?: boolean;
  }>;
  githubDefaultRepo?: string;
  initialError?: string;
  initialSuccess?: string;
}

export default function SecuritySection({ isPrivateAccount: initialIsPrivateAccount, linkedIdentities, githubDefaultRepo: initialGithubDefaultRepo = '', initialError, initialSuccess }: SecuritySectionProps) {
  const router = useRouter();
  const [isPrivateAccount, setIsPrivateAccount] = useState(initialIsPrivateAccount ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError ?? '');
  const [success, setSuccess] = useState(initialSuccess ?? '');
  const [deleteModalStep, setDeleteModalStep] = useState<DeleteModalStep>(0);
  const [deleteUsername, setDeleteUsername] = useState('');
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [githubDefaultRepo, setGithubDefaultRepo] = useState(initialGithubDefaultRepo);
  const [githubRepoSaving, setGithubRepoSaving] = useState(false);

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

  const openDeleteModal = () => {
    setDeleteModalStep(1);
    setDeleteError('');
    setDeleteUsername('');
    setDeleteEmail('');
  };

  const closeDeleteModal = () => {
    setDeleteModalStep(0);
    setDeleteError('');
    setDeleteUsername('');
    setDeleteEmail('');
  };

  const proceedToDeleteStep2 = () => {
    setDeleteModalStep(2);
    setDeleteError('');
  };

  const handleDeleteAccount = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDeleteError('');
    setDeleteLoading(true);

    try {
      const response = await fetch('/api/user/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: deleteUsername.trim(),
          email: deleteEmail.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setDeleteError(data.error || 'Failed to delete account');
        setDeleteLoading(false);
        return;
      }

      closeDeleteModal();
      router.push('/');
      router.refresh();
    } catch (err) {
      setDeleteError('An error occurred. Please try again.');
      setDeleteLoading(false);
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

        <ConnectedAccountsSection
          initialIdentities={linkedIdentities}
          githubDefaultRepo={githubDefaultRepo}
          onGithubDefaultRepoChange={setGithubDefaultRepo}
          onGithubDefaultRepoSave={async () => {
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
          }}
          githubRepoSaving={githubRepoSaving}
        />

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

        <hr className="my-4" />

        <div>
          <h4 className="h6 mb-2">Delete Account</h4>
          <p className="text-muted small mb-3">
            Permanently delete your account and all your data. This cannot be undone.
          </p>
          <button
            type="button"
            className="btn btn-outline-danger"
            onClick={openDeleteModal}
          >
            Delete my account
          </button>
        </div>
      </div>

      {/* Delete Account - Step 1: Confirmation */}
      {deleteModalStep === 1 && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Delete your account?</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={closeDeleteModal}
                />
              </div>
              <div className="modal-body">
                <p className="mb-0">
                  Are you sure you want to permanently delete your account? This cannot be undone. All your messages and data will be removed.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeDeleteModal}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={proceedToDeleteStep2}
                >
                  Yes, I want to delete my account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account - Step 2: Username and email verification */}
      {deleteModalStep === 2 && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleDeleteAccount}>
                <div className="modal-header">
                  <h5 className="modal-title">Verify your identity</h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={closeDeleteModal}
                  />
                </div>
                <div className="modal-body">
                  <p className="text-muted small mb-3">
                    Enter your username and email address to confirm account deletion.
                  </p>
                  {deleteError && (
                    <div className="alert alert-danger py-2 mb-3" role="alert">
                      {deleteError}
                    </div>
                  )}
                  <div className="mb-3">
                    <label htmlFor="deleteUsername" className="form-label">
                      Username
                    </label>
                    <input
                      type="text"
                      id="deleteUsername"
                      className="form-control"
                      placeholder="Enter your username"
                      value={deleteUsername}
                      onChange={(e) => setDeleteUsername(e.target.value)}
                      required
                      disabled={deleteLoading}
                      autoComplete="username"
                    />
                  </div>
                  <div className="mb-0">
                    <label htmlFor="deleteEmail" className="form-label">
                      Email
                    </label>
                    <input
                      type="email"
                      id="deleteEmail"
                      className="form-control"
                      placeholder="Enter your email"
                      value={deleteEmail}
                      onChange={(e) => setDeleteEmail(e.target.value)}
                      required
                      disabled={deleteLoading}
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeDeleteModal}
                    disabled={deleteLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-danger"
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? 'Deleting...' : 'Permanently delete my account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

