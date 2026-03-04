'use client';

import type { HourlyPeriod } from '@/lib/types/weather';

interface RainTodayProps {
  hourly: HourlyPeriod[];
  timeZone?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}

const HOURS_TO_SHOW = 8;

function formatTimeLabel(isoString: string, timeZone?: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    hour12: true,
    timeZone: timeZone || undefined,
  });
}

export default function RainToday({ hourly, timeZone = 'America/Los_Angeles', onRefresh, refreshing }: RainTodayProps) {
  // Show next 6-8 hours from the start of the hourly data
  const periods = hourly.slice(0, HOURS_TO_SHOW);

  if (periods.length === 0) return null;

  const barMaxHeight = 36;

  return (
    <div className="card mt-3">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="card-title mb-0">Rain today</h6>
          {onRefresh && (
            <button
              type="button"
              className="btn btn-link btn-sm p-0 text-muted"
              onClick={onRefresh}
              disabled={refreshing}
              title="Refresh weather"
              aria-label="Refresh weather"
            >
              <i className={`bx bx-recycle ${refreshing ? 'bx-spin' : ''}`}></i>
            </button>
          )}
        </div>
        <div className="d-flex align-items-end gap-2 overflow-auto" style={{ minHeight: 80 }}>
          {periods.map((p) => (
            <div
              key={p.startTime}
              className="d-flex flex-column align-items-center flex-shrink-0"
              style={{ minWidth: 32 }}
            >
              <span className="small text-muted mb-1">{formatTimeLabel(p.startTime, timeZone)}</span>
              <div
                className="bg-primary bg-opacity-25 rounded-top"
                style={{
                  width: 24,
                  height: Math.max(4, (p.probabilityOfPrecipitation / 100) * barMaxHeight),
                }}
                title={`${formatTimeLabel(p.startTime, timeZone)}: ${p.probabilityOfPrecipitation}%`}
              />
              <span className="small text-muted mt-1">{p.probabilityOfPrecipitation}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
