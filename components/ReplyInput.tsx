'use client';

import { useState, FormEvent } from 'react';

interface ReplyInputProps {
  parentId: string;
  maxLength?: number;
  defaultPubliclyVisible?: boolean;
  onReplySubmitted?: (message: unknown) => void;
  onCrossPostErrors?: (errors: Array<{ instanceName: string; error?: string }>) => void;
  placeholder?: string;
  className?: string;
}

export default function ReplyInput({
  parentId,
  maxLength = 666,
  defaultPubliclyVisible = true,
  onReplySubmitted,
  onCrossPostErrors,
  placeholder = 'Write a reply...',
  className = '',
}: ReplyInputProps) {
  const [content, setContent] = useState('');
  const [publiclyVisible, setPubliclyVisible] = useState(defaultPubliclyVisible);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (!content.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          publiclyVisible,
          parentId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to post reply');
        return;
      }

      const failures = data.crossPostResults?.filter(
        (r: { success: boolean; error?: string }) => !r.success && r.error
      );
      if (failures?.length > 0 && onCrossPostErrors) {
        onCrossPostErrors(
          failures.map((f: { instanceName: string; error?: string }) => ({
            instanceName: f.instanceName,
            error: f.error,
          }))
        );
      }

      setContent('');
      setPubliclyVisible(defaultPubliclyVisible);
      onReplySubmitted?.(data.data);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="d-flex flex-column gap-1">
        <textarea
          className="form-control form-control-sm"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          rows={2}
          maxLength={maxLength}
          disabled={loading}
          style={{ resize: 'none', fontSize: '0.9rem' }}
        />
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <label className="form-check form-check-inline mb-0" style={{ fontSize: '0.8rem' }}>
              <input
                type="checkbox"
                className="form-check-input"
                checked={publiclyVisible}
                onChange={(e) => setPubliclyVisible(e.target.checked)}
              />
              <span className="form-check-label text-muted">Public</span>
            </label>
            <span className="text-muted" style={{ fontSize: '0.75rem' }}>
              {content.length}/{maxLength}
            </span>
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={!content.trim() || loading}
          >
            {loading ? '...' : 'Reply'}
          </button>
        </div>
        {error && (
          <div className="text-danger small">{error}</div>
        )}
      </div>
    </form>
  );
}
