'use client';

import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import MessageCard from '@/components/MessageCard';
import MessageReplies from '@/components/MessageReplies';
import { formatDateTime } from '@/lib/utils/relativeTime';
import { linkifyText } from '@/lib/messages/linkify';
import type { Message } from '@/lib/types';

function ThreadAncestorCard({ message }: { message: Message }) {
  const u = message.user;
  return (
    <div
      className="card mb-2 border-secondary border-opacity-25"
      style={{ backgroundColor: 'var(--bs-tertiary-bg)' }}
    >
      <div className="card-body py-2 px-3">
        <div className="d-flex align-items-start gap-2">
          {u.avatar ? (
            <Avatar src={u.avatar} alt={u.displayName || u.username} size={32} />
          ) : (
            <div
              className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
              style={{
                width: 32,
                height: 32,
                backgroundColor: 'var(--bs-secondary)',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: 'bold',
              }}
            >
              {(u.displayName || u.username)[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <div className="flex-grow-1" style={{ minWidth: 0 }}>
            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
              <Link
                href={`/user/${encodeURIComponent(u.username)}`}
                className="text-decoration-none text-body fw-semibold small"
              >
                {u.displayName || u.username}
              </Link>
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                · {formatDateTime(message.createdAt)}
              </span>
              {!message.publiclyVisible && (
                <span className="badge bg-secondary" style={{ fontSize: '0.6rem' }}>
                  Private
                </span>
              )}
            </div>
            <p className="mb-0 text-break small" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {linkifyText(message.content)}
            </p>
            {message.pushedMessage && (
              <p className="mb-0 mt-1 text-muted small fst-italic">
                (Includes a pushed message — see full thread below.)
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export interface MessageThreadViewProps {
  chain: Message[];
  currentUserId?: string;
  showPreviews: boolean;
}

export default function MessageThreadView({
  chain,
  currentUserId,
  showPreviews,
}: MessageThreadViewProps) {
  if (chain.length === 0) {
    return null;
  }

  const focal = chain[chain.length - 1];
  const ancestors = chain.length > 1 ? chain.slice(0, -1) : [];
  const rootId = chain[0].id;

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="border-bottom pb-3 mb-3">
        <Link
          href="/"
          className="text-decoration-none d-inline-flex align-items-center gap-2 text-body"
        >
          <i className="bx bx-arrow-back fs-5 align-middle" aria-hidden />
          <span className="fw-medium">Back to messages</span>
        </Link>
        <div className="d-flex flex-wrap gap-2 mt-3">
          <Link href="/notifications" className="btn btn-outline-secondary btn-sm">
            <i className="bx bx-bell me-1" aria-hidden />
            Notifications
          </Link>
        </div>
      </div>

      <h1 className="h4 mb-3">Thread</h1>

      {ancestors.length > 0 && (
        <div className="mb-2">
          <div className="text-muted small mb-2">Earlier in this conversation</div>
          {ancestors.map((m) => (
            <ThreadAncestorCard key={m.id} message={m} />
          ))}
          {focal.id !== rootId && (
            <div className="mb-3">
              <Link href={`/message/${rootId}/thread`} className="small text-decoration-none">
                View root thread
              </Link>
            </div>
          )}
        </div>
      )}

      <MessageCard message={focal} currentUserId={currentUserId} showPreviews={showPreviews} />

      {focal.parentId ? (
        <div className="mt-2">
          <MessageReplies
            parentId={focal.id}
            currentUserId={currentUserId}
            showReplyInput={!!currentUserId}
          />
        </div>
      ) : null}
    </div>
  );
}
