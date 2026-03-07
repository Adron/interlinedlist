'use client';

import { useEffect } from 'react';

interface AnalyticsActionTrackerProps {
  name: string;
  properties?: Record<string, string>;
}

export default function AnalyticsActionTracker({ name, properties }: AnalyticsActionTrackerProps) {
  useEffect(() => {
    fetch('/api/analytics/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'action',
        name,
        properties: properties ?? undefined,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [name, properties ? JSON.stringify(properties) : undefined]);

  return null;
}
