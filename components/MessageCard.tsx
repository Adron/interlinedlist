'use client';

import { useState } from 'react';
import { Avatar } from './Avatar';
import { formatRelativeTime } from '@/lib/utils/relativeTime';

interface MessageUser {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

interface Message {
  id: string;
  content: string;
  publiclyVisible: boolean;
  createdAt: string;
  user: MessageUser;
}

interface MessageCardProps {
  message: Message;
  currentUserId?: string;
  onDelete?: (messageId: string) => void;
}

export default function MessageCard({ message, currentUserId, onDelete }: MessageCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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

  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="d-flex align-items-start gap-3">
          {message.user.avatar ? (
            <Avatar
              src={message.user.avatar}
              alt={message.user.displayName || message.user.username}
              size={48}
            />
          ) : (
            <div
              className="rounded-circle d-flex align-items-center justify-content-center"
              style={{
                width: '48px',
                height: '48px',
                backgroundColor: 'var(--bs-secondary)',
                color: 'white',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                flexShrink: 0,
              }}
            >
              {(message.user.displayName || message.user.username)[0].toUpperCase()}
            </div>
          )}
          
          <div className="flex-grow-1" style={{ minWidth: 0 }}>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div>
                <strong className="text-break">
                  {message.user.displayName || message.user.username}
                </strong>
                <span className="text-muted ms-2" style={{ fontSize: '0.9rem' }}>
                  @{message.user.username}
                </span>
                <span className="text-muted ms-2" style={{ fontSize: '0.85rem' }}>
                  · {formatRelativeTime(message.createdAt)}
                </span>
                {!message.publiclyVisible && (
                  <span className="badge bg-secondary ms-2" style={{ fontSize: '0.75rem' }}>
                    Private
                  </span>
                )}
              </div>
              
              {isOwner && onDelete && (
                <div className="position-relative">
                  {!showDeleteConfirm ? (
                    <button
                      className="btn btn-sm btn-link text-danger p-0"
                      onClick={() => setShowDeleteConfirm(true)}
                      style={{ fontSize: '0.85rem' }}
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
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                      >
                        {isDeleting ? '...' : 'Delete'}
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={isDeleting}
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <p className="mb-0 text-break" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {message.content}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

