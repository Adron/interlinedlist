'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

export default function AnalyticsPageView() {
  const pathname = usePathname();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;

    const referrer = typeof document !== 'undefined' ? document.referrer || undefined : undefined;
    fetch('/api/analytics/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'page_view',
        path: pathname,
        referrer: referrer || undefined,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
