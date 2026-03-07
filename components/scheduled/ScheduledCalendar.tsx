'use client';

import { useState, useMemo } from 'react';
import { Message } from '@/lib/types';
import ScheduledPostCard from '@/components/scheduled/ScheduledPostCard';

interface Identity {
  id: string;
  provider: string;
}

interface ScheduledCalendarProps {
  messages: Message[];
  identities?: Identity[];
  onUpdated?: () => void;
  onDeleted?: (messageId: string) => void;
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getPostsByDay(messages: Message[]): Map<string, Message[]> {
  const map = new Map<string, Message[]>();
  for (const m of messages) {
    const at = m.scheduledAt ? new Date(m.scheduledAt) : null;
    if (!at) continue;
    const key = toDateKey(at);
    const list = map.get(key) || [];
    list.push(m);
    map.set(key, list);
  }
  return map;
}

export default function ScheduledCalendar({
  messages,
  identities = [],
  onUpdated,
  onDeleted,
}: ScheduledCalendarProps) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const postsByDay = useMemo(() => getPostsByDay(messages), [messages]);

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) {
    week.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const today = new Date();
  const todayKey = toDateKey(today);

  const selectedPosts = selectedDay ? postsByDay.get(selectedDay) || [] : [];

  const monthLabel = new Date(year, month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="scheduled-calendar">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">{monthLabel}</h6>
        <div className="btn-group btn-group-sm">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setViewDate(new Date(year, month - 1))}
            aria-label="Previous month"
          >
            <i className="bx bx-chevron-left" />
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setViewDate(new Date())}
            aria-label="Current month"
          >
            Today
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setViewDate(new Date(year, month + 1))}
            aria-label="Next month"
          >
            <i className="bx bx-chevron-right" />
          </button>
        </div>
      </div>

      <div
        className="calendar-grid mb-3"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '2px',
          fontSize: '0.8rem',
        }}
      >
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center text-muted fw-bold py-1">
            {d}
          </div>
        ))}
        {weeks.flat().map((d, i) => {
          if (d === null) {
            return <div key={`empty-${i}`} />;
          }
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const count = postsByDay.get(key)?.length ?? 0;
          const isPast = key < todayKey;
          const isSelected = selectedDay === key;
          return (
            <button
              key={key}
              type="button"
              className={`btn btn-sm p-1 ${isSelected ? 'btn-primary' : isPast ? 'btn-outline-secondary text-muted' : 'btn-outline-secondary'}`}
              onClick={() => setSelectedDay(isSelected ? null : key)}
              disabled={isPast}
              aria-label={`${d}${count > 0 ? `, ${count} scheduled` : ''}`}
            >
              {d}
              {count > 0 && (
                <span
                  className="badge bg-info ms-1"
                  style={{ fontSize: '0.6rem' }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedDay && selectedPosts.length > 0 && (
        <div className="mt-3">
          <h6 className="small text-muted mb-2">
            {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </h6>
          {selectedPosts.map((msg) => (
            <ScheduledPostCard
              key={msg.id}
              message={msg}
              identities={identities}
              onUpdated={onUpdated}
              onDeleted={onDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}
