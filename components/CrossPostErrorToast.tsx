'use client';

import { useEffect, useState } from 'react';

interface CrossPostErrorToastProps {
  errors: Array<{ instanceName: string; error?: string }>;
  onDismiss?: () => void;
  durationMs?: number;
}

export default function CrossPostErrorToast({
  errors,
  onDismiss,
  durationMs = 5000,
}: CrossPostErrorToastProps) {
  const [visible, setVisible] = useState(errors.length > 0);

  useEffect(() => {
    if (errors.length === 0) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, durationMs);
    return () => clearTimeout(t);
  }, [errors, durationMs, onDismiss]);

  if (!visible || errors.length === 0) return null;

  return (
    <div
      className="position-fixed bottom-0 end-0 m-3 p-3 rounded shadow"
      style={{
        backgroundColor: 'var(--bs-danger-bg-subtle, #f8d7da)',
        border: '1px solid var(--bs-danger-border-subtle, #f5c2c7)',
        maxWidth: 360,
        zIndex: 1050,
      }}
      role="alert"
    >
      <div className="d-flex justify-content-between align-items-start gap-2">
        <div>
          <strong className="text-danger">Cross-post failed</strong>
          <ul className="mb-0 mt-1 ps-3" style={{ fontSize: '0.9rem' }}>
            {errors.map((e, i) => (
              <li key={i}>
                {e.instanceName}: {e.error || 'Unknown error'}
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          className="btn-close btn-close-sm"
          onClick={() => {
            setVisible(false);
            onDismiss?.();
          }}
          aria-label="Dismiss"
        />
      </div>
    </div>
  );
}
