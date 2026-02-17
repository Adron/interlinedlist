'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Avatar } from './Avatar';
import CrossPostErrorToast from './CrossPostErrorToast';
import { formatDateTime } from '@/lib/utils/relativeTime';
import { linkifyText } from '@/lib/messages/linkify';
import ReplyInput from './ReplyInput';
import type { Message } from '@/lib/types';

interface ReplyWithCount extends Message {
  replyCount?: number;
}

interface MessageRepliesProps {
  parentId: string;
  currentUserId?: string;
  defaultPubliclyVisible?: boolean;
  onReplyAdded?: () => void;
  showReplyInput?: boolean;
  className?: string;
}

export default function MessageReplies({
  parentId,
  currentUserId,
  defaultPubliclyVisible = true,
  onReplyAdded,
  showReplyInput = true,
  className = '',
}: MessageRepliesProps) {
  const [replies, setReplies] = useState<ReplyWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInput, setShowInput] = useState(false);
  const [crossPostErrors, setCrossPostErrors] = useState<Array<{ instanceName: string; error?: string }>>([]);

  const fetchReplies = async () => {
    try {
      const res = await fetch(`/api/messages/${parentId}/replies`);
      if (res.ok) {
        const data = await res.json();
        setReplies(data.replies ?? []);
      }
    } catch {
      setReplies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReplies();
  }, [parentId]);

  const totalReplies = replies.length;
  const totalNested = replies.reduce((sum, r) => sum + (r.replyCount ?? 0), 0);
  const hasMoreReplies = totalNested > 0;

  const handleReplySubmitted = () => {
    fetchReplies();
    setShowInput(false);
    onReplyAdded?.();
  };

  const handleCrossPostErrors = (errors: Array<{ instanceName: string; error?: string }>) => {
    setCrossPostErrors(errors);
  };

  if (loading) {
    return (
      <div className={`mt-2 ps-3 border-start border-2 ${className}`} style={{ borderColor: 'var(--bs-border-color)' }}>
        <div className="text-muted small">Loading replies...</div>
      </div>
    );
  }

  if (totalReplies === 0 && !showReplyInput) {
    return null;
  }

  return (
    <div className={`mt-2 ps-3 border-start border-2 ${className}`} style={{ borderColor: 'var(--bs-border-color)' }}>
      {replies.map((reply) => (
        <div key={reply.id} className="mb-2">
          <div className="card card-body p-2" style={{ fontSize: '0.9rem' }}>
            <div className="d-flex align-items-start gap-2">
              {reply.user?.avatar ? (
                <Avatar
                  src={reply.user.avatar}
                  alt={reply.user.displayName || reply.user.username}
                  size={28}
                />
              ) : (
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: 28,
                    height: 28,
                    backgroundColor: 'var(--bs-secondary)',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    flexShrink: 0,
                  }}
                >
                  {(reply.user?.displayName || reply.user?.username || '?')[0].toUpperCase()}
                </div>
              )}
              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <Link
                    href={`/user/${encodeURIComponent(reply.user?.username ?? '')}`}
                    className="text-decoration-none text-body fw-bold"
                    style={{ fontSize: '0.85rem' }}
                  >
                    {reply.user?.displayName || reply.user?.username}
                  </Link>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                    · {formatDateTime(reply.createdAt)}
                  </span>
                  {(reply.replyCount ?? 0) > 0 && (
                    <Link
                      href={`/message/${reply.id}/thread`}
                      className="text-muted text-decoration-none"
                      style={{ fontSize: '0.75rem' }}
                    >
                      +{(reply.replyCount ?? 0)} replies
                    </Link>
                  )}
                </div>
                <p className="mb-0 text-break" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {linkifyText(reply.content)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}

      {hasMoreReplies && (
        <div className="mb-2">
          <Link
            href={`/message/${parentId}/thread`}
            className="text-muted text-decoration-none"
            style={{ fontSize: '0.8rem' }}
          >
            +{totalNested} more {totalNested === 1 ? 'reply' : 'replies'}
          </Link>
        </div>
      )}

      {showReplyInput && currentUserId && (
        <div className="mt-2">
          {showInput ? (
            <ReplyInput
              parentId={parentId}
              defaultPubliclyVisible={defaultPubliclyVisible}
              onReplySubmitted={handleReplySubmitted}
              onCrossPostErrors={handleCrossPostErrors}
            />
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-link text-muted p-0"
              onClick={() => setShowInput(true)}
              style={{ fontSize: '0.8rem' }}
            >
              Reply
            </button>
          )}
        </div>
      )}

      <CrossPostErrorToast
        errors={crossPostErrors}
        onDismiss={() => setCrossPostErrors([])}
        durationMs={5000}
      />
    </div>
  );
}
