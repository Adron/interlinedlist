'use client';

import { useState, useEffect, useCallback } from 'react';
import { Message } from '@/lib/types';
import ScheduledPostCard from '@/components/scheduled/ScheduledPostCard';

type Range = 'today' | 'week' | 'month';

interface Identity {
  id: string;
  provider: string;
}

interface ScheduledQueueListProps {
  range: Range;
  onDeleted?: (messageId: string) => void;
}

export default function ScheduledQueueList({
  range,
  onDeleted,
}: ScheduledQueueListProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScheduled = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/messages/scheduled?range=${range}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch scheduled messages');
      }
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchScheduled();
  }, [fetchScheduled]);

  useEffect(() => {
    fetch('/api/user/identities')
      .then((r) => r.json())
      .then((data) => {
        const ids = data.identities || data || [];
        setIdentities(
          Array.isArray(ids)
            ? ids.map((i: { id: string; provider: string }) => ({
                id: i.id,
                provider: i.provider || '',
              }))
            : []
        );
      })
      .catch(() => setIdentities([]));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-4 text-muted">
        <i className="bx bx-loader-alt bx-spin me-2" />
        Loading scheduled posts…
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-warning" role="alert">
        {error}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-4 text-muted small">
        No scheduled posts in this range.
      </div>
    );
  }

  return (
    <div className="scheduled-queue-list">
      {messages.map((msg) => (
        <ScheduledPostCard
          key={msg.id}
          message={msg}
          identities={identities}
          onUpdated={() => fetchScheduled()}
          onDeleted={onDeleted}
        />
      ))}
    </div>
  );
}
