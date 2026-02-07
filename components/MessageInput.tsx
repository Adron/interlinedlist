'use client';

import { useState, FormEvent, useRef, useEffect } from 'react';

interface MessageInputProps {
  maxLength: number;
  defaultPubliclyVisible?: boolean;
  showAdvancedPostSettings?: boolean;
  onSubmit?: () => void;
}

export default function MessageInput({ maxLength, defaultPubliclyVisible = false, showAdvancedPostSettings = false, onSubmit }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [publiclyVisible, setPubliclyVisible] = useState(defaultPubliclyVisible);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(showAdvancedPostSettings);
  const [updatingSetting, setUpdatingSetting] = useState(false);
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

  // Synchronize showSettingsMenu with prop
  useEffect(() => {
    setShowSettingsMenu(showAdvancedPostSettings);
  }, [showAdvancedPostSettings]);

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
      setLoading(false); // Reset loading state so button is enabled for next post
      
      // Trigger refresh of message list
      window.dispatchEvent(new Event('messageAdded'));
      
      // Call onSubmit callback if provided
      onSubmit?.();
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const remainingChars = maxLength - content.length;
  const isNearLimit = remainingChars < 50;
  const isOverLimit = remainingChars < 0;

  const toggleSettingsMenu = async () => {
    const newValue = !showSettingsMenu;
    const previousValue = showSettingsMenu;
    
    // Clear any previous errors
    setError('');
    
    // Optimistically update UI
    setShowSettingsMenu(newValue);
    setUpdatingSetting(true);

    try {
      const response = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          showAdvancedPostSettings: newValue,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Revert on error
        setShowSettingsMenu(previousValue);
        setError(data.error || 'Failed to update setting');
      } else {
        // Update state with the persisted value from the database
        // This ensures we're using the actual saved value
        if (data.user && typeof data.user.showAdvancedPostSettings === 'boolean') {
          setShowSettingsMenu(data.user.showAdvancedPostSettings);
        }
      }
    } catch (err) {
      // Revert on error
      setShowSettingsMenu(previousValue);
      setError('Failed to update setting. Please try again.');
    } finally {
      setUpdatingSetting(false);
    }
  };

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
              <div className="d-flex align-items-center gap-2">
                <span
                  className={`small ${isOverLimit ? 'text-danger' : isNearLimit ? 'text-warning' : 'text-muted'}`}
                >
                  {remainingChars} characters remaining
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-link p-1 text-muted"
                  onClick={toggleSettingsMenu}
                  aria-label="Posting options"
                  disabled={updatingSetting}
                  style={{ 
                    border: 'none',
                    lineHeight: 1,
                    minWidth: 'auto',
                    transition: 'transform 0.3s ease-in-out',
                  }}
                >
                  <i 
                    className="bx bx-cog" 
                    style={{ 
                      fontSize: '1.1rem',
                      transform: showSettingsMenu ? 'rotate(90deg)' : 'rotate(0deg)',
                      display: 'inline-block',
                      transition: 'transform 0.3s ease-in-out',
                    }}
                  ></i>
                </button>
                {showSettingsMenu && (
                  <div 
                    className="d-flex align-items-center gap-2"
                    style={{
                      animation: 'slideIn 0.3s ease-in-out',
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-sm btn-link p-1 text-muted"
                      disabled
                      aria-label="Thread"
                      style={{ 
                        border: 'none',
                        lineHeight: 1,
                        minWidth: 'auto',
                      }}
                      title="Thread"
                    >
                      <i className="bx bx-yarn" style={{ fontSize: '1.1rem' }}></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-link p-1 text-muted"
                      disabled
                      aria-label="Image"
                      style={{ 
                        border: 'none',
                        lineHeight: 1,
                        minWidth: 'auto',
                      }}
                      title="Image"
                    >
                      <i className="bx bx-image" style={{ fontSize: '1.1rem' }}></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-link p-1 text-muted"
                      disabled
                      aria-label="Video"
                      style={{ 
                        border: 'none',
                        lineHeight: 1,
                        minWidth: 'auto',
                      }}
                      title="Video"
                    >
                      <i className="bx bx-video" style={{ fontSize: '1.1rem' }}></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-link p-1 text-muted"
                      disabled
                      aria-label="Organization"
                      style={{ 
                        border: 'none',
                        lineHeight: 1,
                        minWidth: 'auto',
                      }}
                      title="Organization"
                    >
                      <i className="bx bx-group" style={{ fontSize: '1.1rem' }}></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-link p-1 text-muted"
                      disabled
                      aria-label="Scheduled"
                      style={{ 
                        border: 'none',
                        lineHeight: 1,
                        minWidth: 'auto',
                      }}
                      title="Scheduled"
                    >
                      <i className="bx bx-calendar-alt" style={{ fontSize: '1.1rem' }}></i>
                    </button>
                  </div>
                )}
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

