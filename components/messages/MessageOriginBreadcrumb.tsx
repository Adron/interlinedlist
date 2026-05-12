'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { Suspense } from 'react';

function isSameOrigin(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}

function OriginStrip({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const fromMessage = searchParams.get('fromMessage');
  const fromUser = searchParams.get('fromUser');
  const fromUrlRaw = searchParams.get('fromUrl');

  if (!fromMessage) {
    return <>{children}</>;
  }

  const fromUrl =
    fromUrlRaw && isSameOrigin(decodeURIComponent(fromUrlRaw))
      ? decodeURIComponent(fromUrlRaw)
      : '/dashboard';

  const handleDismiss = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('fromMessage');
    params.delete('fromUser');
    params.delete('fromUrl');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div>
      {/* Origin strip */}
      <div
        className="d-flex align-items-center justify-content-between rounded ps-3 pe-2 py-1 mb-0 small"
        style={{
          borderLeft: '3px solid var(--bs-primary)',
          background: 'var(--bs-tertiary-bg)',
        }}
      >
        <span className="d-flex align-items-center gap-2 flex-wrap">
          <i className="bx bx-git-branch text-primary" aria-hidden />
          <span className="text-muted">Created from</span>
          <strong>@{fromUser ?? 'message'}</strong>
          <a
            href={fromUrl}
            className="btn btn-sm btn-outline-primary py-0 px-2"
            style={{ fontSize: '0.75rem', lineHeight: '1.4' }}
          >
            ↩ Return
          </a>
        </span>
        <button
          type="button"
          className="btn-close ms-3"
          style={{ fontSize: '0.6rem' }}
          aria-label="Dismiss origin breadcrumb"
          onClick={handleDismiss}
        />
      </div>

      {/* Connector line */}
      <div
        className="ms-2"
        style={{
          width: 3,
          height: 8,
          background: 'var(--bs-primary)',
          opacity: 0.5,
        }}
      />

      {/* Standard breadcrumb below */}
      {children}
    </div>
  );
}

interface MessageOriginBreadcrumbProps {
  children: React.ReactNode;
}

export default function MessageOriginBreadcrumb({ children }: MessageOriginBreadcrumbProps) {
  return (
    <Suspense fallback={<>{children}</>}>
      <OriginStrip>{children}</OriginStrip>
    </Suspense>
  );
}
