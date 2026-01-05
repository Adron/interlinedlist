'use client';

import { useState } from 'react';

export default function EmailVerificationResend() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
    <div>
      {message && (
        <div
          style={{
            color: message.type === 'success' ? 'var(--color-success)' : 'var(--color-error)',
            marginBottom: '1rem',
            padding: '10px',
            backgroundColor: message.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
            borderRadius: '5px',
            fontSize: '0.9rem',
          }}
        >
          {message.text}
        </div>
      )}
      <button
        onClick={handleResend}
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: 'var(--color-button-primary)',
          color: 'var(--color-button-text)',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '0.9rem',
          fontWeight: '500',
        }}
      >
        {loading ? 'Sending...' : 'Resend Verification Email'}
      </button>
    </div>
  );
}

