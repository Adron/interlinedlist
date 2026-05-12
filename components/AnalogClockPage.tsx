'use client';

import { useEffect, useState } from 'react';

function pad2(n: number) {
  return n.toString().padStart(2, '0');
}

export default function AnalogClockPage() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 50);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return (
      <div
        className="d-flex align-items-center justify-content-center text-muted"
        style={{ minHeight: 'calc(100dvh - var(--bs-topbar-height, 70px) - 8rem)' }}
      >
        Loading…
      </div>
    );
  }

  const ms = now.getMilliseconds();
  const s = now.getSeconds();
  const m = now.getMinutes();
  const h = now.getHours();

  const secondDeg = (s + ms / 1000) * 6;
  const minuteDeg = (m + s / 60 + ms / 60000) * 6;
  const hourDeg = ((h % 12) + m / 60 + s / 3600) * 30;

  const military = `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  const standard = now.toLocaleTimeString('en-US', {
    hour12: true,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
  const dateLong = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const faceStroke = 'var(--color-border, #dee2e6)';
  const tickMajor = 'var(--color-text, #212529)';
  const tickMinor = 'var(--color-text-secondary, #6c757d)';
  const handHour = 'var(--color-text, #212529)';
  const handMinute = 'var(--color-text, #212529)';
  const handSecond = 'var(--bs-danger, #dc3545)';
  const hubFill = 'var(--color-text, #212529)';

  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center px-2 py-3"
      style={{
        minHeight: 'calc(100dvh - var(--bs-topbar-height, 70px) - var(--bs-footer-height, 60px) - 4rem)',
      }}
    >
      <h1 className="visually-hidden">Clock — local time and date</h1>
      <div
        className="position-relative w-100 d-flex justify-content-center"
        style={{ maxWidth: 'min(92vw, calc(100dvh - 14rem))' }}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-100"
          style={{ aspectRatio: '1', maxHeight: 'min(78dvh, 720px)' }}
          aria-hidden
        >
          <circle cx="50" cy="50" r="48" fill="none" stroke={faceStroke} strokeWidth="1.2" />

          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const x1 = 50 + Math.cos(a) * 44;
            const y1 = 50 + Math.sin(a) * 44;
            const x2 = 50 + Math.cos(a) * 40;
            const y2 = 50 + Math.sin(a) * 40;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={tickMajor}
                strokeWidth="2"
                strokeLinecap="round"
              />
            );
          })}

          {Array.from({ length: 60 }, (_, i) => {
            if (i % 5 === 0) return null;
            const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
            const x1 = 50 + Math.cos(a) * 43;
            const y1 = 50 + Math.sin(a) * 43;
            const x2 = 50 + Math.cos(a) * 41;
            const y2 = 50 + Math.sin(a) * 41;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={tickMinor}
                strokeWidth="0.8"
                strokeLinecap="round"
              />
            );
          })}

          <g transform={`rotate(${hourDeg} 50 50)`}>
            <line
              x1="50"
              y1="50"
              x2="50"
              y2="24"
              stroke={handHour}
              strokeWidth="3.2"
              strokeLinecap="round"
            />
          </g>
          <g transform={`rotate(${minuteDeg} 50 50)`}>
            <line
              x1="50"
              y1="50"
              x2="50"
              y2="14"
              stroke={handMinute}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </g>
          <g transform={`rotate(${secondDeg} 50 50)`}>
            <line
              x1="50"
              y1="54"
              x2="50"
              y2="12"
              stroke={handSecond}
              strokeWidth="1"
              strokeLinecap="round"
            />
          </g>
          <circle cx="50" cy="50" r="2.2" fill={hubFill} />
        </svg>
      </div>

      <div className="text-center mt-3 mt-md-4 w-100" style={{ maxWidth: '42rem' }}>
        <p className="font-monospace fs-1 mb-2 mb-md-3 fw-semibold" style={{ letterSpacing: '0.08em' }}>
          <span className="visually-hidden">24-hour: </span>
          {military}
        </p>
        <p className="fs-3 mb-2 text-body-secondary">
          <span className="visually-hidden">12-hour: </span>
          {standard}
        </p>
        <p className="fs-5 mb-0">
          <span className="visually-hidden">Date: </span>
          {dateLong}
        </p>
      </div>
    </div>
  );
}
