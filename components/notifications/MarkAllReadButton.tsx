'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MarkAllReadButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="btn btn-outline-secondary btn-sm"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <>
          <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden />
          Working…
        </>
      ) : (
        'Mark all as read'
      )}
    </button>
  );
}
