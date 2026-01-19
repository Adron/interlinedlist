'use client';

import { useState, FormEvent, useRef, useEffect } from 'react';

interface MessageInputProps {
  maxLength: number;
  defaultPubliclyVisible?: boolean;
  onSubmit: () => void;
}

export default function MessageInput({ maxLength, defaultPubliclyVisible = false, onSubmit }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [publiclyVisible, setPubliclyVisible] = useState(defaultPubliclyVisible);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  // Synchronize publiclyVisible state with prop
  useEffect(() => {
    setPubliclyVisible(defaultPubliclyVisible);
  }, [defaultPubliclyVisible]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!content.trim()) {
      setError('Message cannot be empty');
      setLoading(false);
      return;
    }

    if (content.length > maxLength) {
      setError(`Message exceeds maximum length of ${maxLength} characters`);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          publiclyVisible,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to post message');
        setLoading(false);
        return;
      }

      // Clear form
      setContent('');
      setPubliclyVisible(defaultPubliclyVisible);
      setError('');
      
      // Trigger refresh of message list
      window.dispatchEvent(new Event('messageAdded'));
      
      // Call onSubmit callback to hide the form
      onSubmit();
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const remainingChars = maxLength - content.length;
  const isNearLimit = remainingChars < 50;
  const isOverLimit = remainingChars < 0;

  return (
    <div className="card mb-3">
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <textarea
              ref={textareaRef}
              className="form-control"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              style={{
                resize: 'none',
                overflow: 'hidden',
                minHeight: '100px',
              }}
              maxLength={maxLength + 100} // Allow typing past limit to show error
            />
            <div className="d-flex justify-content-between align-items-center mt-2">
              <div>
                <span
                  className={`small ${isOverLimit ? 'text-danger' : isNearLimit ? 'text-warning' : 'text-muted'}`}
                >
                  {remainingChars} characters remaining
                </span>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="publiclyVisible"
                  checked={publiclyVisible}
                  onChange={(e) => setPubliclyVisible(e.target.checked)}
                />
                <label className="form-check-label small" htmlFor="publiclyVisible">
                  Public
                </label>
              </div>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger mb-3" role="alert">
              {error}
            </div>
          )}

          <div className="d-flex gap-2 justify-content-end">
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={loading || !content.trim() || isOverLimit}
            >
              {loading ? 'Posting...' : 'Post Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

