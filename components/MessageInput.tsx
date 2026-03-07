'use client';

import { useState, FormEvent, useRef, useEffect } from 'react';

const MAX_IMAGES = 8;

const RASTER_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function isRasterImage(file: File): boolean {
  return RASTER_TYPES.includes(file.type);
}

/** Rotate image (File or URL) by degrees (90, 180, or 270). Returns blob. */
async function rotateImageBlob(source: File | string, degrees: number): Promise<Blob> {
  const img = new Image();
  img.crossOrigin = 'anonymous';

  if (source instanceof File) {
    const url = URL.createObjectURL(source);
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      img.src = url;
    });
  } else {
    const res = await fetch(source);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      img.src = url;
    });
  }

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const swap = degrees === 90 || degrees === 270;
  const cw = swap ? h : w;
  const ch = swap ? w : h;

  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2d not available');

  const rad = (degrees * Math.PI) / 180;
  ctx.translate(cw / 2, ch / 2);
  ctx.rotate(rad);
  ctx.translate(-w / 2, -h / 2);
  ctx.drawImage(img, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
      'image/jpeg',
      0.9
    );
  });
}

/** Convert rotated blob to File for upload. */
function blobToFile(blob: Blob, name: string): File {
  const base = name.replace(/\.[^.]+$/, '') || name;
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
}

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

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
  const [pendingRotations, setPendingRotations] = useState<number[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [rotatingUrlIndex, setRotatingUrlIndex] = useState<number | null>(null);
  const [pendingPreviewUrls, setPendingPreviewUrls] = useState<string[]>([]);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [mastodonIdentities, setMastodonIdentities] = useState<Identity[]>([]);
  const [blueskyIdentity, setBlueskyIdentity] = useState<Identity | null>(null);
  const [linkedinIdentity, setLinkedinIdentity] = useState<Identity | null>(null);
  const [selectedMastodonIds, setSelectedMastodonIds] = useState<Set<string>>(new Set());
  const [crossPostToBluesky, setCrossPostToBluesky] = useState(false);
  const [crossPostToLinkedIn, setCrossPostToLinkedIn] = useState(false);
  const [crossPostResults, setCrossPostResults] = useState<Array<{ providerId: string; instanceName: string; success: boolean; error?: string }> | null>(null);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageUrlsWhenModalOpenedRef = useRef<string[]>([]);
  const videoUrlsWhenModalOpenedRef = useRef<string[]>([]);

  // Create/revoke object URLs for pending file previews
  useEffect(() => {
    const urls = pendingFiles.map((f) => URL.createObjectURL(f));
    setPendingPreviewUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [pendingFiles]);

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

  // When opening schedule modal, initialize draft from existing scheduledAt or default to 1 hour from now
  useEffect(() => {
    if (showScheduleModal) {
      const defaultDate = new Date(Date.now() + 60 * 60 * 1000);
      setScheduleDraft(scheduledAt ? toDatetimeLocal(scheduledAt) : toDatetimeLocal(defaultDate));
    }
  }, [showScheduleModal, scheduledAt]);

  // Fetch identities (Mastodon, Bluesky) on mount
  useEffect(() => {
    fetch('/api/user/identities')
      .then((res) => res.json())
      .then((data) => {
        if (data.identities) {
          const mastodon = data.identities.filter((i: Identity) => i.provider?.startsWith?.('mastodon:'));
          const bluesky = data.identities.find((i: Identity) => i.provider === 'bluesky') ?? null;
          const linkedin = data.identities.find((i: Identity) => i.provider === 'linkedin') ?? null;
          setMastodonIdentities(mastodon);
          setBlueskyIdentity(bluesky);
          setLinkedinIdentity(linkedin);
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

  const toggleLinkedIn = () => {
    setCrossPostToLinkedIn((prev) => !prev);
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
          ...(crossPostToLinkedIn && { crossPostToLinkedIn: true }),
          ...(scheduledAt && scheduledAt > new Date() && { scheduledAt: scheduledAt.toISOString() }),
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
      setCrossPostToLinkedIn(false);
      setScheduledAt(null);
      setShowScheduleModal(false);
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
                      title={`Add images (up to ${MAX_IMAGES}; large images resized to 1200×1200, 1.4 MB)`}
                      onClick={() => {
                        imageUrlsWhenModalOpenedRef.current = [...imageUrls];
                        setError('');
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
                      const hoverText = m.providerUsername
                        ? `Cross-post to Mastodon (${instanceName}) - @${m.providerUsername}`
                        : `Cross-post to Mastodon (${instanceName})`;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          className={`btn btn-sm btn-link p-1 ${isSelected ? 'text-primary' : 'text-muted'}`}
                          aria-label={hoverText}
                          style={{ 
                            border: 'none',
                            lineHeight: 1,
                            minWidth: 'auto',
                          }}
                          title={hoverText}
                          onClick={() => toggleMastodon(m.id)}
                        >
                          <i className="bx bxl-mastodon" style={{ fontSize: '1.1rem' }}></i>
                        </button>
                      );
                    })}
                    {blueskyIdentity && (
                      <button
                        type="button"
                        className={`btn btn-sm btn-link p-1 ${crossPostToBluesky ? 'text-primary' : 'text-muted'}`}
                        aria-label={`Cross-post to Bluesky${blueskyIdentity.providerUsername ? ` - @${blueskyIdentity.providerUsername}` : 'Cross-post to Bluesky'}`}
                        style={{ 
                          border: 'none',
                          lineHeight: 1,
                          minWidth: 'auto',
                        }}
                        title={`Cross-post to Bluesky${blueskyIdentity.providerUsername ? ` - @${blueskyIdentity.providerUsername}` : ''}`}
                        onClick={toggleBluesky}
                      >
                        <i className="bx bxl-bluesky" style={{ fontSize: '1.1rem' }}></i>
                      </button>
                    )}
                    {linkedinIdentity && (
                      <button
                        type="button"
                        className={`btn btn-sm btn-link p-1 ${crossPostToLinkedIn ? 'text-primary' : 'text-muted'}`}
                        aria-label={`Cross-post to LinkedIn${linkedinIdentity.providerUsername ? ` - ${linkedinIdentity.providerUsername}` : 'Cross-post to LinkedIn'}`}
                        style={{ 
                          border: 'none',
                          lineHeight: 1,
                          minWidth: 'auto',
                        }}
                        title={`Cross-post to LinkedIn${linkedinIdentity.providerUsername ? ` - ${linkedinIdentity.providerUsername}` : ''}`}
                        onClick={toggleLinkedIn}
                      >
                        <i className="bx bxl-linkedin" style={{ fontSize: '1.1rem' }}></i>
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
                      className={`btn btn-sm btn-link p-1 ${scheduledAt ? 'text-primary' : 'text-muted'}`}
                      aria-label="Schedule post"
                      style={{ 
                        border: 'none',
                        lineHeight: 1,
                        minWidth: 'auto',
                      }}
                      title="Schedule post"
                      onClick={() => setShowScheduleModal(true)}
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
            <div className="mb-2">
              <small className="text-muted d-block mb-1">Attached: {imageUrls.length} image(s)</small>
              <div className="d-flex flex-wrap gap-2 align-items-center">
                {imageUrls.map((url, i) => (
                  <div key={i} className="d-flex align-items-center gap-1 border rounded p-1 position-relative">
                    <img
                      src={url}
                      alt=""
                      style={{
                        width: 48,
                        height: 48,
                        objectFit: 'cover',
                        borderRadius: 4,
                      }}
                    />
                    <button
                      type="button"
                      className="btn-close btn-sm"
                      aria-label="Remove"
                      onClick={() => setImageUrls((prev) => prev.filter((_, j) => j !== i))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {videoUrls.length > 0 && (
            <div className="mb-2 d-flex flex-wrap gap-1 align-items-center">
              <small className="text-muted">Attached: 1 video</small>
            </div>
          )}

          {(selectedMastodonIds.size > 0 || crossPostToBluesky || crossPostToLinkedIn) && (
            <div className="mb-2 d-flex flex-wrap gap-1 align-items-center">
              <small className="text-muted">
                Posting to: {[
                  ...mastodonIdentities.filter((m) => selectedMastodonIds.has(m.id)).map((m) => getMastodonInstanceName(m.provider)),
                  ...(crossPostToBluesky ? ['Bluesky'] : []),
                  ...(crossPostToLinkedIn ? ['LinkedIn'] : []),
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
                        const next = [...pendingFiles, ...valid].slice(0, MAX_IMAGES - imageUrls.length);
                        setPendingFiles(next);
                        setPendingRotations((prev) => {
                          const need = next.length;
                          if (need <= prev.length) return prev.slice(0, need);
                          return [...prev, ...Array(need - prev.length).fill(0)];
                        });
                        e.target.value = '';
                      }}
                    />
                    {pendingFiles.length > 0 && (
                      <div className="mb-2">
                        <small className="text-muted d-block mb-1">Selected: {pendingFiles.length}</small>
                        <div className="d-flex flex-wrap gap-2 align-items-center">
                          {pendingFiles.map((f, i) => {
                            const previewUrl = pendingPreviewUrls[i];
                            const isRaster = isRasterImage(f);
                            const rot = pendingRotations[i] ?? 0;
                            return (
                              <div key={i} className="d-flex align-items-center gap-1 border rounded p-1">
                                {previewUrl && (
                                  <img
                                    src={previewUrl}
                                    alt=""
                                    style={{
                                      width: 48,
                                      height: 48,
                                      objectFit: 'cover',
                                      borderRadius: 4,
                                      transform: `rotate(${rot}deg)`,
                                    }}
                                  />
                                )}
                                {isRaster && (
                                  <>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-secondary p-1"
                                      aria-label="Rotate 90° clockwise"
                                      title="Rotate 90° CW"
                                      onClick={() =>
                                        setPendingRotations((prev) => {
                                          const next = [...prev];
                                          next[i] = ((next[i] ?? 0) + 90) % 360;
                                          return next;
                                        })
                                      }
                                    >
                                      <i className="bx bx-rotate-right" style={{ fontSize: '1rem' }} />
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-secondary p-1"
                                      aria-label="Rotate 90° counter-clockwise"
                                      title="Rotate 90° CCW"
                                      onClick={() =>
                                        setPendingRotations((prev) => {
                                          const next = [...prev];
                                          next[i] = ((next[i] ?? 0) + 270) % 360;
                                          return next;
                                        })
                                      }
                                    >
                                      <i className="bx bx-rotate-left" style={{ fontSize: '1rem' }} />
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  className="btn-close btn-sm"
                                  aria-label="Remove"
                                  onClick={() => {
                                    setPendingFiles((prev) => prev.filter((_, j) => j !== i));
                                    setPendingRotations((prev) => prev.filter((_, j) => j !== i));
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {imageUrls.length > 0 && (
                      <div className="mb-2">
                        <small className="text-muted d-block mb-1">Uploaded: {imageUrls.length}</small>
                        <div className="d-flex flex-wrap gap-2 align-items-center">
                          {imageUrls.map((url, i) => {
                            const isRotating = rotatingUrlIndex === i;
                            return (
                              <div key={i} className="d-flex align-items-center gap-1 border rounded p-1 position-relative">
                                <div className="position-relative">
                                  <img
                                    src={url}
                                    alt=""
                                    style={{
                                      width: 48,
                                      height: 48,
                                      objectFit: 'cover',
                                      borderRadius: 4,
                                      opacity: isRotating ? 0.6 : 1,
                                    }}
                                  />
                                  {isRotating && (
                                    <span
                                      className="position-absolute top-50 start-50 translate-middle spinner-border spinner-border-sm"
                                      role="status"
                                      aria-hidden="true"
                                    />
                                  )}
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary p-1"
                                    aria-label="Rotate 90° clockwise"
                                    title="Rotate 90°"
                                    disabled={isRotating}
                                    onClick={async () => {
                                      setRotatingUrlIndex(i);
                                      setError('');
                                      try {
                                        const blob = await rotateImageBlob(url, 90);
                                        const file = blobToFile(blob, 'image.jpg');
                                        const fd = new FormData();
                                        fd.append('file', file);
                                        const res = await fetch('/api/messages/images/upload', { method: 'POST', body: fd });
                                        const data = await res.json();
                                        if (res.ok && data.url) {
                                          setImageUrls((prev) => prev.map((u, j) => (j === i ? data.url : u)));
                                        } else {
                                          setError(data.error || 'Failed to upload image');
                                        }
                                      } catch {
                                        setError('Failed to upload image');
                                      } finally {
                                        setRotatingUrlIndex(null);
                                      }
                                    }}
                                  >
                                    <i className="bx bx-rotate-right" style={{ fontSize: '1rem' }} />
                                  </button>
                                <button
                                  type="button"
                                  className="btn-close btn-sm"
                                  aria-label="Remove"
                                  onClick={() => setImageUrls((prev) => prev.filter((_, j) => j !== i))}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {uploadingImages && uploadProgress && (
                      <div className="mb-2" aria-live="polite">
                        <small className="text-muted d-block mb-1">
                          Uploading {uploadProgress.current} of {uploadProgress.total}
                        </small>
                        <div
                          className="progress"
                          role="progressbar"
                          aria-valuenow={uploadProgress.current - 1}
                          aria-valuemin={0}
                          aria-valuemax={uploadProgress.total}
                          aria-label={`Upload progress: ${uploadProgress.current} of ${uploadProgress.total}`}
                        >
                          <div
                            className="progress-bar"
                            style={{
                              width: `${uploadProgress.total > 0 ? ((uploadProgress.current - 1) / uploadProgress.total) * 100 : 0}%`,
                            }}
                          />
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
                        setPendingRotations([]);
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
                        setError('');
                        const urls: string[] = [];
                        let firstError: string | null = null;
                        const total = pendingFiles.length;
                        for (let i = 0; i < total; i++) {
                          setUploadProgress({ current: i + 1, total });
                          let file = pendingFiles[i];
                          const rot = pendingRotations[i] ?? 0;
                          if (rot !== 0 && isRasterImage(file)) {
                            try {
                              const blob = await rotateImageBlob(file, rot);
                              file = blobToFile(blob, file.name);
                            } catch {
                              // fallback to original on rotate failure
                            }
                          }
                          const fd = new FormData();
                          fd.append('file', file);
                          try {
                            const res = await fetch('/api/messages/images/upload', { method: 'POST', body: fd });
                            const data = await res.json();
                            if (res.ok && data.url) {
                              urls.push(data.url);
                            } else if (!firstError) {
                              firstError = data.error || 'Failed to upload image';
                            }
                          } catch {
                            if (!firstError) firstError = 'Failed to upload image';
                          }
                        }
                        if (firstError) setError(firstError);
                        setImageUrls((prev) => [...prev, ...urls].slice(0, MAX_IMAGES));
                        setPendingFiles([]);
                        setPendingRotations([]);
                        setUploadProgress(null);
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

          {/* Schedule post modal */}
          {showScheduleModal && (
            <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} role="dialog">
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Schedule post</h5>
                    <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowScheduleModal(false)} />
                  </div>
                  <div className="modal-body">
                    <p className="small text-muted mb-2">Choose a date and time in the future. The message will be posted when the scheduled time arrives.</p>
                    <label className="form-label small">Date and time</label>
                    <input
                      type="datetime-local"
                      className="form-control mb-3"
                      min={toDatetimeLocal(new Date(Date.now() + 60000))}
                      value={scheduleDraft}
                      onChange={(e) => setScheduleDraft(e.target.value)}
                    />
                    <label className="form-label small">Cross-post to</label>
                    <div className="d-flex flex-wrap gap-3">
                      {mastodonIdentities.map((m) => {
                        const instanceName = getMastodonInstanceName(m.provider);
                        const isSelected = selectedMastodonIds.has(m.id);
                        return (
                          <div key={m.id} className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`schedule-mastodon-${m.id}`}
                              checked={isSelected}
                              onChange={() => {
                                setSelectedMastodonIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(m.id)) next.delete(m.id);
                                  else next.add(m.id);
                                  return next;
                                });
                              }}
                            />
                            <label className="form-check-label small" htmlFor={`schedule-mastodon-${m.id}`}>
                              Mastodon ({instanceName})
                            </label>
                          </div>
                        );
                      })}
                      {blueskyIdentity && (
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="schedule-bluesky"
                            checked={crossPostToBluesky}
                            onChange={(e) => setCrossPostToBluesky(e.target.checked)}
                          />
                          <label className="form-check-label small" htmlFor="schedule-bluesky">
                            Bluesky
                          </label>
                        </div>
                      )}
                      {linkedinIdentity && (
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="schedule-linkedin"
                            checked={crossPostToLinkedIn}
                            onChange={(e) => setCrossPostToLinkedIn(e.target.checked)}
                          />
                          <label className="form-check-label small" htmlFor="schedule-linkedin">
                            LinkedIn
                          </label>
                        </div>
                      )}
                      {mastodonIdentities.length === 0 && !blueskyIdentity && !linkedinIdentity && (
                        <span className="small text-muted">No cross-post accounts connected</span>
                      )}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowScheduleModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        const parsed = new Date(scheduleDraft);
                        if (isNaN(parsed.getTime()) || parsed <= new Date()) {
                          setError('Please select a future date and time');
                          return;
                        }
                        setScheduledAt(parsed);
                        setShowScheduleModal(false);
                        setError('');
                      }}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="d-flex flex-column align-items-end gap-1">
            {scheduledAt && scheduledAt > new Date() && (
              <div
                className="small text-muted text-end"
                role="button"
                tabIndex={0}
                onClick={() => { setScheduledAt(null); setShowScheduleModal(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setScheduledAt(null); setShowScheduleModal(false); } }}
                style={{ cursor: 'pointer' }}
              >
                <span className="d-block">Scheduled for {scheduledAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                <span className="d-block">(Click date &amp; time to cancel)</span>
              </div>
            )}
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={loading || !content.trim() || isOverLimit}
            >
              {loading
                ? (scheduledAt ? 'Scheduling...' : 'Posting...')
                : scheduledAt && scheduledAt > new Date()
                  ? 'Schedule Message'
                  : 'Post Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

