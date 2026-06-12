/**
 * Unit tests for lib/linkedin/provider-data.ts
 *
 * Pure functions — no mocking needed.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getActiveLinkedInAccessToken,
  hasLinkedInOrgScope,
  type LinkedInProviderData,
} from './provider-data';

// ─── hasLinkedInOrgScope ───────────────────────────────────────────────────

describe('hasLinkedInOrgScope — granted', () => {
  it('returns true when rw_organization_admin is the only scope', () => {
    expect(hasLinkedInOrgScope('rw_organization_admin')).toBe(true);
  });

  it('returns true when rw_organization_admin appears among space-separated scopes', () => {
    expect(
      hasLinkedInOrgScope(
        'openid profile email w_member_social rw_organization_admin w_organization_social'
      )
    ).toBe(true);
  });

  it('returns true when scopes are comma-separated', () => {
    expect(hasLinkedInOrgScope('openid,profile,rw_organization_admin')).toBe(true);
  });

  it('returns true when scopes are comma+space separated', () => {
    expect(hasLinkedInOrgScope('openid, profile, rw_organization_admin')).toBe(true);
  });
});

describe('hasLinkedInOrgScope — not granted', () => {
  it('returns false for the minimal sign-in scopes', () => {
    expect(hasLinkedInOrgScope('openid profile email w_member_social')).toBe(false);
  });

  it('returns false for null', () => {
    expect(hasLinkedInOrgScope(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(hasLinkedInOrgScope(undefined)).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(hasLinkedInOrgScope('')).toBe(false);
  });

  it('does not match a scope that merely contains the org scope as a substring', () => {
    expect(hasLinkedInOrgScope('rw_organization_admin_extra')).toBe(false);
    expect(hasLinkedInOrgScope('xrw_organization_admin')).toBe(false);
  });

  it('does not match w_organization_social alone', () => {
    expect(hasLinkedInOrgScope('w_organization_social')).toBe(false);
  });
});

// ─── getActiveLinkedInAccessToken ──────────────────────────────────────────

describe('getActiveLinkedInAccessToken — active tokens', () => {
  afterEach(() => vi.useRealTimers());

  it('returns the token when no expires_at is stored (legacy row = active)', () => {
    expect(getActiveLinkedInAccessToken({ access_token: 'tok-1' })).toBe('tok-1');
  });

  it('returns the token when expires_at is in the future', () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    expect(
      getActiveLinkedInAccessToken({ access_token: 'tok-2', expires_at: future })
    ).toBe('tok-2');
  });

  it('returns the token when expires_at is an unparseable string (treated as active)', () => {
    expect(
      getActiveLinkedInAccessToken({ access_token: 'tok-3', expires_at: 'not-a-date' })
    ).toBe('tok-3');
  });

  it('returns the token one millisecond before expiry', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-12T12:00:00.000Z'));
    expect(
      getActiveLinkedInAccessToken({
        access_token: 'tok-4',
        expires_at: '2026-06-12T12:00:00.001Z',
      })
    ).toBe('tok-4');
  });
});

describe('getActiveLinkedInAccessToken — inactive tokens', () => {
  afterEach(() => vi.useRealTimers());

  it('returns null when expires_at is in the past', () => {
    expect(
      getActiveLinkedInAccessToken({
        access_token: 'tok-expired',
        expires_at: '2020-01-01T00:00:00.000Z',
      })
    ).toBeNull();
  });

  it('returns null exactly at the expiry instant (expires_at <= now)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-12T12:00:00.000Z'));
    expect(
      getActiveLinkedInAccessToken({
        access_token: 'tok-edge',
        expires_at: '2026-06-12T12:00:00.000Z',
      })
    ).toBeNull();
  });

  it('returns null when providerData is null', () => {
    expect(getActiveLinkedInAccessToken(null)).toBeNull();
  });

  it('returns null when providerData is undefined', () => {
    expect(getActiveLinkedInAccessToken(undefined)).toBeNull();
  });

  it('returns null when access_token is absent', () => {
    expect(getActiveLinkedInAccessToken({})).toBeNull();
  });

  it('returns null when access_token is an empty string', () => {
    expect(getActiveLinkedInAccessToken({ access_token: '' })).toBeNull();
  });

  it('returns null when access_token is not a string', () => {
    expect(
      getActiveLinkedInAccessToken({ access_token: 42 } as unknown as LinkedInProviderData)
    ).toBeNull();
  });
});
