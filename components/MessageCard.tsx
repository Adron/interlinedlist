'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar } from './Avatar';
import { formatDateTime } from '@/lib/utils/relativeTime';
import { linkifyText } from '@/lib/messages/linkify';
import LinkMetadataCard from './messages/LinkMetadataCard';
import { Message as MessageType, LinkMetadataItem } from '@/lib/types';
import { detectLinks } from '@/lib/messages/link-detector';
import { extractListNameFromMessage } from '@/lib/utils/message-extractor';

interface MessageUser {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

interface Message extends Omit<MessageType, 'user'> {
  user: MessageUser;
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
  const isOwner = currentUserId === message.user.id;

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
                </span>
                {!message.publiclyVisible && (
                  <span className="badge bg-secondary ms-2" style={{ fontSize: '0.65rem' }}>
                    Private
                  </span>
                )}
              </div>
              
              <div className="d-flex align-items-center gap-2">
                {currentUserId && (
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
            
            <p className="mb-0 text-break" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.9rem' }}>
              {linkifyText(message.content)}
            </p>

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
                      {cp.platform === 'mastodon' ? `Mastodon (${cp.instanceName})` : cp.platform}
                    </a>
                  </li>
                ))}
              </ul>
            )}

            {/* Render link previews for all detected links (if showPreviews is enabled) */}
            {showPreviews && (() => {
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
          </div>
        </div>
      </div>
    </div>
  );
}

