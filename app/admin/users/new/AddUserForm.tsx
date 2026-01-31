'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function AddUserForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    displayName: '',
    avatar: '',
    bio: '',
    emailVerified: false,
    isAdministrator: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          password: formData.password,
          displayName: formData.displayName || undefined,
          avatar: formData.avatar || undefined,
          bio: formData.bio || undefined,
          emailVerified: formData.emailVerified,
          isAdministrator: formData.isAdministrator,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create user');
        setLoading(false);
        return;
      }

      // Redirect to admin page on success
      router.push('/admin');
    } catch (err) {
      console.error('Create user error:', err);
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="email" className="form-label">
                Email <span className="text-danger">*</span>
              </label>
              <input
                type="email"
                className="form-control"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label htmlFor="username" className="form-label">
                Username <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="password" className="form-label">
                Password <span className="text-danger">*</span>
              </label>
              <input
                type="password"
                className="form-control"
                id="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
                disabled={loading}
              />
              <div className="form-text">Password must be at least 8 characters</div>
            </div>

            <div className="col-md-6 mb-3">
              <label htmlFor="displayName" className="form-label">
                Display Name
              </label>
              <input
                type="text"
                className="form-control"
                id="displayName"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="avatar" className="form-label">
                Avatar URL
              </label>
              <input
                type="url"
                className="form-control"
                id="avatar"
                value={formData.avatar}
                onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label d-block">Options</label>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="emailVerified"
                  checked={formData.emailVerified}
                  onChange={(e) =>
                    setFormData({ ...formData, emailVerified: e.target.checked })
                  }
                  disabled={loading}
                />
                <label className="form-check-label" htmlFor="emailVerified">
                  Email Verified
                </label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="isAdministrator"
                  checked={formData.isAdministrator}
                  onChange={(e) =>
                    setFormData({ ...formData, isAdministrator: e.target.checked })
                  }
                  disabled={loading}
                />
                <label className="form-check-label" htmlFor="isAdministrator">
                  Administrator
                </label>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="bio" className="form-label">
              Bio
            </label>
            <textarea
              className="form-control"
              id="bio"
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <div className="d-flex gap-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Creating User...
                </>
              ) : (
                <>
                  <i className="bx bx-user-plus me-2"></i>Create User
                </>
              )}
            </button>
            <a href="/admin" className="btn btn-secondary">
              Cancel
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
