'use client';

import type { HourlyPeriod } from '@/lib/types/weather';

interface RainNext60Props {
  hourly: HourlyPeriod[];
  onRefresh?: () => void;
  refreshing?: boolean;
}

/** Formats hour in the browser's local timezone */
function formatHourLabel(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    hour12: true,
  });
}

export default function RainNext60({ hourly, onRefresh, refreshing }: RainNext60Props) {
  // Next 60 min = first 2 hourly periods (current hour + next hour)
  const periods = hourly.slice(0, 2);

  if (periods.length === 0) return null;

  return (
    <div className="card mt-3">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="card-title mb-0">Rain next 60 min</h6>
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
        <div className="d-flex align-items-end gap-2" style={{ minHeight: 48 }}>
          {periods.map((p) => (
            <div key={p.startTime} className="flex-grow-1 d-flex flex-column align-items-center">
              <span className="small text-muted mb-1">{formatHourLabel(p.startTime)}</span>
              <div
                className="bg-primary bg-opacity-25 rounded-top"
                style={{
                  width: '100%',
                  height: Math.max(4, (p.probabilityOfPrecipitation / 100) * 40),
                  minWidth: 24,
                }}
                title={`${p.probabilityOfPrecipitation}% chance`}
              />
              <span className="small mt-1">{p.probabilityOfPrecipitation}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
