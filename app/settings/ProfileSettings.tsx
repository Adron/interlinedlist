'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/Avatar';

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
  theme: string | null;
  maxMessageLength: number | null;
  defaultPubliclyVisible: boolean | null;
}

interface ProfileSettingsProps {
  user: User;
}

export default function ProfileSettings({ user }: ProfileSettingsProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    displayName: user.displayName || '',
    bio: user.bio || '',
    avatar: user.avatar || '',
    theme: user.theme || 'system',
    maxMessageLength: user.maxMessageLength || 666,
    defaultPubliclyVisible: user.defaultPubliclyVisible ?? false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarValidation, setAvatarValidation] = useState<{
    status: 'idle' | 'validating' | 'valid' | 'invalid';
    message: string;
  }>({ status: 'idle', message: '' });
  const [validatedAvatarUrl, setValidatedAvatarUrl] = useState<string | null>(user.avatar);

  // Apply theme immediately when changed
  useEffect(() => {
    const applyTheme = (themeValue: string) => {
      const root = document.documentElement;
      let effectiveTheme = themeValue;

      if (themeValue === 'system' || !themeValue) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        effectiveTheme = prefersDark ? 'dark' : 'light';
      }

      root.setAttribute('data-theme', effectiveTheme);
    };

    applyTheme(formData.theme);
  }, [formData.theme]);

  const validateAvatarUrl = async (url: string): Promise<boolean> => {
    if (!url || url.trim() === '') {
      return true;
    }

    return new Promise((resolve) => {
      const img = new Image();
      let timeoutId: NodeJS.Timeout;
      let resolved = false;

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
      };

      img.onload = () => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(true);
        }
      };

      img.onerror = () => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(false);
        }
      };

      img.src = url;
      
      timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      }, 5000);
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setAvatarValidation({ status: 'idle', message: '' });
    setLoading(true);

    if (formData.avatar && formData.avatar.trim() !== '') {
      setAvatarValidation({ status: 'validating', message: 'Validating avatar URL...' });
      
      const isValid = await validateAvatarUrl(formData.avatar);
      
      if (!isValid) {
        setAvatarValidation({
          status: 'invalid',
          message: 'Avatar URL did not render successfully. Please check the URL and try again.',
        });
        setError('Avatar URL validation failed. Please fix the avatar URL before saving.');
        setLoading(false);
        return;
      }
      
      setAvatarValidation({
        status: 'valid',
        message: 'Avatar URL validated successfully!',
      });
      setValidatedAvatarUrl(formData.avatar);
    } else {
      setValidatedAvatarUrl(null);
    }

    try {
      const response = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Update failed');
        setLoading(false);
        return;
      }

      setSuccess('Settings updated successfully!');
      setLoading(false);
      router.refresh();
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="card h-100">
      <div className="card-body">
        <h3 className="h5 mb-4">Profile Settings</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="displayName" className="form-label">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              className="form-control"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="bio" className="form-label">
              Bio
            </label>
            <textarea
              id="bio"
              className="form-control"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={4}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="theme" className="form-label">
              Theme
            </label>
            <div className="d-flex flex-column gap-2">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="theme"
                  id="theme-system"
                  value="system"
                  checked={formData.theme === 'system'}
                  onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                />
                <label className="form-check-label" htmlFor="theme-system">
                  System (follow OS preference)
                </label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="theme"
                  id="theme-light"
                  value="light"
                  checked={formData.theme === 'light'}
                  onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                />
                <label className="form-check-label" htmlFor="theme-light">
                  Light
                </label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="theme"
                  id="theme-dark"
                  value="dark"
                  checked={formData.theme === 'dark'}
                  onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                />
                <label className="form-check-label" htmlFor="theme-dark">
                  Dark
                </label>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="maxMessageLength" className="form-label">
              Maximum Message Length
            </label>
            <input
              id="maxMessageLength"
              type="number"
              className="form-control"
              min="1"
              max="10000"
              value={formData.maxMessageLength}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                if (!isNaN(value) && value > 0) {
                  setFormData({ ...formData, maxMessageLength: value });
                }
              }}
            />
            <div className="form-text">
              Maximum number of characters allowed per message (default: 666)
            </div>
          </div>

          <div className="mb-3">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="defaultPubliclyVisible"
                checked={formData.defaultPubliclyVisible}
                onChange={(e) => setFormData({ ...formData, defaultPubliclyVisible: e.target.checked })}
              />
              <label className="form-check-label" htmlFor="defaultPubliclyVisible">
                Default to Public Messages
              </label>
            </div>
            <div className="form-text">
              When enabled, new messages will be public by default. You can still change this for individual messages.
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="avatar" className="form-label">
              Avatar URL
            </label>
            <input
              id="avatar"
              type="url"
              className="form-control"
              value={formData.avatar}
              onChange={(e) => {
                const newValue = e.target.value;
                setFormData({ ...formData, avatar: newValue });
                setAvatarValidation({ status: 'idle', message: '' });
                if (newValue === user.avatar) {
                  setValidatedAvatarUrl(user.avatar);
                } else if (newValue !== validatedAvatarUrl) {
                  setValidatedAvatarUrl(null);
                }
              }}
            />
            {avatarValidation.status === 'validating' && (
              <div className="form-text">{avatarValidation.message}</div>
            )}
            {avatarValidation.status === 'valid' && (
              <div className="mt-2">
                <div className="alert alert-success alert-sm mb-2" role="alert">
                  ✓ {avatarValidation.message}
                </div>
                {validatedAvatarUrl && (
                  <div className="d-flex align-items-center gap-2">
                    <Avatar
                      src={validatedAvatarUrl}
                      alt={`${formData.displayName || user.username}'s avatar`}
                      size={60}
                    />
                    <small className="text-muted">Preview</small>
                  </div>
                )}
              </div>
            )}
            {avatarValidation.status === 'invalid' && (
              <div className="alert alert-danger alert-sm mt-2" role="alert">
                {avatarValidation.message}
              </div>
            )}
            {validatedAvatarUrl && avatarValidation.status === 'idle' && (
              <div className="mt-2">
                <div className="d-flex align-items-center gap-2">
                  <Avatar
                    src={validatedAvatarUrl}
                    alt={`${formData.displayName || user.username}'s avatar`}
                    size={60}
                  />
                  <small className="text-muted">
                    {formData.avatar === validatedAvatarUrl ? 'Current avatar' : 'Previous avatar'}
                  </small>
                </div>
              </div>
            )}
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
            className="btn btn-primary w-100"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

