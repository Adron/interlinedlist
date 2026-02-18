'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface VerifyEmailChangeFormProps {
  token: string;
  isValid: boolean;
  isExpired: boolean;
}

export default function VerifyEmailChangeForm({
  token,
  isValid,
  isExpired,
}: VerifyEmailChangeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/verify-email-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Verification failed');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/settings?success=Email+updated+successfully';
      }, 2000);
    } catch (err) {
      console.error('Verification error:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="alert alert-success" role="alert">
        <h5 className="alert-heading">Email Updated Successfully!</h5>
        <p className="mb-0">Your email address has been updated. Redirecting to settings...</p>
      </div>
    );
  }

  if (!isValid || isExpired) {
    return (
      <div className="alert alert-danger" role="alert">
        <h5 className="alert-heading">Invalid or Expired Link</h5>
        <p className="mb-3">
          {isExpired
            ? 'This verification link has expired. Please request a new verification email from Settings.'
            : 'This verification link is invalid. Please request a new verification email from Settings.'}
        </p>
        <p className="mb-0">
          <Link href="/settings" className="btn btn-primary">
            Go to Settings
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      <div className="d-grid gap-2">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Confirming...' : 'Confirm Email Change'}
        </button>
      </div>
    </form>
  );
}
