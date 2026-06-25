/**
 * Notification preferences — single source of truth.
 *
 * Exposes only the notification events the backend actually emits today, with
 * the channels that actually exist. Absent/null preferences are treated as
 * "enabled" so existing users keep their current behavior.
 */

export type NotificationChannel = 'push' | 'inApp';

export interface NotificationEventDef {
  key: string;
  label: string;
  description: string;
  channels: NotificationChannel[]; // channels this event supports
}

export const NOTIFICATION_EVENTS: NotificationEventDef[] = [
  {
    key: 'dig',
    label: 'Digs on your messages',
    description: 'When someone presses “I Dig!” on one of your messages.',
    channels: ['push', 'inApp'],
  },
  {
    key: 'push',
    label: 'Pushes of your messages',
    description: 'When someone pushes (reposts) one of your messages, with or without commentary.',
    channels: ['push', 'inApp'],
  },
  {
    key: 'follow',
    label: 'New followers & follow requests',
    description: 'When someone follows you or requests to follow you.',
    channels: ['push'],
  },
];

export function getEventDef(key: string): NotificationEventDef | undefined {
  return NOTIFICATION_EVENTS.find((event) => event.key === key);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Returns true unless `prefs` is an object whose `[eventKey][channel] === false`.
 * Defensive about non-object/null prefs.
 */
export function resolveChannelEnabled(
  prefs: unknown,
  eventKey: string,
  channel: NotificationChannel
): boolean {
  if (!isPlainObject(prefs)) return true;
  const eventPrefs = prefs[eventKey];
  if (!isPlainObject(eventPrefs)) return true;
  return eventPrefs[channel] !== false;
}

export interface EventResponse {
  key: string;
  label: string;
  description: string;
  channels: Record<string, boolean>;
}

/**
 * Build the single-event response object used by GET (per event) and PATCH.
 * Includes ONLY the event's supported channels, each resolved via
 * `resolveChannelEnabled`.
 */
export function buildEventResponse(prefs: unknown, key: string): EventResponse | undefined {
  const def = getEventDef(key);
  if (!def) return undefined;
  const channels: Record<string, boolean> = {};
  for (const channel of def.channels) {
    channels[channel] = resolveChannelEnabled(prefs, def.key, channel);
  }
  return {
    key: def.key,
    label: def.label,
    description: def.description,
    channels,
  };
}

export function buildPreferencesResponse(prefs: unknown): { events: EventResponse[] } {
  const events = NOTIFICATION_EVENTS.map((def) => {
    const channels: Record<string, boolean> = {};
    for (const channel of def.channels) {
      channels[channel] = resolveChannelEnabled(prefs, def.key, channel);
    }
    return {
      key: def.key,
      label: def.label,
      description: def.description,
      channels,
    };
  });
  return { events };
}

/**
 * Returns a NEW plain object: existing prefs (or {}) deep-merged with
 * `{ [key]: { ...existing[key], ...channelUpdates } }`.
 */
export function mergePreference(
  prefs: unknown,
  key: string,
  channelUpdates: Partial<Record<NotificationChannel, boolean>>
): Record<string, unknown> {
  const base: Record<string, unknown> = isPlainObject(prefs) ? { ...prefs } : {};
  const existingEvent = isPlainObject(base[key]) ? (base[key] as Record<string, unknown>) : {};
  base[key] = { ...existingEvent, ...channelUpdates };
  return base;
}
