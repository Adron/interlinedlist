'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar } from './Avatar';
import { formatDateTime } from '@/lib/utils/relativeTime';
import { linkifyText } from '@/lib/messages/linkify';
import LinkMetadataCard from './messages/LinkMetadataCard';
import MessageReplies from './MessageReplies';
import { Message as MessageType, LinkMetadataItem } from '@/lib/types';
import { detectLinks } from '@/lib/messages/link-detector';
import { extractListNameFromMessage } from '@/lib/utils/message-extractor';
import ScheduledPostIndicator from './ScheduledPostIndicator';
import CrossPostPlatformIcons from './scheduled/CrossPostPlatformIcons';
import MessageDigButton from './MessageDigButton';

interface MessageUser {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

interface Message extends Omit<MessageType, 'user'> {
  user: MessageUser;
}

function PushedMessageEmbed({
  source,
  currentUserId,
  showPreviews,
}: {
  source: NonNullable<MessageType['pushedMessage']>;
  currentUserId?: string;
  showPreviews: boolean;
}) {
  const u = source.user;
  return (
    <div
      className="border rounded p-2 mt-2"
      style={{ backgroundColor: 'var(--bs-tertiary-bg)', fontSize: '0.85rem' }}
    >
      <div className="d-flex align-items-start gap-2">
        {u.avatar ? (
          <Avatar src={u.avatar} alt={u.displayName || u.username} size={28} />
        ) : (
          <div
            className="rounded-circle d-flex align-items-center justify-content-center"
            style={{
              width: 28,
              height: 28,
              backgroundColor: 'var(--bs-secondary)',
              color: 'white',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              flexShrink: 0,
            }}
          >
            {(u.displayName || u.username)[0].toUpperCase()}
          </div>
        )}
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <div className="mb-1">
            <Link href={`/user/${encodeURIComponent(u.username)}`} className="text-decoration-none text-body fw-bold">
              {u.displayName || u.username}
            </Link>
            <span className="text-muted ms-1" style={{ fontSize: '0.75rem' }}>
              @{u.username}
            </span>
            <span className="text-muted ms-2" style={{ fontSize: '0.7rem' }}>
              · {formatDateTime(source.createdAt)}
            </span>
          </div>
          <p className="mb-0 text-break" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {linkifyText(source.content)}
          </p>
          {source.imageUrls && Array.isArray(source.imageUrls) && source.imageUrls.length > 0 && (
            <div className="d-flex flex-wrap gap-1 mt-2">
              {source.imageUrls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="d-block">
                  <img
                    src={url}
                    alt=""
                    style={{ maxWidth: 100, maxHeight: 100, objectFit: 'cover', borderRadius: 6 }}
                  />
                </a>
              ))}
            </div>
          )}
          {source.videoUrls && Array.isArray(source.videoUrls) && source.videoUrls.length > 0 && (
            <div className="mt-2">
              <video
                src={source.videoUrls[0]}
                controls
                style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 6 }}
                preload="metadata"
              />
            </div>
          )}
          {showPreviews &&
            (() => {
              const detectedLinks = detectLinks(source.content);
              if (detectedLinks.length === 0) return null;
              const metadataMap = new Map<string, LinkMetadataItem>();
              if (source.linkMetadata?.links) {
                source.linkMetadata.links.forEach((link) => metadataMap.set(link.url, link));
              }
              const linkItems: LinkMetadataItem[] = detectedLinks.map((detected) => {
                const existing = metadataMap.get(detected.url);
                return existing ?? { url: detected.url, platform: detected.platform, fetchStatus: 'pending' as const };
              });
              return (
                <div className="mt-2">
                  {linkItems.map((link, index) => (
                    <LinkMetadataCard key={`${link.url}-${index}`} link={link} messageId={source.id} />
                  ))}
                </div>
              );
            })()}
          <div className="mt-2">
            <MessageDigButton
              messageId={source.id}
              initialCount={source.digCount ?? 0}
              initialDugByMe={source.dugByMe ?? false}
              isSignedIn={!!currentUserId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface MessageCardProps {
  message: Message;
  currentUserId?: string;
  onDelete?: (messageId: string) => void;
  isSelected?: boolean;
  onSelectChange?: (messageId: string, selected: boolean) => void;
  showCheckbox?: boolean;
  showPreviews?: boolean;
}

export default function MessageCard({ 
  message, 
  currentUserId, 
  onDelete,
  isSelected = false,
  onSelectChange,
  showCheckbox = false,
  showPreviews = true
}: MessageCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [pushingPlain, setPushingPlain] = useState(false);
  const [pushError, setPushError] = useState('');
  const isOwner = currentUserId === message.user.id;
  const canPushHere = !!currentUserId && message.publiclyVisible;
  const isPlainPushRow = !!message.pushedMessage && !message.content?.trim();

  const handlePlainPush = async () => {
    setPushError('');
    setPushingPlain(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pushedMessageId: message.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPushError(typeof data.error === 'string' ? data.error : 'Could not push message');
        return;
      }
      window.dispatchEvent(new Event('messageAdded'));
    } catch {
      setPushError('Could not push message');
    } finally {
      setPushingPlain(false);
    }
  };

  const handleQuotePush = () => {
    setPushError('');
    window.dispatchEvent(
      new CustomEvent<{ messageId: string }>('interlined:quotePush', { detail: { messageId: message.id } })
    );
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(message.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete message:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSelectChange) {
      onSelectChange(message.id, e.target.checked);
    }
  };

  // Only show checkbox if user owns the message
  // On main page (showCheckbox={false} and no onSelectChange), don't show on hover
  // On dashboard (has onSelectChange), show on hover when showCheckbox is not explicitly false
  const isMainPage = showCheckbox === false && !onSelectChange;
  const shouldShowCheckbox = isOwner && (
    isSelected || 
    showCheckbox === true || 
    (!isMainPage && isHovered)
  );

  return (
    <div 
      className="card mb-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="card-body p-2">
        <div className="d-flex align-items-start gap-2">
          {shouldShowCheckbox && (
            <div className="d-flex align-items-center" style={{ paddingTop: '2px' }}>
              <input
                type="checkbox"
                className="form-check-input"
                checked={isSelected}
                onChange={handleCheckboxChange}
                style={{ cursor: 'pointer' }}
                aria-label={`Select message from ${message.user.displayName || message.user.username}`}
              />
            </div>
          )}
          {message.user.avatar ? (
            <Avatar
              src={message.user.avatar}
              alt={message.user.displayName || message.user.username}
              size={36}
            />
          ) : (
            <div
              className="rounded-circle d-flex align-items-center justify-content-center"
              style={{
                width: '36px',
                height: '36px',
                backgroundColor: 'var(--bs-secondary)',
                color: 'white',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                flexShrink: 0,
              }}
            >
              {(message.user.displayName || message.user.username)[0].toUpperCase()}
            </div>
          )}
          
          <div className="flex-grow-1" style={{ minWidth: 0 }}>
            <div className="d-flex align-items-center justify-content-between mb-1">
              <div>
                <Link
                  href={`/user/${encodeURIComponent(message.user.username)}`}
                  className="text-decoration-none text-body"
                >
                  <strong className="text-break" style={{ fontSize: '0.9rem' }}>
                    {message.user.displayName || message.user.username}
                  </strong>
                  <span className="text-muted ms-2" style={{ fontSize: '0.8rem' }}>
                    @{message.user.username}
                  </span>
                </Link>
                <span className="text-muted ms-2" style={{ fontSize: '0.75rem' }}>
                  · {formatDateTime(message.createdAt)}
                  {isOwner && message.scheduledAt && (
                    <>
                      <ScheduledPostIndicator scheduledAt={message.scheduledAt} />
                      {message.scheduledCrossPostConfig && (
                        <CrossPostPlatformIcons
                          scheduledCrossPostConfig={message.scheduledCrossPostConfig}
                        />
                      )}
                    </>
                  )}
                </span>
                {!message.publiclyVisible && (
                  <span className="badge bg-secondary ms-2" style={{ fontSize: '0.65rem' }}>
                    Private
                  </span>
                )}
              </div>
              
              <div className="d-flex align-items-center gap-2">
                {currentUserId && message.content.trim() && (
                  <button
                    className="btn btn-sm btn-link text-primary p-0"
                    onClick={() => {
                      const listName = extractListNameFromMessage(message.content);
                      const isOwner = currentUserId === message.user.id;
                      sessionStorage.setItem('createListFromMessage', JSON.stringify({
                        name: listName,
                        description: message.content,
                        publiclyVisible: message.publiclyVisible,
                        isOwner: isOwner
                      }));
                      router.push('/lists/new');
                    }}
                    style={{ fontSize: '0.75rem' }}
                    title="Create list from this message"
                  >
                    <i className="bx bx-list-plus"></i>
                  </button>
                )}

                {canPushHere && (
                  <div className="d-flex align-items-center gap-1 flex-wrap justify-content-end">
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-secondary p-0"
                      onClick={handlePlainPush}
                      disabled={pushingPlain}
                      style={{ fontSize: '0.7rem' }}
                      title="Push Message"
                    >
                      {pushingPlain ? '…' : 'Push Message'}
                    </button>
                    <span className="text-muted" style={{ fontSize: '0.65rem' }}>
                      ·
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-secondary p-0"
                      onClick={handleQuotePush}
                      style={{ fontSize: '0.7rem' }}
                      title="Push Message & Add Commentary"
                    >
                      Push & Commentary
                    </button>
                  </div>
                )}
                
                {isOwner && onDelete && (
                  <div className="position-relative">
                    {!showDeleteConfirm ? (
                      <button
                        className="btn btn-sm btn-link text-danger p-0"
                        onClick={() => setShowDeleteConfirm(true)}
                        style={{ fontSize: '0.75rem' }}
                        title="Delete message"
                      >
                        <i className="bx bx-trash"></i>
                      </button>
                    ) : (
                      <div className="d-flex gap-1">
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={handleDelete}
                          disabled={isDeleting}
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}
                        >
                          {isDeleting ? '...' : 'Delete'}
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={isDeleting}
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {message.pushedMessage && (
              <div className="text-muted small mb-1 d-flex align-items-center gap-1">
                <i className="bx bx-share-alt" aria-hidden />
                <span>
                  {isPlainPushRow ? 'Push Message' : 'Push Message & Commentary'}
                </span>
              </div>
            )}

            {message.content.trim().length > 0 && (
            <p className="mb-0 text-break" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.9rem' }}>
              {linkifyText(message.content)}
            </p>
            )}

            {/* Message images */}
            {message.imageUrls && Array.isArray(message.imageUrls) && message.imageUrls.length > 0 && (
              <div className="d-flex flex-wrap gap-1 mt-2">
                {message.imageUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="d-block">
                    <img
                      src={url}
                      alt=""
                      style={{ maxWidth: 120, maxHeight: 120, objectFit: 'cover', borderRadius: 6 }}
                    />
                  </a>
                ))}
              </div>
            )}

            {/* Message video */}
            {message.videoUrls && Array.isArray(message.videoUrls) && message.videoUrls.length > 0 && (
              <div className="mt-2">
                <video
                  src={message.videoUrls[0]}
                  controls
                  style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 6 }}
                  preload="metadata"
                />
              </div>
            )}
            
            {/* Cross-post links */}
            {message.crossPostUrls && Array.isArray(message.crossPostUrls) && message.crossPostUrls.length > 0 && (
              <ul className="list-unstyled mb-0 mt-2 ps-0" style={{ fontSize: '0.8rem' }}>
                {message.crossPostUrls.map((cp: { platform: string; url: string; instanceName: string }, i: number) => (
                  <li key={i} className="mb-1">
                    <a
                      href={cp.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted text-decoration-none"
                    >
                      <i className="bx bx-link-external me-1" style={{ fontSize: '0.75rem' }}></i>
                      {cp.platform === 'mastodon' ? `Mastodon (${cp.instanceName})` : cp.platform === 'bluesky' ? 'Bluesky' : cp.platform}
                    </a>
                  </li>
                ))}
              </ul>
            )}

            {/* Render link previews for all detected links (if showPreviews is enabled) */}
            {showPreviews && message.content.trim().length > 0 && (() => {
              // Detect all links in the message
              const detectedLinks = detectLinks(message.content);
              
              if (detectedLinks.length === 0) {
                return null;
              }
              
              // Create a map of URLs to metadata for quick lookup
              const metadataMap = new Map<string, LinkMetadataItem>();
              if (message.linkMetadata?.links) {
                message.linkMetadata.links.forEach(link => {
                  metadataMap.set(link.url, link);
                });
              }
              
              // Create link items with metadata if available, or pending status
              const linkItems: LinkMetadataItem[] = detectedLinks.map(detected => {
                const existing = metadataMap.get(detected.url);
                if (existing) {
                  return existing;
                }
                // No metadata yet - create pending item
                return {
                  url: detected.url,
                  platform: detected.platform,
                  fetchStatus: 'pending',
                };
              });
              
              return (
                <div className="mt-2">
                  {linkItems.map((link, index) => (
                    <LinkMetadataCard key={`${link.url}-${index}`} link={link} messageId={message.id} />
                  ))}
                </div>
              );
            })()}

            {message.pushedMessage && (
              <PushedMessageEmbed
                source={message.pushedMessage}
                currentUserId={currentUserId}
                showPreviews={showPreviews}
              />
            )}

            {pushError && (
              <div className="text-danger small mt-1" role="alert">
                {pushError}
              </div>
            )}

            <div className="mt-2 d-flex flex-wrap align-items-center gap-2">
              <MessageDigButton
                messageId={message.id}
                initialCount={message.digCount ?? 0}
                initialDugByMe={message.dugByMe ?? false}
                isSignedIn={!!currentUserId}
              />
              {(message.pushCount ?? 0) > 0 && (
                <span className="text-muted small">
                  {message.pushCount} {message.pushCount === 1 ? 'push' : 'pushes'}
                </span>
              )}
            </div>

            {/* Replies - only for top-level messages */}
            {!message.parentId && (
              <MessageReplies
                parentId={message.id}
                currentUserId={currentUserId}
                showReplyInput={!!currentUserId}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

