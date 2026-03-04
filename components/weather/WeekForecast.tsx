'use client';

import type { WeeklyPeriod } from '@/lib/types/weather';

interface WeekForecastProps {
  weekly: WeeklyPeriod[];
  onRefresh?: () => void;
  refreshing?: boolean;
}

// Map NOAA icon URL to Boxicon (extract condition from path like .../day/sct)
function getConditionIcon(noaaIcon: string, shortForecast: string): string {
  if (noaaIcon) {
    const lower = noaaIcon.toLowerCase();
    if (lower.includes('rain')) return 'bx-cloud-rain';
    if (lower.includes('snow')) return 'bx-cloud-snow';
    if (lower.includes('lightning') || lower.includes('thunder')) return 'bx-cloud-lightning';
    if (lower.includes('skc') || lower.includes('few')) return 'bx-sun';
    if (lower.includes('sct') || lower.includes('bkn')) return 'bx-cloud';
    if (lower.includes('ovc')) return 'bx-cloud';
  }
  const sf = shortForecast.toLowerCase();
  if (sf.includes('clear') || sf.includes('sunny')) return 'bx-sun';
  if (sf.includes('rain')) return 'bx-cloud-rain';
  if (sf.includes('snow')) return 'bx-cloud-snow';
  if (sf.includes('cloud')) return 'bx-cloud';
  return 'bx-cloud';
}

interface DaySummary {
  dayName: string;
  high: number;
  low: number;
  condition: string;
  icon: string;
  maxPrecip: number;
}

function aggregateByDay(periods: WeeklyPeriod[]): DaySummary[] {
  const byDate = new Map<string, WeeklyPeriod[]>();
  for (const p of periods) {
    const date = new Date(p.startTime);
    const key = date.toISOString().slice(0, 10);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(p);
  }

  const summaries: DaySummary[] = [];
  const sortedKeys = [...byDate.keys()].sort();

  for (const key of sortedKeys) {
    const dayPeriods = byDate.get(key)!;
    const dayPeriod = dayPeriods.find((p) => p.isDaytime);
    const nightPeriod = dayPeriods.find((p) => !p.isDaytime);

    const temps = dayPeriods.map((p) => p.temperature);
    const high = dayPeriod?.temperature ?? (temps.length > 0 ? Math.max(...temps) : 0);
    const low = nightPeriod?.temperature ?? (temps.length > 0 ? Math.min(...temps) : 0);
    const primary = dayPeriod ?? dayPeriods[0];
    const maxPrecip = Math.max(...dayPeriods.map((p) => p.probabilityOfPrecipitation));

    const date = new Date(key);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

    summaries.push({
      dayName,
      high,
      low,
      condition: primary.shortForecast,
      icon: getConditionIcon(primary.icon, primary.shortForecast),
      maxPrecip,
    });
  }

  return summaries;
}

export default function WeekForecast({ weekly, onRefresh, refreshing }: WeekForecastProps) {
  const days = aggregateByDay(weekly);

  if (days.length === 0) return null;

  return (
    <div className="card mt-3">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="card-title mb-0">Rest of week</h6>
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
        <div className="d-flex flex-column gap-2">
          {days.map((d) => (
            <div
              key={d.dayName + d.high + d.low}
              className="d-flex align-items-center justify-content-between"
            >
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted" style={{ minWidth: 36 }}>
                  {d.dayName}
                </span>
                <i className={`bx ${d.icon} text-primary`} />
                <span className="small">{d.condition}</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span className="small text-muted">{d.maxPrecip}%</span>
                <span className="small">
                  {d.high}°/{d.low}°
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
