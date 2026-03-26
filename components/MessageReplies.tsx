'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Avatar } from './Avatar';
import CrossPostErrorToast from './CrossPostErrorToast';
import { formatDateTime } from '@/lib/utils/relativeTime';
import { linkifyText } from '@/lib/messages/linkify';
import ReplyInput from './ReplyInput';
import MessageDigButton from './MessageDigButton';
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
  /** Parent renders Reply in the message toolbar; pass open state here */
  replyComposeOpen?: boolean;
  onReplyComposeOpenChange?: (open: boolean) => void;
  /** Hide the inline "Reply" text control (used with toolbar Reply in MessageCard) */
  hideReplyComposeTrigger?: boolean;
}

export default function MessageReplies({
  parentId,
  currentUserId,
  defaultPubliclyVisible = true,
  onReplyAdded,
  showReplyInput = true,
  className = '',
  replyComposeOpen = false,
  onReplyComposeOpenChange,
  hideReplyComposeTrigger = false,
}: MessageRepliesProps) {
  const [replies, setReplies] = useState<ReplyWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [internalShowInput, setInternalShowInput] = useState(false);
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

  const composeOpen = hideReplyComposeTrigger ? replyComposeOpen : internalShowInput;
  const closeCompose = () => {
    if (hideReplyComposeTrigger) {
      onReplyComposeOpenChange?.(false);
    } else {
      setInternalShowInput(false);
    }
  };
  const openCompose = () => {
    if (hideReplyComposeTrigger) {
      onReplyComposeOpenChange?.(true);
    } else {
      setInternalShowInput(true);
    }
  };

  const handleReplySubmitted = () => {
    fetchReplies();
    closeCompose();
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

  const canReply = !!(showReplyInput && currentUserId);
  const showReplyForm = canReply && composeOpen;
  const shouldRenderBlock =
    totalReplies > 0 ||
    hasMoreReplies ||
    (canReply && (!hideReplyComposeTrigger || showReplyForm));
  if (!shouldRenderBlock) {
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
                <div className="mt-1 d-flex flex-wrap align-items-baseline column-gap-1 row-gap-1">
                  <MessageDigButton
                    messageId={reply.id}
                    initialCount={reply.digCount ?? 0}
                    initialDugByMe={reply.dugByMe ?? false}
                    isSignedIn={!!currentUserId}
                    compact
                  />
                  {(reply.pushCount ?? 0) > 0 && (
                    <>
                      <span className="text-muted user-select-none" aria-hidden>
                        ·
                      </span>
                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {reply.pushCount} {reply.pushCount === 1 ? 'push' : 'pushes'}
                      </span>
                    </>
                  )}
                </div>
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

      {canReply && (showReplyForm || !hideReplyComposeTrigger) && (
        <div className="mt-2">
          {showReplyForm ? (
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
              onClick={openCompose}
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
