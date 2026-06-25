import { describe, expect, it } from 'vitest';
import {
  NOTIFICATION_EVENTS,
  buildEventResponse,
  buildPreferencesResponse,
  getEventDef,
  mergePreference,
  resolveChannelEnabled,
} from './preferences';

describe('NOTIFICATION_EVENTS catalog', () => {
  it('exposes exactly the three known events with their supported channels', () => {
    expect(NOTIFICATION_EVENTS.map((e) => e.key)).toEqual(['dig', 'push', 'follow']);

    const byKey = Object.fromEntries(NOTIFICATION_EVENTS.map((e) => [e.key, e.channels]));
    expect(byKey.dig).toEqual(['push', 'inApp']);
    expect(byKey.push).toEqual(['push', 'inApp']);
    expect(byKey.follow).toEqual(['push']);
  });

  it('every event has a non-empty label and description', () => {
    for (const event of NOTIFICATION_EVENTS) {
      expect(event.label.length).toBeGreaterThan(0);
      expect(event.description.length).toBeGreaterThan(0);
    }
  });
});

describe('resolveChannelEnabled', () => {
  it('defaults to true for null/undefined/empty/non-object prefs', () => {
    expect(resolveChannelEnabled(null, 'dig', 'push')).toBe(true);
    expect(resolveChannelEnabled(undefined, 'dig', 'push')).toBe(true);
    expect(resolveChannelEnabled({}, 'dig', 'push')).toBe(true);

    // Non-object values: string, number, boolean, array
    expect(resolveChannelEnabled('nope', 'dig', 'push')).toBe(true);
    expect(resolveChannelEnabled(42, 'dig', 'push')).toBe(true);
    expect(resolveChannelEnabled(true, 'dig', 'push')).toBe(true);
    expect(resolveChannelEnabled([], 'dig', 'push')).toBe(true);
  });

  it('defaults to true when the event entry itself is not a plain object', () => {
    expect(resolveChannelEnabled({ dig: null }, 'dig', 'push')).toBe(true);
    expect(resolveChannelEnabled({ dig: 'on' }, 'dig', 'push')).toBe(true);
    expect(resolveChannelEnabled({ dig: [] }, 'dig', 'push')).toBe(true);
  });

  it('returns false ONLY for an explicit `false` on the exact channel', () => {
    const prefs = { dig: { push: false } };
    expect(resolveChannelEnabled(prefs, 'dig', 'push')).toBe(false);
    // Untouched channel on the same event stays enabled.
    expect(resolveChannelEnabled(prefs, 'dig', 'inApp')).toBe(true);
    // Other events are unaffected.
    expect(resolveChannelEnabled(prefs, 'push', 'push')).toBe(true);
    expect(resolveChannelEnabled(prefs, 'follow', 'push')).toBe(true);
  });

  it('treats `true` and other truthy/falsy-but-not-false values as enabled', () => {
    expect(resolveChannelEnabled({ dig: { push: true } }, 'dig', 'push')).toBe(true);
    // Only the literal `false` disables; anything else (even 0/null) is enabled.
    expect(resolveChannelEnabled({ dig: { push: 0 } }, 'dig', 'push')).toBe(true);
    expect(resolveChannelEnabled({ dig: { push: null } }, 'dig', 'push')).toBe(true);
  });
});

describe('getEventDef', () => {
  it('returns the def for each known key', () => {
    expect(getEventDef('dig')?.key).toBe('dig');
    expect(getEventDef('push')?.key).toBe('push');
    expect(getEventDef('follow')?.key).toBe('follow');
    expect(getEventDef('follow')?.channels).toEqual(['push']);
  });

  it('returns undefined for an unknown key', () => {
    expect(getEventDef('nope')).toBeUndefined();
    expect(getEventDef('')).toBeUndefined();
  });
});

