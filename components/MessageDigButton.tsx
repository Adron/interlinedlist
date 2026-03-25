'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface MessageDigButtonProps {
  messageId: string;
  initialCount: number;
  initialDugByMe: boolean;
  isSignedIn: boolean;
  /** Smaller layout for nested replies */
  compact?: boolean;
}

export default function MessageDigButton({
  messageId,
  initialCount,
  initialDugByMe,
  isSignedIn,
  compact = false,
}: MessageDigButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [dugByMe, setDugByMe] = useState(initialDugByMe);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setCount(initialCount);
    setDugByMe(initialDugByMe);
  }, [initialCount, initialDugByMe]);

  const handleClick = async () => {
    if (!isSignedIn || pending) return;
    setPending(true);
    const willDig = !dugByMe;
    const prevCount = count;
    const prevDug = dugByMe;
    setDugByMe(willDig);
    setCount((c) => (willDig ? c + 1 : Math.max(0, c - 1)));
    try {
      const res = await fetch(`/api/messages/${encodeURIComponent(messageId)}/dig`, {
        method: willDig ? 'POST' : 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        setDugByMe(prevDug);
        setCount(prevCount);
        return;
      }
      const data = (await res.json()) as { digCount?: number; dugByMe?: boolean };
      if (typeof data.digCount === 'number') setCount(data.digCount);
      if (typeof data.dugByMe === 'boolean') setDugByMe(data.dugByMe);
    } catch {
      setDugByMe(prevDug);
      setCount(prevCount);
    } finally {
      setPending(false);
    }
  };

  const fontSize = compact ? '0.75rem' : '0.8rem';
  const btnClass = compact ? 'btn btn-sm py-0 px-2' : 'btn btn-sm';

  if (!isSignedIn) {
    return (
      <div className="d-flex align-items-center flex-wrap gap-2" style={{ fontSize }}>
        <span className="text-muted">
          I Dig! <span className="fw-semibold text-body">{count}</span>
        </span>
        <Link href="/login" className="text-decoration-none" style={{ fontSize }}>
          Sign in to dig
        </Link>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`${btnClass} ${dugByMe ? 'btn-primary' : 'btn-outline-secondary'}`}
      onClick={handleClick}
      disabled={pending}
      aria-pressed={dugByMe}
      aria-label={dugByMe ? `Undig this message, ${count} digs` : `I dig this message, ${count} digs`}
      style={{ fontSize }}
    >
      I Dig!{count > 0 ? ` · ${count}` : ''}
    </button>
  );
}
