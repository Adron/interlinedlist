'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { generateSlug } from '@/lib/organizations/utils';
import { Organization } from '@/lib/types';

interface EditOrganizationFormProps {
  organization: Organization;
  onSuccess?: () => void;
}

export default function EditOrganizationForm({ organization, onSuccess }: EditOrganizationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: organization.name,
    description: organization.description || '',
    avatar: organization.avatar || '',
    isPublic: organization.isPublic,
  });
  const [slugPreview, setSlugPreview] = useState(organization.slug);

  useEffect(() => {
    setFormData({
      name: organization.name,
      description: organization.description || '',
      avatar: organization.avatar || '',
      isPublic: organization.isPublic,
    });
    setSlugPreview(organization.slug);
  }, [organization]);

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
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: 'PUT',
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
        throw new Error(data.error || 'Failed to update organization');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        // Redirect to organization detail page
        router.push(`/organizations/${data.organization.slug}`);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update organization');
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
          disabled={loading || organization.isSystem}
          placeholder="My Organization"
        />
        {organization.isSystem && (
          <small className="text-muted d-block mt-1">
            System organizations cannot be renamed.
          </small>
        )}
        {slugPreview && !organization.isSystem && (
          <small className="text-muted d-block mt-1">
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
            disabled={loading || organization.isSystem}
          />
          <label className="form-check-label" htmlFor="isPublic">
            Public organization (anyone can see and join)
          </label>
        </div>
        {organization.isSystem && (
          <small className="text-muted d-block mt-1">
            System organizations cannot be made private.
          </small>
        )}
        {!organization.isSystem && (
          <small className="text-muted d-block mt-1">
            Private organizations require invitations to join
          </small>
        )}
      </div>

      <div className="d-flex gap-2">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !formData.name.trim()}
        >
          {loading ? 'Saving...' : 'Save Changes'}
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
