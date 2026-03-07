'use client';

import { useState } from 'react';
import { Message } from '@/lib/types';
import ScheduledPostIndicator from '@/components/ScheduledPostIndicator';
import CrossPostPlatformIcons, {
  type ScheduledCrossPostConfig,
} from '@/components/scheduled/CrossPostPlatformIcons';
import EditScheduledModal from '@/components/scheduled/EditScheduledModal';
import { formatDateTime } from '@/lib/utils/relativeTime';

interface Identity {
  id: string;
  provider: string;
}

interface ScheduledPostCardProps {
  message: Message;
  identities?: Identity[];
  onUpdated?: (updated: Message) => void;
  onDeleted?: (messageId: string) => void;
}

function truncateContent(content: string, maxLength = 120): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength).trim() + '…';
}

export default function ScheduledPostCard({
  message: initialMessage,
  identities = [],
  onUpdated,
  onDeleted,
}: ScheduledPostCardProps) {
  const [message, setMessage] = useState(initialMessage);
  const [showEditModal, setShowEditModal] = useState(false);

  const config = message.scheduledCrossPostConfig as ScheduledCrossPostConfig | null | undefined;
  const scheduledAt = message.scheduledAt;
  if (!scheduledAt) return null;

  const isFuture = new Date(scheduledAt) > new Date();

  const handleSaved = (updated: Message) => {
    setMessage(updated);
    onUpdated?.(updated);
  };

  return (
    <>
      <div className="card mb-2">
        <div className="card-body py-2 px-3">
          <div className="d-flex justify-content-between align-items-start gap-2">
            <div className="flex-grow-1 min-w-0">
              <p className="mb-1 small text-break" style={{ lineHeight: 1.4 }}>
                {truncateContent(message.content)}
              </p>
              <div className="d-flex flex-wrap align-items-center gap-2 small text-muted">
                <span>{formatDateTime(scheduledAt)}</span>
                {isFuture && (
                  <>
                    <ScheduledPostIndicator scheduledAt={scheduledAt} />
                    {config && (
                      <CrossPostPlatformIcons
                        scheduledCrossPostConfig={config}
                        identities={identities}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
            {isFuture && (
              <div className="d-flex gap-1 flex-shrink-0">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm py-0 px-1"
                  title="Edit scheduled post"
                  onClick={() => setShowEditModal(true)}
                  aria-label="Edit scheduled post"
                >
                  <i className="bx bx-edit" style={{ fontSize: '0.9rem' }} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {showEditModal && (
        <EditScheduledModal
          message={message}
          identities={identities}
          onClose={() => setShowEditModal(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
