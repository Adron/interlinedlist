'use client';

import { useState, useEffect } from 'react';
import ScheduledCountdown from './ScheduledCountdown';

interface ScheduledPostIndicatorProps {
  scheduledAt: string; // ISO string
}

type Phase = 'scheduled' | 'posted' | 'done';

export default function ScheduledPostIndicator({ scheduledAt }: ScheduledPostIndicatorProps) {
  const [phase, setPhase] = useState<Phase>(() => {
    const target = new Date(scheduledAt).getTime();
    return target > Date.now() ? 'scheduled' : 'posted';
  });

  useEffect(() => {
    const target = new Date(scheduledAt).getTime();

    const check = () => {
      const now = Date.now();
      if (target > now) {
        setPhase('scheduled');
      } else {
        setPhase((p) => (p === 'done' ? p : 'posted'));
      }
    };

    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [scheduledAt]);

  useEffect(() => {
    if (phase !== 'posted') return;
    const id = setTimeout(() => setPhase('done'), 3000);
    return () => clearTimeout(id);
  }, [phase]);

  if (phase === 'done') return null;

  if (phase === 'scheduled') {
    return (
      <>
        <span className="badge bg-info ms-1" style={{ fontSize: '0.6rem' }}>Scheduled</span>
        <ScheduledCountdown scheduledAt={scheduledAt} />
      </>
    );
  }

  // phase === 'posted': show Posted with green background, fade out over 3 seconds
  return (
    <span
      className="badge bg-success ms-1 scheduled-posted-badge"
      style={{ fontSize: '0.6rem' }}
    >
      Posted
    </span>
  );
}
