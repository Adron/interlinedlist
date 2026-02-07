'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface MessageSettingsSectionProps {
  defaultPubliclyVisible: boolean | null;
  showAdvancedPostSettings: boolean | null;
}

export default function MessageSettingsSection({ 
  defaultPubliclyVisible: initialDefaultPubliclyVisible,
  showAdvancedPostSettings: initialShowAdvancedPostSettings,
}: MessageSettingsSectionProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    defaultPubliclyVisible: initialDefaultPubliclyVisible ?? false,
    showAdvancedPostSettings: initialShowAdvancedPostSettings ?? false,
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
        body: JSON.stringify({
          defaultPubliclyVisible: formData.defaultPubliclyVisible,
          showAdvancedPostSettings: formData.showAdvancedPostSettings,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Update failed');
        setLoading(false);
        return;
      }

      setSuccess('Message settings updated successfully!');
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
        <h3 className="h5 mb-4">Message Settings</h3>
        
        <form onSubmit={handleSubmit}>
          {/* Default to Public Messages */}
          <div className="mb-4">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="defaultPubliclyVisible"
                checked={formData.defaultPubliclyVisible}
                onChange={(e) => setFormData({ ...formData, defaultPubliclyVisible: e.target.checked })}
                disabled={loading}
              />
              <label className="form-check-label" htmlFor="defaultPubliclyVisible">
                Default to Public Messages
              </label>
            </div>
            <div className="form-text">
              When enabled, new messages will be public by default. You can still change this for individual messages.
            </div>
          </div>

          {/* Show Advanced Post Settings */}
          <div className="mb-4">
            <label className="form-label">Advanced Post Settings</label>
            <div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="showAdvancedPostSettings"
                  checked={formData.showAdvancedPostSettings === true}
                  onChange={(e) => setFormData({ ...formData, showAdvancedPostSettings: e.target.checked })}
                  disabled={loading}
                />
                <label className="form-check-label" htmlFor="showAdvancedPostSettings">
                  Show advanced post settings menu by default
                </label>
              </div>
            </div>
            <small className="form-text text-muted">
              When enabled, the advanced post settings menu (thread, image, video, organization, scheduled) will be visible by default in the message input box
            </small>
          </div>

          {/* Error and Success Messages */}
          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              {error}
              <button
                type="button"
                className="btn-close"
                onClick={() => setError('')}
                aria-label="Close"
              ></button>
            </div>
          )}

          {success && (
            <div className="alert alert-success alert-dismissible fade show" role="alert">
              {success}
              <button
                type="button"
                className="btn-close"
                onClick={() => setSuccess('')}
                aria-label="Close"
              ></button>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
