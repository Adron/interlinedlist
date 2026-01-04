'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
}

interface SettingsFormProps {
  user: User;
}

export default function SettingsForm({ user }: SettingsFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    displayName: user.displayName || '',
    bio: user.bio || '',
    avatar: user.avatar || '',
    theme: user.theme || 'system',
    maxMessageLength: user.maxMessageLength || 666,
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
      return true; // Empty URL is valid (will clear avatar)
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
      
      // Timeout after 5 seconds
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

    // Validate avatar URL if provided
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
      // Clear avatar if URL is empty
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
    <>
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="displayName" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--color-text)' }}>
          Display Name
        </label>
        <input
          id="displayName"
          type="text"
          value={formData.displayName}
          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
          style={{ width: '100%', padding: '8px', boxSizing: 'border-box', maxWidth: '400px' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="bio" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--color-text)' }}>
          Bio
        </label>
        <textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          rows={4}
          style={{ width: '100%', padding: '8px', boxSizing: 'border-box', maxWidth: '400px' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="theme" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--color-text)' }}>
          Theme
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              name="theme"
              value="system"
              checked={formData.theme === 'system'}
              onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
              style={{ marginRight: '8px' }}
            />
            <span>System (follow OS preference)</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              name="theme"
              value="light"
              checked={formData.theme === 'light'}
              onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
              style={{ marginRight: '8px' }}
            />
            <span>Light</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              name="theme"
              value="dark"
              checked={formData.theme === 'dark'}
              onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
              style={{ marginRight: '8px' }}
            />
            <span>Dark</span>
          </label>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="maxMessageLength" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--color-text)' }}>
          Maximum Message Length
        </label>
        <input
          id="maxMessageLength"
          type="number"
          min="1"
          max="10000"
          value={formData.maxMessageLength}
          onChange={(e) => {
            const value = parseInt(e.target.value, 10);
            if (!isNaN(value) && value > 0) {
              setFormData({ ...formData, maxMessageLength: value });
            }
          }}
          style={{ width: '100%', padding: '8px', boxSizing: 'border-box', maxWidth: '400px' }}
        />
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginTop: '5px' }}>
          Maximum number of characters allowed per message (default: 666)
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="avatar" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--color-text)' }}>
          Avatar URL
        </label>
        <input
          id="avatar"
          type="url"
          value={formData.avatar}
          onChange={(e) => {
            const newValue = e.target.value;
            setFormData({ ...formData, avatar: newValue });
            setAvatarValidation({ status: 'idle', message: '' });
            // If user reverts to original avatar, show it again
            if (newValue === user.avatar) {
              setValidatedAvatarUrl(user.avatar);
            } else if (newValue !== validatedAvatarUrl) {
              // Clear preview if URL changed from validated one
              setValidatedAvatarUrl(null);
            }
          }}
          style={{ width: '100%', padding: '8px', boxSizing: 'border-box', maxWidth: '400px' }}
        />
        {avatarValidation.status === 'validating' && (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginTop: '5px' }}>
            {avatarValidation.message}
          </p>
        )}
        {avatarValidation.status === 'valid' && (
          <div style={{ marginTop: '15px' }}>
            <p style={{ color: 'var(--color-success)', fontSize: '0.9rem', marginBottom: '10px' }}>
              ✓ {avatarValidation.message}
            </p>
            {validatedAvatarUrl && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <Avatar
                  src={validatedAvatarUrl}
                  alt={`${formData.displayName || user.username}'s avatar`}
                  size={80}
                />
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                  Preview of your avatar
                </p>
              </div>
            )}
          </div>
        )}
        {avatarValidation.status === 'invalid' && (
          <div style={{ color: 'var(--color-error)', fontSize: '0.9rem', marginTop: '5px', padding: '8px', backgroundColor: 'var(--color-error-bg)', borderRadius: '5px' }}>
            {avatarValidation.message}
          </div>
        )}
        {validatedAvatarUrl && avatarValidation.status === 'idle' && (
          <div style={{ marginTop: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <Avatar
                src={validatedAvatarUrl}
                alt={`${formData.displayName || user.username}'s avatar`}
                size={80}
              />
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                {formData.avatar === validatedAvatarUrl ? 'Current avatar preview' : 'Previous avatar preview'}
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ color: 'var(--color-error)', marginBottom: '15px', padding: '10px', backgroundColor: 'var(--color-error-bg)', borderRadius: '5px' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ color: 'var(--color-success)', marginBottom: '15px', padding: '10px', backgroundColor: 'var(--color-success-bg)', borderRadius: '5px' }}>
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: 'var(--color-button-primary)',
          color: 'var(--color-button-text)',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Saving...' : 'Save Changes'}
      </button>
    </form>

      <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--color-border)' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text)' }}>Security</h2>
        <div style={{ 
          backgroundColor: 'var(--color-bg-secondary)', 
          padding: '1.5rem', 
          borderRadius: '8px',
          maxWidth: '400px'
        }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--color-text)' }}>
            Change Password
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: '1.6' }}>
            If you want to change your password, we'll send you a secure link to reset it via email.
          </p>
          <Link
            href="/forgot-password"
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              backgroundColor: 'var(--color-button-secondary)',
              color: 'var(--color-button-text)',
              textDecoration: 'none',
              borderRadius: '5px',
              fontSize: '0.9rem',
              fontWeight: '500',
            }}
          >
            Reset Password
          </Link>
        </div>
      </div>
    </>
  );
}

