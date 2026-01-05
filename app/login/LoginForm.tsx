'use client';

import { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function LoginForm() {
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const addDebugLog = (message: string) => {
    console.log(`[Login Debug] ${message}`);
    setDebugLog((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    if (searchParams.get('reset') === 'success') {
      setSuccess(true);
      // Clear the URL parameter
      window.history.replaceState({}, '', '/login');
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);
    setDebugLog([]);

    addDebugLog('Starting login process...');

    try {
      addDebugLog('Sending login request to /api/auth/login');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include', // Ensure cookies are included in the request
      });

      addDebugLog(`Response status: ${response.status}`);
      addDebugLog(`Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);

      const data = await response.json();
      addDebugLog(`Response data: ${JSON.stringify(data)}`);

      if (!response.ok) {
        addDebugLog(`Login failed: ${data.error || 'Unknown error'}`);
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Verify login was successful
      if (data.message === 'Login successful') {
        addDebugLog('Login successful! Cookie should be set in response.');
        addDebugLog('Note: HttpOnly cookies cannot be read by JavaScript.');
        addDebugLog('Waiting 500ms for browser to process Set-Cookie header...');
        
        // Use a longer delay to ensure browser fully processes the Set-Cookie header
        // The cookie needs to be stored before we navigate
        setTimeout(() => {
          addDebugLog('Navigating to /dashboard now (cookie should be sent automatically)...');
          // Use window.location.href for full navigation - ensures cookie is sent
          window.location.href = '/dashboard';
        }, 500);
      } else {
        addDebugLog(`Unexpected response message: ${data.message}`);
        setError('Login failed. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      addDebugLog(`Error occurred: ${err}`);
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

                {/* Debug log - visible during development */}
                {debugLog.length > 0 && (
                  <div className="alert alert-info" role="alert" style={{ fontSize: '0.875rem', maxHeight: '200px', overflowY: 'auto' }}>
                    <strong>Debug Log:</strong>
                    <ul className="mb-0 mt-2" style={{ paddingLeft: '20px' }}>
                      {debugLog.map((log, index) => (
                        <li key={index}>{log}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={loading}
                >
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </form>

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

