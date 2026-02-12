'use client';

import { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { syncThemeToStorage } from '@/lib/theme/theme-sync';

export default function LoginForm() {
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [mastodonInstance, setMastodonInstance] = useState('');
  const [showMastodonInput, setShowMastodonInput] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const reset = searchParams.get('reset');
    const errorParam = searchParams.get('error');
    if (reset === 'success') {
      setSuccess(true);
      window.history.replaceState({}, '', '/login');
    }
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      window.history.replaceState({}, '', '/login');
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include', // Ensure cookies are included in the request
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Verify login was successful
      if (data.message === 'Login successful') {
        // Sync theme to localStorage if available
        if (data.user?.theme) {
          syncThemeToStorage(data.user.theme);
        }
        
        // Use a delay to ensure browser fully processes the Set-Cookie header
        // The cookie needs to be stored before we navigate
        setTimeout(() => {
          // Use window.location.href for full navigation - ensures cookie is sent
          window.location.href = '/dashboard';
        }, 500);
      } else {
        setError('Login failed. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card">
            <div className="card-body p-4">
              <h1 className="card-title text-center mb-4">Login</h1>
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="form-control"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label htmlFor="password" className="form-label mb-0">
                      Password
                    </label>
                    <Link href="/forgot-password" className="text-decoration-none small">
                      Forgot Password?
                    </Link>
                  </div>
                  <input
                    id="password"
                    type="password"
                    className="form-control"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>

                {success && (
                  <div className="alert alert-success" role="alert">
                    Password reset successful! Please login with your new password.
                  </div>
                )}

                {error && (
                  <div className="alert alert-danger" role="alert">{error}</div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={loading}
                >
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </form>

              <div className="text-center mt-3 mb-2">
                <span className="text-muted small">Or sign in with</span>
              </div>
              <div className="d-flex flex-column gap-2">
                <a
                  href="/api/auth/github/authorize?link=false"
                  className="btn btn-outline-secondary"
                >
                  <i className="bx bxl-github me-2"></i>
                  Sign in with GitHub
                </a>
                {showMastodonInput ? (
                  <div className="d-flex gap-2">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="mastodon.social"
                      value={mastodonInstance}
                      onChange={(e) => setMastodonInstance(e.target.value)}
                    />
                    <a
                      href={
                        mastodonInstance.trim()
                          ? `/api/auth/mastodon/authorize?instance=${encodeURIComponent(mastodonInstance.trim())}&link=false`
                          : '#'
                      }
                      className={`btn btn-outline-secondary ${!mastodonInstance.trim() ? 'disabled' : ''}`}
                      onClick={(e) => {
                        if (!mastodonInstance.trim()) e.preventDefault();
                      }}
                    >
                      Go
                    </a>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        setShowMastodonInput(false);
                        setMastodonInstance('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowMastodonInput(true)}
                  >
                    <i className="bx bx-at me-2"></i>
                    Sign in with Mastodon
                  </button>
                )}
                <a
                  href="/api/auth/bluesky/authorize?link=false"
                  className="btn btn-outline-secondary"
                >
                  <i className="bx bxl-bluesky me-2"></i>
                  Sign in with Bluesky
                </a>
              </div>

              <p className="text-center mt-3 mb-0">
                Don't have an account? <Link href="/register" className="text-decoration-none">Create one</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

