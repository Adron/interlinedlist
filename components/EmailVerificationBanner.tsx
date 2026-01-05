'use client';

import { useState } from 'react';
import Link from 'next/link';

interface EmailVerificationBannerProps {
  emailVerified: boolean;
}

export default function EmailVerificationBanner({ emailVerified }: EmailVerificationBannerProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (emailVerified) {
    return null;
  }

  const handleResend = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/send-verification-email', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to send verification email. Please try again.',
        });
        setLoading(false);
        return;
      }

      setMessage({
        type: 'success',
        text: 'Verification email sent! Please check your inbox.',
      });
      setLoading(false);
    } catch (err) {
      console.error('Resend verification email error:', err);
      setMessage({
        type: 'error',
        text: 'An unexpected error occurred. Please try again.',
      });
      setLoading(false);
    }
  };

  return (
    <div className="alert alert-warning alert-dismissible fade show" role="alert">
      <h5 className="alert-heading">
        <i className="bx bx-error-circle me-2"></i>
        Email Verification Required
      </h5>
      <p className="mb-2">
        Please verify your email address to access all features, including posting messages.
      </p>
      {message && (
        <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} mb-2`} role="alert">
          {message.text}
        </div>
      )}
      <div className="d-flex gap-2 flex-wrap">
        <button
          className="btn btn-sm btn-warning"
          onClick={handleResend}
          disabled={loading}
        >
          {loading ? 'Sending...' : 'Resend Verification Email'}
        </button>
        <Link href="/settings" className="btn btn-sm btn-outline-secondary">
          Go to Settings
        </Link>
      </div>
    </div>
  );
}

