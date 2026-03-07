'use client';

import { useState, useEffect, useCallback } from 'react';
import { Message } from '@/lib/types';
import ScheduledCalendar from '@/components/scheduled/ScheduledCalendar';

interface Identity {
  id: string;
  provider: string;
}

export default function ScheduledCalendarWrapper() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScheduled = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/messages/scheduled?range=month');
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
  }, []);

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
        Loading calendar…
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

  return (
    <ScheduledCalendar
      messages={messages}
      identities={identities}
      onUpdated={fetchScheduled}
    />
  );
}
