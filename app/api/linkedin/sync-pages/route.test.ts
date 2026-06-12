/**
 * Unit tests for POST /api/linkedin/sync-pages
 *
 * Mocks:
 *  - @/lib/prisma                  — prevents real DB calls
 *  - @/lib/auth/session            — controls auth result
 *  - @/lib/linkedin/personal-pages — controls the sync result / failure
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/lib/prisma', () => ({
  prisma: {
    linkedIdentity: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/linkedin/personal-pages', () => ({
  syncLinkedInPersonalPages: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { syncLinkedInPersonalPages } from '@/lib/linkedin/personal-pages';
import { POST } from './route';

// ── helpers ──────────────────────────────────────────────────────────────────

const mockUser = { id: 'user-1' };

const ORG_SCOPE =
  'openid profile email w_member_social rw_organization_admin w_organization_social';

function makeIdentity(overrides?: {
  providerData?: Record<string, unknown> | null;
}) {
  return {
    id: 'identity-1',
    providerData:
      overrides?.providerData !== undefined
        ? overrides.providerData
        : { access_token: 'personal-token', scope: ORG_SCOPE },
  };
}

function makeSyncedPage(overrides?: { id?: string; pageName?: string }) {
  return {
    id: overrides?.id ?? 'pp-uuid-1',
    identityId: 'identity-1',
    linkedInPageId: '12345',
    pageName: overrides?.pageName ?? 'Acme Corp',
    pageLogoUrl: null,
    lastSyncedAt: new Date('2026-06-12T00:00:00.000Z'),
  };
}

async function json(response: Response) {
  return response.json();
}

afterEach(() => vi.restoreAllMocks());

// ── auth ─────────────────────────────────────────────────────────────────────

describe('POST /api/linkedin/sync-pages — auth', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null as never);

    const res = await POST();
    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error).toMatch(/unauthorized/i);
  });
});

// ── not linked ───────────────────────────────────────────────────────────────

describe('POST /api/linkedin/sync-pages — account not linked', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);
  });

  it('returns 400 with code "not_linked" when no LinkedIn identity exists', async () => {
    vi.mocked(prisma.linkedIdentity.findFirst).mockResolvedValue(null as never);

    const res = await POST();
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.code).toBe('not_linked');
    expect(syncLinkedInPersonalPages).not.toHaveBeenCalled();
  });

  it('looks up the identity scoped to the user and provider "linkedin"', async () => {
    vi.mocked(prisma.linkedIdentity.findFirst).mockResolvedValue(null as never);

    await POST();

    expect(prisma.linkedIdentity.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-1', provider: 'linkedin' }),
      })
    );
  });
});

// ── org scope / token checks ─────────────────────────────────────────────────

describe('POST /api/linkedin/sync-pages — org_scope_missing', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);
  });

  it('returns 400 with code "org_scope_missing" when the scope lacks rw_organization_admin', async () => {
    vi.mocked(prisma.linkedIdentity.findFirst).mockResolvedValue(
      makeIdentity({
        providerData: {
          access_token: 'personal-token',
          scope: 'openid profile email w_member_social',
        },
      }) as never
    );

    const res = await POST();
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.code).toBe('org_scope_missing');
    expect(syncLinkedInPersonalPages).not.toHaveBeenCalled();
  });

  it('returns 400 with code "org_scope_missing" when no scope is stored at all', async () => {
    vi.mocked(prisma.linkedIdentity.findFirst).mockResolvedValue(
      makeIdentity({ providerData: { access_token: 'personal-token' } }) as never
    );

    const res = await POST();
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.code).toBe('org_scope_missing');
  });

  it('returns 400 with code "org_scope_missing" when there is no access token', async () => {
    vi.mocked(prisma.linkedIdentity.findFirst).mockResolvedValue(
      makeIdentity({ providerData: { scope: ORG_SCOPE } }) as never
    );

    const res = await POST();
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.code).toBe('org_scope_missing');
    expect(syncLinkedInPersonalPages).not.toHaveBeenCalled();
  });

  it('returns 400 with code "org_scope_missing" when the token is expired', async () => {
    vi.mocked(prisma.linkedIdentity.findFirst).mockResolvedValue(
      makeIdentity({
        providerData: {
          access_token: 'stale-token',
          scope: ORG_SCOPE,
          expires_at: '2020-01-01T00:00:00.000Z',
        },
      }) as never
    );

    const res = await POST();
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.code).toBe('org_scope_missing');
    expect(syncLinkedInPersonalPages).not.toHaveBeenCalled();
  });

  it('returns 400 with code "org_scope_missing" when providerData is null', async () => {
    vi.mocked(prisma.linkedIdentity.findFirst).mockResolvedValue(
      makeIdentity({ providerData: null }) as never
    );

    const res = await POST();
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.code).toBe('org_scope_missing');
  });
});

// ── LinkedIn API failure ─────────────────────────────────────────────────────

describe('POST /api/linkedin/sync-pages — sync failure', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.linkedIdentity.findFirst).mockResolvedValue(makeIdentity() as never);
  });

  it('returns 502 when the sync throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(syncLinkedInPersonalPages).mockRejectedValue(
      new Error('Failed to fetch LinkedIn admin pages: HTTP 500')
    );

    const res = await POST();
    expect(res.status).toBe(502);
    const body = await json(res);
    expect(body.error).toMatch(/failed to sync/i);
  });
});

// ── success ──────────────────────────────────────────────────────────────────

describe('POST /api/linkedin/sync-pages — success', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.linkedIdentity.findFirst).mockResolvedValue(makeIdentity() as never);
  });

  it('returns 200 with the synced pages', async () => {
    vi.mocked(syncLinkedInPersonalPages).mockResolvedValue([
      makeSyncedPage(),
      makeSyncedPage({ id: 'pp-uuid-2', pageName: 'Beta Inc' }),
    ] as never);

    const res = await POST();
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.pages).toHaveLength(2);
    expect(body.pages[0]).toEqual({
      id: 'pp-uuid-1',
      linkedInPageId: '12345',
      pageName: 'Acme Corp',
      pageLogoUrl: null,
      lastSyncedAt: '2026-06-12T00:00:00.000Z',
    });
  });

  it('passes the identity id and active access token to the sync', async () => {
    vi.mocked(syncLinkedInPersonalPages).mockResolvedValue([] as never);

    await POST();

    expect(syncLinkedInPersonalPages).toHaveBeenCalledWith('identity-1', 'personal-token');
  });

  it('returns an empty pages list when the user administers no pages', async () => {
    vi.mocked(syncLinkedInPersonalPages).mockResolvedValue([] as never);

    const res = await POST();
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.pages).toEqual([]);
  });
});