describe('buildPreferencesResponse', () => {
  it('returns all three events and defaults everything to true when prefs is null', () => {
    const { events } = buildPreferencesResponse(null);
    expect(events.map((e) => e.key)).toEqual(['dig', 'push', 'follow']);

    for (const event of events) {
      for (const value of Object.values(event.channels)) {
        expect(value).toBe(true);
      }
    }
  });

  it('exposes ONLY each event\'s supported channels', () => {
    const { events } = buildPreferencesResponse(null);
    const byKey = Object.fromEntries(events.map((e) => [e.key, e]));

    expect(Object.keys(byKey.dig.channels).sort()).toEqual(['inApp', 'push']);
    expect(Object.keys(byKey.push.channels).sort()).toEqual(['inApp', 'push']);

    // follow supports only push — no inApp key at all.
    expect(Object.keys(byKey.follow.channels)).toEqual(['push']);
    expect(byKey.follow.channels).not.toHaveProperty('inApp');
  });

  it('reflects an explicit false from stored prefs and leaves siblings enabled', () => {
    const { events } = buildPreferencesResponse({ dig: { push: false } });
    const byKey = Object.fromEntries(events.map((e) => [e.key, e]));

    expect(byKey.dig.channels.push).toBe(false);
    expect(byKey.dig.channels.inApp).toBe(true);
    expect(byKey.push.channels.push).toBe(true);
    expect(byKey.push.channels.inApp).toBe(true);
    expect(byKey.follow.channels.push).toBe(true);
  });

  it('includes label and description for each event', () => {
    const { events } = buildPreferencesResponse(null);
    const dig = events.find((e) => e.key === 'dig')!;
    expect(dig.label).toBe('Digs on your messages');
    expect(dig.description.length).toBeGreaterThan(0);
  });
});

describe('buildEventResponse', () => {
  it('returns a single event shaped like the catalog entry', () => {
    const result = buildEventResponse(null, 'dig');
    expect(result).toBeDefined();
    expect(result!.key).toBe('dig');
    expect(result!.label).toBe('Digs on your messages');
    expect(Object.keys(result!.channels).sort()).toEqual(['inApp', 'push']);
    expect(result!.channels.push).toBe(true);
    expect(result!.channels.inApp).toBe(true);
  });

  it('includes only supported channels for follow', () => {
    const result = buildEventResponse(null, 'follow');
    expect(Object.keys(result!.channels)).toEqual(['push']);
    expect(result!.channels).not.toHaveProperty('inApp');
  });

  it('reflects an explicit false for the requested event', () => {
    const result = buildEventResponse({ dig: { inApp: false } }, 'dig');
    expect(result!.channels.inApp).toBe(false);
    expect(result!.channels.push).toBe(true);
  });

  it('returns undefined for an unknown event key', () => {
    expect(buildEventResponse(null, 'nope')).toBeUndefined();
    expect(buildEventResponse({ dig: { push: false } }, 'unknown')).toBeUndefined();
  });
});

describe('mergePreference', () => {
  it('does not mutate the input prefs object', () => {
    const original = { dig: { push: false } };
    const snapshot = JSON.parse(JSON.stringify(original));

    const result = mergePreference(original, 'dig', { inApp: false });

    expect(original).toEqual(snapshot);
    expect(result).not.toBe(original);
    expect(result.dig).not.toBe(original.dig);
  });

  it('preserves unrelated existing keys and channels while overlaying updates', () => {
    const original = {
      dig: { push: false },
      push: { inApp: false },
    };

    const result = mergePreference(original, 'dig', { inApp: false });

    // Updated event keeps its existing channel and gains the new one.
    expect(result.dig).toEqual({ push: false, inApp: false });
    // Unrelated event is untouched.
    expect(result.push).toEqual({ inApp: false });
  });

  it('overlays new channel values over existing ones for the same channel', () => {
    const result = mergePreference({ dig: { push: false } }, 'dig', { push: true });
    expect(result.dig).toEqual({ push: true });
  });

  it('works when starting from null', () => {
    const result = mergePreference(null, 'dig', { push: false });
    expect(result).toEqual({ dig: { push: false } });
  });

  it('works when starting from an empty object', () => {
    const result = mergePreference({}, 'follow', { push: false });
    expect(result).toEqual({ follow: { push: false } });
  });

  it('replaces a non-object existing event entry with the updates', () => {
    const result = mergePreference({ dig: 'garbage' }, 'dig', { push: false });
    expect(result.dig).toEqual({ push: false });
  });

  it('treats non-object prefs as an empty base', () => {
    expect(mergePreference('garbage', 'dig', { push: false })).toEqual({ dig: { push: false } });
    expect(mergePreference(undefined, 'dig', { push: false })).toEqual({ dig: { push: false } });
  });
});
