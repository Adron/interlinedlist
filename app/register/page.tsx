'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    displayName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      // Redirect to dashboard on success
      // Use window.location for a full page reload to ensure cookies are read
      window.location.href = '/dashboard';
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '3rem auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: 'var(--color-text)', textAlign: 'center' }}>Create Account</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '5px', color: 'var(--color-text)' }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="username" style={{ display: 'block', marginBottom: '5px', color: 'var(--color-text)' }}>
            Username
          </label>
          <input
            id="username"
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="displayName" style={{ display: 'block', marginBottom: '5px', color: 'var(--color-text)' }}>
            Display Name (optional)
          </label>
          <input
            id="displayName"
            type="text"
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '5px', color: 'var(--color-text)' }}>
            Password
          </label>
          <input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            minLength={8}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        {error && (
          <div style={{ color: 'var(--color-error)', marginBottom: '15px', padding: '10px', backgroundColor: 'var(--color-error-bg)', borderRadius: '5px' }}>{error}</div>
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
          }}
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <p style={{ marginTop: '20px', textAlign: 'center', color: 'var(--color-text)' }}>
        Already have an account? <Link href="/login" style={{ color: 'var(--color-link)' }}>Login</Link>
      </p>
    </div>
  );
}

