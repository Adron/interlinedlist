'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/Avatar';
import { syncThemeToStorage } from '@/lib/theme/theme-sync';

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
  theme: string | null;
  maxMessageLength: number | null;
  pendingEmail?: string | null;
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
  });

  // Sync formData when user prop changes (after refresh)
  useEffect(() => {
    setFormData({
      displayName: user.displayName || '',
      bio: user.bio || '',
      avatar: user.avatar || '',
      theme: user.theme || 'system',
      maxMessageLength: user.maxMessageLength || 666,
    });
  }, [user.id, user.displayName, user.bio, user.avatar, user.theme, user.maxMessageLength]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailChangeLoading, setEmailChangeLoading] = useState(false);
  const [emailChangeError, setEmailChangeError] = useState('');
  const [emailChangeSuccess, setEmailChangeSuccess] = useState('');
  const [avatarValidation, setAvatarValidation] = useState<{
    status: 'idle' | 'validating' | 'valid' | 'invalid';
    message: string;
  }>({ status: 'idle', message: '' });
  const [validatedAvatarUrl, setValidatedAvatarUrl] = useState<string | null>(user.avatar);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const MAX_AVATAR_MB = 1.4;
  const MAX_AVATAR_BYTES = MAX_AVATAR_MB * 1024 * 1024;

  useEffect(() => {
    return () => {
      if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
    };
  }, [uploadPreviewUrl]);

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

    let avatarUrlToSave: string | null = null;

    if (uploadedFile) {
      if (uploadedFile.size > MAX_AVATAR_BYTES) {
        setError(`Uploaded image must be ${MAX_AVATAR_MB} MB or smaller.`);
        setLoading(false);
        return;
      }
      try {
        const fd = new FormData();
        fd.append('file', uploadedFile);
        const uploadRes = await fetch('/api/user/avatar/upload', { method: 'POST', body: fd });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          setError(uploadData.error || 'Avatar upload failed.');
          setLoading(false);
          return;
        }
        avatarUrlToSave = uploadData.url;
        setUploadedFile(null);
      } catch {
        setError('Avatar upload failed.');
        setLoading(false);
        return;
      }
    } else if (formData.avatar && formData.avatar.trim() !== '') {
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
      setAvatarValidation({ status: 'validating', message: 'Saving avatar to storage...' });
      try {
        const fromUrlRes = await fetch('/api/user/avatar/from-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: formData.avatar.trim() }),
        });
        const fromUrlData = await fromUrlRes.json();
        if (!fromUrlRes.ok) {
          setError(fromUrlData.error || 'Failed to save avatar from URL.');
          setAvatarValidation({ status: 'idle', message: '' });
          setLoading(false);
          return;
        }
        avatarUrlToSave = fromUrlData.url;
        setAvatarValidation({ status: 'valid', message: 'Avatar URL saved to your storage.' });
        setValidatedAvatarUrl(avatarUrlToSave);
      } catch {
        setError('Failed to save avatar from URL.');
        setAvatarValidation({ status: 'idle', message: '' });
        setLoading(false);
        return;
      }
    } else {
      setValidatedAvatarUrl(null);
    }

    try {
      const payload = {
        ...formData,
        ...(avatarUrlToSave !== null ? { avatar: avatarUrlToSave } : {}),
      };
      const response = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Update failed');
        setLoading(false);
        return;
      }

      // Update form state immediately with the response data
      if (data.user) {
        setFormData({
          displayName: data.user.displayName || '',
          bio: data.user.bio || '',
          avatar: data.user.avatar || '',
          theme: data.user.theme || 'system',
          maxMessageLength: data.user.maxMessageLength || 666,
        });
        setValidatedAvatarUrl(data.user.avatar || null);
      }

      // Sync theme to localStorage if theme was updated
      if (formData.theme !== undefined) {
        syncThemeToStorage(formData.theme);
      }

      setSuccess('Settings updated successfully!');
      setLoading(false);
      router.refresh();
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleChangeEmailRequest = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmailChangeError('');
    setEmailChangeSuccess('');
    setEmailChangeLoading(true);

    try {
      const response = await fetch('/api/user/change-email/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newEmail: newEmail.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setEmailChangeError(data.error || 'Failed to send verification email');
        setEmailChangeLoading(false);
        return;
      }

      setEmailChangeSuccess(data.message || 'Verification email sent. Check your inbox.');
      setNewEmail('');
      setEmailChangeLoading(false);
      router.refresh();
    } catch (err) {
      setEmailChangeError('An error occurred. Please try again.');
      setEmailChangeLoading(false);
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
            <label className="form-label">Email</label>
            <p className="form-control-plaintext text-muted small mb-2">
              Current: {user.email}
            </p>
            {user.pendingEmail ? (
              <div className="alert alert-info py-2 mb-2" role="alert">
                Verification email sent to <strong>{user.pendingEmail}</strong>. Check your inbox and click the link to complete the change.
              </div>
            ) : (
              <form onSubmit={handleChangeEmailRequest} className="d-flex flex-column gap-2">
                <input
                  type="email"
                  className="form-control"
                  placeholder="Enter new email address"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={emailChangeLoading}
                  required
                />
                <small className="form-text text-muted">
                  We&apos;ll send a verification link to your new email. Click it to complete the change.
                </small>
                {emailChangeError && (
                  <div className="alert alert-danger py-2" role="alert">
                    {emailChangeError}
                  </div>
                )}
                {emailChangeSuccess && (
                  <div className="alert alert-success py-2" role="alert">
                    {emailChangeSuccess}
                  </div>
                )}
                <button
                  type="submit"
                  className="btn btn-outline-primary btn-sm align-self-start"
                  disabled={emailChangeLoading}
                >
                  {emailChangeLoading ? 'Sending...' : 'Send verification email'}
                </button>
              </form>
            )}
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
            <div className="form-text mb-2">
              Or upload an image below (max {MAX_AVATAR_MB} MB). Images from URL are saved to your storage and resized if over {MAX_AVATAR_MB} MB.
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="avatarUpload" className="form-label">
              Upload avatar image
            </label>
            <input
              id="avatarUpload"
              type="file"
              className="form-control"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (uploadPreviewUrl) {
                  URL.revokeObjectURL(uploadPreviewUrl);
                  setUploadPreviewUrl(null);
                }
                if (file) {
                  if (file.size > MAX_AVATAR_BYTES) {
                    setError(`File must be ${MAX_AVATAR_MB} MB or smaller.`);
                    e.target.value = '';
                    return;
                  }
                  setError('');
                  setUploadedFile(file);
                  setUploadPreviewUrl(URL.createObjectURL(file));
                } else {
                  setUploadedFile(null);
                  setUploadPreviewUrl(null);
                }
              }}
            />
            <div className="form-text">
              Max {MAX_AVATAR_MB} MB. JPEG, PNG, or WebP. Image will be resized if needed.
            </div>
            {uploadedFile && uploadPreviewUrl && (
              <div className="mt-2 d-flex align-items-center gap-2">
                <Avatar
                  src={uploadPreviewUrl}
                  alt="Preview"
                  size={48}
                />
                <small className="text-muted">{uploadedFile.name}</small>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => {
                    if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
                    setUploadPreviewUrl(null);
                    setUploadedFile(null);
                    const el = document.getElementById('avatarUpload') as HTMLInputElement;
                    if (el) el.value = '';
                  }}
                >
                  Remove
                </button>
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

