'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateSlug } from '@/lib/organizations/utils';

interface CreateOrganizationFormProps {
  onSuccess?: () => void;
}

export default function CreateOrganizationForm({ onSuccess }: CreateOrganizationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    avatar: '',
    isPublic: true,
  });
  const [slugPreview, setSlugPreview] = useState('');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData({ ...formData, name });
    setSlugPreview(generateSlug(name));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          avatar: formData.avatar.trim() || undefined,
          isPublic: formData.isPublic,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create organization');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        // Redirect to organizations list page to show the new organization
        // Use window.location to force a full page refresh to ensure button stays visible
        window.location.href = '/organizations';
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="mb-3">
        <label htmlFor="name" className="form-label">
          Organization Name <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          className="form-control"
          id="name"
          value={formData.name}
          onChange={handleNameChange}
          required
          disabled={loading}
          placeholder="My Organization"
        />
        {slugPreview && (
          <small className="text-muted">
            URL: <code>/organizations/{slugPreview}</code>
          </small>
        )}
      </div>

      <div className="mb-3">
        <label htmlFor="description" className="form-label">
          Description
        </label>
        <textarea
          className="form-control"
          id="description"
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          disabled={loading}
          placeholder="What is this organization about?"
        />
      </div>

      <div className="mb-3">
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
          placeholder="https://example.com/avatar.jpg"
        />
      </div>

      <div className="mb-3">
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="isPublic"
            checked={formData.isPublic}
            onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
            disabled={loading}
          />
          <label className="form-check-label" htmlFor="isPublic">
            Public organization (anyone can see and join)
          </label>
        </div>
        <small className="text-muted">
          Private organizations require invitations to join
        </small>
      </div>

      <div className="d-flex gap-2">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !formData.name.trim()}
        >
          {loading ? 'Creating...' : 'Create Organization'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
