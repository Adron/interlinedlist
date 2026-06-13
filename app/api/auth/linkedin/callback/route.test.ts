/**
 * Unit tests for GET /api/auth/linkedin/callback
 *
 * Focused on the behavior added with personal LinkedIn company pages:
 *  - providerData now stores the granted scope and a derived expires_at
 *  - link mode discovers admin company pages when the org scope was granted
 *  - page discovery failure must NOT fail the link (identity already saved)
 *  - plain sign-in never triggers page discovery
 *
 * Mocks:
 *  - @/lib/prisma                  — prevents real DB calls
 *  - @/lib/auth/oauth-linkedin     — controls token exchange + userinfo
 *  - @/lib/auth/oauth-state        — controls the state cookie
 *  - @/lib/auth/session            — controls auth + session creation
 *  - @/lib/linkedin/personal-pages — observes/controls the page sync
 *
 * hasLinkedInOrgScope (lib/linkedin/provider-data) is intentionally NOT
 * mocked — the real scope parsing is part of the behavior under test.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { APP_URL } from '@/lib/config/app';

// ── module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/lib/prisma', () => ({
  prisma: {
    linkedIdentity: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/oauth-linkedin', () => ({
  exchangeLinkedInCode: vi.fn(),
  fetchLinkedInUser: vi.fn(),
  getLinkedInRedirectUri: vi.fn(() => 'http://localhost/api/auth/linkedin/callback'),
  LINKEDIN_PROVIDER: 'linkedin',
}));

vi.mock('@/lib/auth/oauth-state', () => ({
  getOAuthStateCookie: vi.fn(),
  deleteOAuthStateCookie: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: vi.fn(),
  createSession: vi.fn(async () => 'session-cookie-value'),
  getSessionCookieOptions: vi.fn(() => ({ httpOnly: true, path: '/' })),
}));

vi.mock('@/lib/auth/sync-token', () => ({
  createSyncTokenForUser: vi.fn(async () => 'sync-token'),
}));

vi.mock('@/lib/auth/pkce', () => ({
  isMobileRedirectUri: vi.fn(() => false),
}));

vi.mock('@/lib/auth/password', () => ({
  hashPassword: vi.fn(async () => 'hashed-password'),
}));

vi.mock('@/lib/organizations/queries', () => ({
  ensureUserInPublicOrganization: vi.fn(async () => undefined),
}));

vi.mock('@/lib/analytics/track', () => ({
  trackAction: vi.fn(async () => undefined),
}));

vi.mock('@/lib/linkedin/personal-pages', () => ({
  syncLinkedInPersonalPages: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { exchangeLinkedInCode, fetchLinkedInUser } from '@/lib/auth/oauth-linkedin';
import { getOAuthStateCookie } from '@/lib/auth/oauth-state';
import { getCurrentUser } from '@/lib/auth/session';
import { syncLinkedInPersonalPages } from '@/lib/linkedin/personal-pages';
import { GET } from './route';

// ── helpers ──────────────────────────────────────────────────────────────────

const ORG_SCOPE =
  'openid profile email w_member_social rw_organization_admin w_organization_social';
const PERSONAL_SCOPE = 'openid profile email w_member_social';

function makeRequest(params: Record<string, string> = { code: 'auth-code', state: 'state-1' }) {
  const url = new URL('http://localhost/api/auth/linkedin/callback');
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return new NextRequest(url.toString());
}

function makeOAuthState(overrides: Partial<{ link: boolean; state: string; provider: string }> = {}) {
  return {
    state: 'state-1',
    codeVerifier: '',
    link: false,
    provider: 'linkedin',
    ...overrides,
  };
}

function makeTokens(overrides: Partial<{ access_token: string; expires_in?: number; scope?: string }> = {}) {
  return {
    access_token: 'li-access-token',
    expires_in: 3600,
    scope: ORG_SCOPE,
    ...overrides,
  };
}

const linkedInUser = {
  sub: 'li-user-1',
  name: 'Pat Example',
  email: 'pat@example.com',
  picture: 'https://media.example/pic.jpg',
};

function locationOf(res: Response): string {
  return res.headers.get('location') ?? '';
}

beforeEach(() => {
  vi.mocked(fetchLinkedInUser).mockResolvedValue(linkedInUser as never);
  vi.mocked(prisma.linkedIdentity.upsert).mockResolvedValue({
    id: 'identity-1',
    userId: 'user-1',
  } as never);
  vi.mocked(prisma.linkedIdentity.findMany).mockResolvedValue([] as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ── guards (pre-existing behavior, cheap regression locks) ──────────────────

describe('GET /api/auth/linkedin/callback — guards', () => {
  it('redirects to login when code or state is missing', async () => {
    const res = await GET(makeRequest({ state: 'state-1' }));
    expect(locationOf(res)).toContain(`${APP_URL}/login`);
    expect(exchangeLinkedInCode).not.toHaveBeenCalled();
  });

  it('redirects to login when the state cookie does not match', async () => {
    vi.mocked(getOAuthStateCookie).mockResolvedValue(makeOAuthState({ state: 'other' }) as never);

    const res = await GET(makeRequest());
    expect(locationOf(res)).toContain(`${APP_URL}/login`);
    expect(exchangeLinkedInCode).not.toHaveBeenCalled();
  });

  it('redirects to login when link is requested but no user is signed in', async () => {
    vi.mocked(getOAuthStateCookie).mockResolvedValue(makeOAuthState({ link: true }) as never);
    vi.mocked(exchangeLinkedInCode).mockResolvedValue(makeTokens() as never);
    vi.mocked(getCurrentUser).mockResolvedValue(null as never);

    const res = await GET(makeRequest());
    expect(locationOf(res)).toContain(`${APP_URL}/login`);
    expect(prisma.linkedIdentity.upsert).not.toHaveBeenCalled();
    expect(syncLinkedInPersonalPages).not.toHaveBeenCalled();
  });
});

// ── providerData: scope + expires_at ─────────────────────────────────────────

describe('GET /api/auth/linkedin/callback — providerData scope/expiry (link mode)', () => {
  beforeEach(() => {
    vi.mocked(getOAuthStateCookie).mockResolvedValue(makeOAuthState({ link: true }) as never);
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'user-1' } as never);
    vi.mocked(syncLinkedInPersonalPages).mockResolvedValue([] as never);
  });

  it('stores scope and a derived expires_at in providerData on both update and create', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-12T00:00:00.000Z'));
    vi.mocked(exchangeLinkedInCode).mockResolvedValue(
      makeTokens({ expires_in: 3600 }) as never
    );

    await GET(makeRequest());

    const expected = {
      access_token: 'li-access-token',
      expires_in: 3600,
      scope: ORG_SCOPE,
      expires_at: '2026-06-12T01:00:00.000Z',
    };
    const call = vi.mocked(prisma.linkedIdentity.upsert).mock.calls[0][0] as {
      update: { providerData: object };
      create: { providerData: object };
    };
    expect(call.update.providerData).toEqual(expected);
    expect(call.create.providerData).toEqual(expected);
  });

  it('omits scope and expires_at when the token response lacks them', async () => {
    vi.mocked(exchangeLinkedInCode).mockResolvedValue(
      { access_token: 'li-access-token' } as never
    );

    await GET(makeRequest());

    const call = vi.mocked(prisma.linkedIdentity.upsert).mock.calls[0][0] as {
      update: { providerData: Record<string, unknown> };
    };
    expect(call.update.providerData).not.toHaveProperty('scope');
    expect(call.update.providerData).not.toHaveProperty('expires_at');
    expect(call.update.providerData.access_token).toBe('li-access-token');
  });
});

// ── link mode: company page discovery ────────────────────────────────────────

describe('GET /api/auth/linkedin/callback — page discovery on link', () => {
  beforeEach(() => {
    vi.mocked(getOAuthStateCookie).mockResolvedValue(makeOAuthState({ link: true }) as never);
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'user-1' } as never);
  });

  it('syncs personal pages with the upserted identity id and the access token when the org scope was granted', async () => {
    vi.mocked(exchangeLinkedInCode).mockResolvedValue(makeTokens() as never);
    vi.mocked(syncLinkedInPersonalPages).mockResolvedValue([] as never);

    const res = await GET(makeRequest());

    expect(syncLinkedInPersonalPages).toHaveBeenCalledWith('identity-1', 'li-access-token');
    expect(decodeURIComponent(locationOf(res))).toContain('/integrations');
    expect(decodeURIComponent(locationOf(res)).replace(/\+/g, ' ')).toMatch(
      /linked successfully/i
    );
  });

  it('does not sync pages when the granted scope lacks rw_organization_admin', async () => {
    vi.mocked(exchangeLinkedInCode).mockResolvedValue(
      makeTokens({ scope: PERSONAL_SCOPE }) as never
    );

    const res = await GET(makeRequest());

    expect(syncLinkedInPersonalPages).not.toHaveBeenCalled();
    expect(decodeURIComponent(locationOf(res))).toContain('/integrations');
  });

  it('does not sync pages when the token response has no scope at all', async () => {
    vi.mocked(exchangeLinkedInCode).mockResolvedValue(
      makeTokens({ scope: undefined }) as never
    );

    await GET(makeRequest());

    expect(syncLinkedInPersonalPages).not.toHaveBeenCalled();
  });

  it('still completes the link when page discovery throws (identity saved, success redirect)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(exchangeLinkedInCode).mockResolvedValue(makeTokens() as never);
    vi.mocked(syncLinkedInPersonalPages).mockRejectedValue(
      new Error('Failed to fetch LinkedIn admin pages: HTTP 500')
    );

    const res = await GET(makeRequest());

    expect(prisma.linkedIdentity.upsert).toHaveBeenCalledTimes(1);
    expect(decodeURIComponent(locationOf(res))).toContain('/integrations');
    expect(decodeURIComponent(locationOf(res)).replace(/\+/g, ' ')).toMatch(
      /linked successfully/i
    );
    expect(decodeURIComponent(locationOf(res))).not.toContain('/login');
    expect(consoleError).toHaveBeenCalled();
  });

  it('upserts the identity before attempting page discovery', async () => {
    const order: string[] = [];
    vi.mocked(exchangeLinkedInCode).mockResolvedValue(makeTokens() as never);
    vi.mocked(prisma.linkedIdentity.upsert).mockImplementation((async () => {
      order.push('upsert');
      return { id: 'identity-1', userId: 'user-1' };
    }) as never);
    vi.mocked(syncLinkedInPersonalPages).mockImplementation(async () => {
      order.push('sync');
      return [] as never;
    });

    await GET(makeRequest());

    expect(order).toEqual(['upsert', 'sync']);
  });
});

// ── sign-in mode: no page discovery ──────────────────────────────────────────

describe('GET /api/auth/linkedin/callback — plain sign-in', () => {
  beforeEach(() => {
    vi.mocked(getOAuthStateCookie).mockResolvedValue(makeOAuthState({ link: false }) as never);
  });

  it('refreshes providerData (including scope and expires_at) on the existing identity', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-12T00:00:00.000Z'));
    vi.mocked(exchangeLinkedInCode).mockResolvedValue(
      makeTokens({ expires_in: 7200 }) as never
    );
    vi.mocked(prisma.linkedIdentity.findMany).mockResolvedValue([
      { id: 'identity-9', userId: 'user-9' },
    ] as never);
    vi.mocked(prisma.linkedIdentity.update).mockResolvedValue({} as never);

    const res = await GET(makeRequest());

    const call = vi.mocked(prisma.linkedIdentity.update).mock.calls[0][0] as {
      data: { providerData: object };
    };
    expect(call.data.providerData).toEqual({
      access_token: 'li-access-token',
      expires_in: 7200,
      scope: ORG_SCOPE,
      expires_at: '2026-06-12T02:00:00.000Z',
    });
    expect(locationOf(res)).toContain(`${APP_URL}/dashboard`);
  });

  it('never runs page discovery on sign-in, even when the org scope is present', async () => {
    vi.mocked(exchangeLinkedInCode).mockResolvedValue(makeTokens() as never);
    vi.mocked(prisma.linkedIdentity.findMany).mockResolvedValue([
      { id: 'identity-9', userId: 'user-9' },
    ] as never);
    vi.mocked(prisma.linkedIdentity.update).mockResolvedValue({} as never);

    await GET(makeRequest());

    expect(syncLinkedInPersonalPages).not.toHaveBeenCalled();
  });
});
