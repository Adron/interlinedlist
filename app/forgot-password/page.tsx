'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'An error occurred. Please try again.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '3rem auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: 'var(--color-text)', textAlign: 'center' }}>
        Forgot Password
      </h1>

      {success ? (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ 
            color: 'var(--color-success)', 
            padding: '15px', 
            backgroundColor: 'var(--color-success-bg)', 
            borderRadius: '5px',
            marginBottom: '20px'
          }}>
            If an account with that email exists, a password reset link has been sent. Please check your email.
          </div>
          <p style={{ textAlign: 'center', color: 'var(--color-text)' }}>
            <Link href="/login" style={{ color: 'var(--color-link)' }}>Back to Login</Link>
          </p>
        </div>
      ) : (
        <>
          <p style={{ marginBottom: '20px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
            Enter your email address and we'll send you a link to reset your password.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="email" style={{ display: 'block', marginBottom: '5px', color: 'var(--color-text)' }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              />
            </div>

            {error && (
              <div style={{ 
                color: 'var(--color-error)', 
                marginBottom: '15px', 
                padding: '10px', 
                backgroundColor: 'var(--color-error-bg)', 
                borderRadius: '5px' 
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: 'var(--color-button-primary)',
                color: 'var(--color-button-text)',
                border: 'none',
                borderRadius: '5px',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginBottom: '15px',
              }}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <p style={{ marginTop: '20px', textAlign: 'center', color: 'var(--color-text)' }}>
            Remember your password? <Link href="/login" style={{ color: 'var(--color-link)' }}>Login</Link>
          </p>
        </>
      )}
    </div>
  );
}

