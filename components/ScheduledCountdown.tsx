'use client';

import { useState, useEffect } from 'react';

interface ScheduledCountdownProps {
  scheduledAt: string; // ISO string
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `in ${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `in ${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `in ${minutes}m ${seconds % 60}s`;
  }
  return `in ${seconds}s`;
}

export default function ScheduledCountdown({ scheduledAt }: ScheduledCountdownProps) {
  const [text, setText] = useState<string>('');

  useEffect(() => {
    const target = new Date(scheduledAt).getTime();

    const update = () => {
      const now = Date.now();
      const remaining = target - now;
      if (remaining <= 0) {
        setText('');
        return;
      }
      setText(formatCountdown(remaining));
    };

    update();

    const id = setInterval(update, 1000); // Update every second for real-time countdown
    return () => clearInterval(id);
  }, [scheduledAt]);

  if (!text) return null;

  return (
    <span className="text-muted ms-1" style={{ fontSize: '0.75rem' }}>
      {text}
    </span>
  );
}
