'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface VerifyEmailFormProps {
  token: string;
  isValid: boolean;
  isExpired: boolean;
}

export default function VerifyEmailForm({ token, isValid, isExpired }: VerifyEmailFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/verify-email', {
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
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        window.location.href = '/dashboard';
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
        <h5 className="alert-heading">Email Verified Successfully!</h5>
        <p className="mb-0">Your email has been verified. Redirecting to dashboard...</p>
      </div>
    );
  }

  if (!isValid || isExpired) {
    return (
      <div className="alert alert-danger" role="alert">
        <h5 className="alert-heading">Invalid or Expired Token</h5>
        <p className="mb-3">
          {isExpired
            ? 'This verification link has expired. Please request a new verification email.'
            : 'This verification link is invalid. Please request a new verification email.'}
        </p>
        <p className="mb-0">
          <a href="/dashboard" className="btn btn-primary">
            Go to Dashboard
          </a>
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
          {loading ? 'Verifying...' : 'Verify Email'}
        </button>
      </div>
    </form>
  );
}

