'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
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
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

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
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="displayName" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
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
        <label htmlFor="bio" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
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
        <label htmlFor="avatar" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Avatar URL
        </label>
        <input
          id="avatar"
          type="url"
          value={formData.avatar}
          onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
          style={{ width: '100%', padding: '8px', boxSizing: 'border-box', maxWidth: '400px' }}
        />
      </div>

      {error && (
        <div style={{ color: 'red', marginBottom: '15px', padding: '10px', backgroundColor: '#ffe6e6', borderRadius: '5px' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ color: 'green', marginBottom: '15px', padding: '10px', backgroundColor: '#e6ffe6', borderRadius: '5px' }}>
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}

