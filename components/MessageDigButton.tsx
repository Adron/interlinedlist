'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';

/** Matches Reply / Push text actions on message cards */
export const MESSAGE_ACTION_TEXT_STYLE: CSSProperties = { fontSize: '0.8rem' };
export const MESSAGE_ACTION_TEXT_STYLE_COMPACT: CSSProperties = { fontSize: '0.75rem' };

export const messageActionLinkClass =
  'btn btn-sm btn-link text-muted p-0 align-baseline text-decoration-none';

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

  const fontStyle = compact ? MESSAGE_ACTION_TEXT_STYLE_COMPACT : MESSAGE_ACTION_TEXT_STYLE;

  if (!isSignedIn) {
    return (
      <span className="d-inline-flex align-items-center flex-wrap gap-1" style={fontStyle}>
        <span className="text-muted">
          I Dig! <span className="fw-semibold text-body">{count}</span>
        </span>
        <span className="text-muted" aria-hidden>
          ·
        </span>
        <Link href="/login" className={`${messageActionLinkClass} text-muted`} style={fontStyle}>
          Sign in to dig
        </Link>
      </span>
    );
  }

  /** Pressed purple control — similar line height to Reply link, slightly padded when active */
  const pressedStyle: CSSProperties = {
    ...fontStyle,
    color: '#fff',
    backgroundColor: '#6f42c1',
    borderRadius: '0.2rem',
    padding: compact ? '0.08rem 0.35rem' : '0.12rem 0.45rem',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.22)',
    border: '1px solid #5a32a3',
    lineHeight: 1.25,
  };

  return (
    <button
      type="button"
      className={
        dugByMe
          ? 'btn btn-sm border-0 align-baseline shadow-none'
          : `${messageActionLinkClass} align-baseline`
      }
      onClick={handleClick}
      disabled={pending}
      aria-pressed={dugByMe}
      aria-label={dugByMe ? `Undig this message, ${count} digs` : `I dig this message, ${count} digs`}
      style={dugByMe ? pressedStyle : fontStyle}
    >
      I Dig!{count > 0 ? ` · ${count}` : ''}
    </button>
  );
}
