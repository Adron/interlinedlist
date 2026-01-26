'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface ViewPreferencesSectionProps {
  messagesPerPage: number;
  viewingPreference: string;
  showPreviews: boolean;
}

export default function ViewPreferencesSection({ 
  messagesPerPage: initialMessagesPerPage,
  viewingPreference: initialViewingPreference,
  showPreviews: initialShowPreviews
}: ViewPreferencesSectionProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    messagesPerPage: initialMessagesPerPage || 20,
    viewingPreference: initialViewingPreference || 'all_messages',
    showPreviews: initialShowPreviews ?? true,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validate messagesPerPage
    const messagesPerPageNum = parseInt(String(formData.messagesPerPage), 10);
    if (isNaN(messagesPerPageNum) || messagesPerPageNum < 10 || messagesPerPageNum > 30) {
      setError('Messages per page must be between 10 and 30');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messagesPerPage: messagesPerPageNum,
          viewingPreference: formData.viewingPreference,
          showPreviews: formData.showPreviews,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Update failed');
        setLoading(false);
        return;
      }

      setSuccess('View preferences updated successfully!');
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
        <h3 className="h5 mb-4">View Preferences</h3>
        
        <form onSubmit={handleSubmit}>
          {/* Messages per page */}
          <div className="mb-4">
            <label htmlFor="messagesPerPage" className="form-label">
              Messages per page
            </label>
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => {
                  if (formData.messagesPerPage > 10) {
                    setFormData({ ...formData, messagesPerPage: formData.messagesPerPage - 1 });
                  }
                }}
                disabled={formData.messagesPerPage <= 10 || loading}
              >
                <i className="bx bx-minus"></i>
              </button>
              <input
                type="number"
                id="messagesPerPage"
                className="form-control text-center"
                style={{ maxWidth: '80px' }}
                min="10"
                max="30"
                value={formData.messagesPerPage}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  if (!isNaN(value) && value >= 10 && value <= 30) {
                    setFormData({ ...formData, messagesPerPage: value });
                  }
                }}
                disabled={loading}
              />
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => {
                  if (formData.messagesPerPage < 30) {
                    setFormData({ ...formData, messagesPerPage: formData.messagesPerPage + 1 });
                  }
                }}
                disabled={formData.messagesPerPage >= 30 || loading}
              >
                <i className="bx bx-plus"></i>
              </button>
            </div>
            <small className="form-text text-muted">
              Number of messages to display per page (10-30)
            </small>
          </div>

          {/* Viewing preference */}
          <div className="mb-4">
            <label htmlFor="viewingPreference" className="form-label">
              Viewing
            </label>
            <select
              id="viewingPreference"
              className="form-select"
              value={formData.viewingPreference}
              onChange={(e) => setFormData({ ...formData, viewingPreference: e.target.value })}
              disabled={loading}
            >
              <option value="my_messages">My Messages</option>
              <option value="all_messages">All Messages</option>
              <option value="followers_only">Followers Only</option>
              <option value="following_only">Following Only</option>
            </select>
            <small className="form-text text-muted">
              Choose which messages to display in your feed
            </small>
          </div>

          {/* Show previews */}
          <div className="mb-4">
            <label className="form-label">Show Previews</label>
            <div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="showPreviews"
                  id="showPreviewsYes"
                  checked={formData.showPreviews === true}
                  onChange={() => setFormData({ ...formData, showPreviews: true })}
                  disabled={loading}
                />
                <label className="form-check-label" htmlFor="showPreviewsYes">
                  Show
                </label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="showPreviews"
                  id="showPreviewsNo"
                  checked={formData.showPreviews === false}
                  onChange={() => setFormData({ ...formData, showPreviews: false })}
                  disabled={loading}
                />
                <label className="form-check-label" htmlFor="showPreviewsNo">
                  Don't
                </label>
              </div>
            </div>
            <small className="form-text text-muted">
              Whether to show link previews for messages
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
              'Save Preferences'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
