'use client';

import { useState, FormEvent, useRef, useEffect } from 'react';

const MAX_IMAGES = 6;

interface Identity {
  id: string;
  provider: string;
  providerUsername: string | null;
}

interface MessageInputProps {
  maxLength: number;
  defaultPubliclyVisible?: boolean;
  showAdvancedPostSettings?: boolean;
  onSubmit?: () => void;
}

function getMastodonInstanceName(provider: string): string {
  return provider.startsWith('mastodon:') ? provider.replace('mastodon:', '') : provider;
}

export default function MessageInput({ maxLength, defaultPubliclyVisible = false, showAdvancedPostSettings = false, onSubmit }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [publiclyVisible, setPubliclyVisible] = useState(defaultPubliclyVisible);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(showAdvancedPostSettings);
  const [updatingSetting, setUpdatingSetting] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [mastodonIdentities, setMastodonIdentities] = useState<Identity[]>([]);
  const [blueskyIdentity, setBlueskyIdentity] = useState<Identity | null>(null);
  const [selectedMastodonIds, setSelectedMastodonIds] = useState<Set<string>>(new Set());
  const [crossPostToBluesky, setCrossPostToBluesky] = useState(false);
  const [crossPostResults, setCrossPostResults] = useState<Array<{ providerId: string; instanceName: string; success: boolean; error?: string }> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageUrlsWhenModalOpenedRef = useRef<string[]>([]);
  const videoUrlsWhenModalOpenedRef = useRef<string[]>([]);

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

  // Fetch identities (Mastodon, Bluesky) on mount
  useEffect(() => {
    fetch('/api/user/identities')
      .then((res) => res.json())
      .then((data) => {
        if (data.identities) {
          const mastodon = data.identities.filter((i: Identity) => i.provider?.startsWith?.('mastodon:'));
          const bluesky = data.identities.find((i: Identity) => i.provider === 'bluesky') ?? null;
          setMastodonIdentities(mastodon);
          setBlueskyIdentity(bluesky);
        }
      })
      .catch(() => {});
  }, []);

  const toggleMastodon = (id: string) => {
    setSelectedMastodonIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setCrossPostResults(null);
  };

  const toggleBluesky = () => {
    setCrossPostToBluesky((prev) => !prev);
    setCrossPostResults(null);
  };

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
      setCrossPostResults(null);
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          publiclyVisible,
          ...(imageUrls.length > 0 && { imageUrls }),
          ...(videoUrls.length > 0 && { videoUrls }),
          ...(selectedMastodonIds.size > 0 && { mastodonProviderIds: Array.from(selectedMastodonIds) }),
          ...(crossPostToBluesky && { crossPostToBluesky: true }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to post message');
        setLoading(false);
        return;
      }

      // Show cross-post results if any
      if (data.crossPostResults?.length) {
        setCrossPostResults(data.crossPostResults);
      }

      // Clear form and attached images/videos
      setContent('');
      setPubliclyVisible(defaultPubliclyVisible);
      setImageUrls([]);
      setPendingFiles([]);
      setVideoUrls([]);
      setPendingVideoFile(null);
      setCrossPostToBluesky(false);
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
                    className="d-flex flex-wrap align-items-center gap-2"
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
                      aria-label="Image"
                      style={{ 
                        border: 'none',
                        lineHeight: 1,
                        minWidth: 'auto',
                      }}
                      title="Add images (up to 6; large images resized to 1200×1200, 1.4 MB)"
                      onClick={() => {
                        imageUrlsWhenModalOpenedRef.current = [...imageUrls];
                        setShowImageModal(true);
                      }}
                    >
                      <i className="bx bx-image" style={{ fontSize: '1.1rem' }}></i>
                      {imageUrls.length > 0 && (
                        <span className="ms-1 small">({imageUrls.length})</span>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-link p-1 text-muted"
                      aria-label="Video"
                      style={{ 
                        border: 'none',
                        lineHeight: 1,
                        minWidth: 'auto',
                      }}
                      title="Add video (1 video, 3 MB or less)"
                      onClick={() => {
                        videoUrlsWhenModalOpenedRef.current = [...videoUrls];
                        setShowVideoModal(true);
                      }}
                    >
                      <i className="bx bx-video" style={{ fontSize: '1.1rem' }}></i>
                      {videoUrls.length > 0 && (
                        <span className="ms-1 small">(1)</span>
                      )}
                    </button>
                    {mastodonIdentities.map((m) => {
                      const instanceName = getMastodonInstanceName(m.provider);
                      const isSelected = selectedMastodonIds.has(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          className={`btn btn-sm btn-link p-1 ${isSelected ? 'text-primary' : 'text-muted'}`}
                          aria-label={`Cross-post to ${instanceName}`}
                          style={{ 
                            border: 'none',
                            lineHeight: 1,
                            minWidth: 'auto',
                          }}
                          title={m.providerUsername ? `${instanceName} (@${m.providerUsername})` : instanceName}
                          onClick={() => toggleMastodon(m.id)}
                        >
                          <i className="bx bx-broadcast" style={{ fontSize: '1.1rem' }}></i>
                        </button>
                      );
                    })}
                    {blueskyIdentity && (
                      <button
                        type="button"
                        className={`btn btn-sm btn-link p-1 ${crossPostToBluesky ? 'text-primary' : 'text-muted'}`}
                        aria-label="Cross-post to Bluesky"
                        style={{ 
                          border: 'none',
                          lineHeight: 1,
                          minWidth: 'auto',
                        }}
                        title={blueskyIdentity.providerUsername ? `Bluesky (@${blueskyIdentity.providerUsername})` : 'Bluesky'}
                        onClick={toggleBluesky}
                      >
                        <i className="bx bxl-bluesky" style={{ fontSize: '1.1rem' }}></i>
                      </button>
                    )}
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

          {imageUrls.length > 0 && (
            <div className="mb-2 d-flex flex-wrap gap-1 align-items-center">
              <small className="text-muted">Attached: {imageUrls.length} image(s)</small>
            </div>
          )}

          {videoUrls.length > 0 && (
            <div className="mb-2 d-flex flex-wrap gap-1 align-items-center">
              <small className="text-muted">Attached: 1 video</small>
            </div>
          )}

          {(selectedMastodonIds.size > 0 || crossPostToBluesky) && (
            <div className="mb-2 d-flex flex-wrap gap-1 align-items-center">
              <small className="text-muted">
                Posting to: {[
                  ...mastodonIdentities.filter((m) => selectedMastodonIds.has(m.id)).map((m) => getMastodonInstanceName(m.provider)),
                  ...(crossPostToBluesky ? ['Bluesky'] : []),
                ].join(', ')}
              </small>
            </div>
          )}

          {crossPostResults && crossPostResults.length > 0 && (
            <div className="mb-2">
              {crossPostResults.filter((r) => r.success).length > 0 && (
                <small className="text-success d-block">
                  Posted to: {crossPostResults.filter((r) => r.success).map((r) => r.instanceName).join(', ')}
                </small>
              )}
              {crossPostResults.filter((r) => !r.success).length > 0 && (
                <small className="text-danger d-block">
                  Failed: {crossPostResults.filter((r) => !r.success).map((r) => `${r.instanceName}: ${r.error || 'Unknown error'}`).join('; ')}
                </small>
              )}
            </div>
          )}

          {error && (
            <div className="alert alert-danger mb-3" role="alert">
              {error}
            </div>
          )}

          {/* Image picker modal */}
          {showImageModal && (
            <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} role="dialog">
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Add images</h5>
                    <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowImageModal(false)} />
                  </div>
                  <div className="modal-body">
                    <p className="small text-muted mb-2">Up to {MAX_IMAGES} images. Large images are resized to fit (max 1200×1200, 1.4 MB).</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="form-control form-control-sm mb-3"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        const valid: File[] = [];
                        for (const f of files) {
                          if (pendingFiles.length + imageUrls.length + valid.length >= MAX_IMAGES) break;
                          valid.push(f);
                        }
                        setPendingFiles((prev) => [...prev, ...valid].slice(0, MAX_IMAGES - imageUrls.length));
                        e.target.value = '';
                      }}
                    />
                    {pendingFiles.length > 0 && (
                      <div className="mb-2">
                        <small className="text-muted d-block mb-1">Selected: {pendingFiles.length}</small>
                        <div className="d-flex flex-wrap gap-1">
                          {pendingFiles.map((f, i) => (
                            <span key={i} className="badge bg-secondary d-inline-flex align-items-center gap-1">
                              {f.name}
                              <button
                                type="button"
                                className="btn-close btn-close-white"
                                style={{ fontSize: '0.6rem' }}
                                aria-label="Remove"
                                onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                              />
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {imageUrls.length > 0 && (
                      <div className="mb-2">
                        <small className="text-muted d-block mb-1">Uploaded: {imageUrls.length}</small>
                        <div className="d-flex flex-wrap gap-1">
                          {imageUrls.map((url, i) => (
                            <div key={i} className="position-relative">
                              <img src={url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }} />
                              <button
                                type="button"
                                className="btn-close position-absolute top-0 start-0"
                                style={{ fontSize: '0.5rem' }}
                                aria-label="Remove"
                                onClick={() => setImageUrls((prev) => prev.filter((_, j) => j !== i))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowImageModal(false)}>
                      Done
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => {
                        setImageUrls([...imageUrlsWhenModalOpenedRef.current]);
                        setPendingFiles([]);
                        setShowImageModal(false);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={pendingFiles.length === 0 || uploadingImages}
                      onClick={async () => {
                        if (pendingFiles.length === 0) return;
                        setUploadingImages(true);
                        const urls: string[] = [];
                        for (const file of pendingFiles) {
                          const fd = new FormData();
                          fd.append('file', file);
                          try {
                            const res = await fetch('/api/messages/images/upload', { method: 'POST', body: fd });
                            const data = await res.json();
                            if (res.ok && data.url) urls.push(data.url);
                          } catch {
                            // per-file errors ignored; urls only includes successes
                          }
                        }
                        setImageUrls((prev) => [...prev, ...urls].slice(0, MAX_IMAGES));
                        setPendingFiles([]);
                        setUploadingImages(false);
                      }}
                    >
                      {uploadingImages ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Video picker modal */}
          {showVideoModal && (
            <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} role="dialog">
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Add video</h5>
                    <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowVideoModal(false)} />
                  </div>
                  <div className="modal-body">
                    <p className="small text-muted mb-2">1 video, 3 MB or less.</p>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      className="form-control form-control-sm mb-3"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        setPendingVideoFile(f ?? null);
                        e.target.value = '';
                      }}
                    />
                    {pendingVideoFile && (
                      <div className="mb-2">
                        <small className="text-muted d-block mb-1">Selected</small>
                        <span className="badge bg-secondary d-inline-flex align-items-center gap-1">
                          {pendingVideoFile.name}
                          <button
                            type="button"
                            className="btn-close btn-close-white"
                            style={{ fontSize: '0.6rem' }}
                            aria-label="Remove"
                            onClick={() => setPendingVideoFile(null)}
                          />
                        </span>
                      </div>
                    )}
                    {videoUrls.length > 0 && (
                      <div className="mb-2">
                        <small className="text-muted d-block mb-1">Uploaded</small>
                        <div className="d-flex flex-wrap gap-1 align-items-center">
                          <span className="small">1 video</span>
                          <button
                            type="button"
                            className="btn btn-close btn-sm"
                            aria-label="Remove"
                            onClick={() => setVideoUrls([])}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowVideoModal(false)}>
                      Done
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => {
                        setVideoUrls([...videoUrlsWhenModalOpenedRef.current]);
                        setPendingVideoFile(null);
                        setShowVideoModal(false);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={!pendingVideoFile || uploadingVideo || videoUrls.length >= 1}
                      onClick={async () => {
                        if (!pendingVideoFile) return;
                        setUploadingVideo(true);
                        try {
                          const fd = new FormData();
                          fd.append('file', pendingVideoFile);
                          const res = await fetch('/api/messages/videos/upload', { method: 'POST', body: fd });
                          const data = await res.json();
                          if (res.ok && data.url) {
                            setVideoUrls([data.url]);
                            setPendingVideoFile(null);
                          } else {
                            setError(data.error || 'Failed to upload video');
                          }
                        } catch {
                          setError('Failed to upload video');
                        }
                        setUploadingVideo(false);
                      }}
                    >
                      {uploadingVideo ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>
                </div>
              </div>
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

