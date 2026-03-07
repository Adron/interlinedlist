'use client';

import { useState } from 'react';
import ScheduledQueueList from '@/components/scheduled/ScheduledQueueList';
import ScheduledCalendarWrapper from '@/components/scheduled/ScheduledCalendarWrapper';

type Range = 'today' | 'week' | 'month';
type Tab = 'queue' | 'calendar';

export default function ScheduledPageContent() {
  const [range, setRange] = useState<Range>('month');
  const [tab, setTab] = useState<Tab>('queue');

  return (
    <div className="scheduled-page">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div className="btn-group" role="group" aria-label="Date range filter">
          <input
            type="radio"
            className="btn-check"
            name="range"
            id="range-today"
            checked={range === 'today'}
            onChange={() => setRange('today')}
          />
          <label className="btn btn-outline-secondary btn-sm" htmlFor="range-today">
            Today
          </label>
          <input
            type="radio"
            className="btn-check"
            name="range"
            id="range-week"
            checked={range === 'week'}
            onChange={() => setRange('week')}
          />
          <label className="btn btn-outline-secondary btn-sm" htmlFor="range-week">
            This week
          </label>
          <input
            type="radio"
            className="btn-check"
            name="range"
            id="range-month"
            checked={range === 'month'}
            onChange={() => setRange('month')}
          />
          <label className="btn btn-outline-secondary btn-sm" htmlFor="range-month">
            This month
          </label>
        </div>
        <ul className="nav nav-tabs" role="tablist">
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${tab === 'queue' ? 'active' : ''}`}
              onClick={() => setTab('queue')}
              role="tab"
              aria-selected={tab === 'queue'}
            >
              Queue
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${tab === 'calendar' ? 'active' : ''}`}
              onClick={() => setTab('calendar')}
              role="tab"
              aria-selected={tab === 'calendar'}
            >
              Calendar
            </button>
          </li>
        </ul>
      </div>

      {tab === 'queue' && <ScheduledQueueList range={range} />}
      {tab === 'calendar' && <ScheduledCalendarWrapper />}
    </div>
  );
}
