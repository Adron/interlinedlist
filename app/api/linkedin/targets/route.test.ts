/**
 * Unit tests for GET /api/linkedin/targets
 *
 * Mocks:
 *  - @/lib/prisma        — prevents real DB calls
 *  - @/lib/auth/session  — controls auth result
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/lib/prisma', () => ({
  prisma: {
    linkedIdentity: {
      findFirst: vi.fn(),
    },
    orgLinkedInPageAssignment: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { GET } from './route';

// ── helpers ──────────────────────────────────────────────────────────────────

const mockUser = { id: 'user-1' };

function makeIdentity(overrides?: {
  providerUsername?: string | null;
  avatarUrl?: string | null;
  accessToken?: string | null;
}) {
  const accessToken =
    overrides?.accessToken !== undefined ? overrides.accessToken : 'personal-token';
  return {
    providerUsername:
      overrides?.providerUsername !== undefined ? overrides.providerUsername : 'jane-doe',
    avatarUrl:
      overrides?.avatarUrl !== undefined ? overrides.avatarUrl : 'https://example.com/avatar.png',
    providerData: accessToken !== null ? { access_token: accessToken } : null,
  };
}

function makeAssignment(overrides?: {
  pageId?: string;
  linkedInPageId?: string;
  pageName?: string;
  pageLogoUrl?: string | null;
  disconnectedAt?: Date | null;
  expiresAt?: Date | null;
}) {
  return {
    userId: 'user-1',
    page: {
      id: overrides?.pageId ?? 'org-page-uuid-1',
      linkedInPageId: overrides?.linkedInPageId ?? 'li-page-123',
      pageName: overrides?.pageName ?? 'Acme Corp',
      pageLogoUrl: overrides?.pageLogoUrl ?? null,
      credential: {
        id: 'cred-abc',
        accessToken: 'org-access-token',
        disconnectedAt: overrides?.disconnectedAt ?? null,
        expiresAt: overrides?.expiresAt ?? null,
      },
    },
  };
}

async function json(response: Response) {
  return response.json();
}

// ── auth ─────────────────────────────────────────────────────────────────────

describe('GET /api/linkedin/targets — auth', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null as never);
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error).toMatch(/unauthorized/i);
  });
});

// ── personal target only ─────────────────────────────────────────────────────

describe('GET /api/linkedin/targets — personal only', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it('returns one personal target when identity has an access_token and no assignments exist', async () => {
    vi.mocked(prisma.linkedIdentity.findFirst).mockResolvedValue(makeIdentity() as never);
    vi.mocked(prisma.orgLinkedInPageAssignment.findMany).mockResolvedValue([] as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.targets).toEqual([
      {
        kind: 'personal',
        label: 'jane-doe',
        avatarUrl: 'https://example.com/avatar.png',
      },
    ]);
  });

  it('falls back to "LinkedIn" as the label when providerUsername is null', async () => {
    vi.mocked(prisma.linkedIdentity.findFirst).mockResolvedValue(
      makeIdentity({ providerUsername: null }) as never
    );
    vi.mocked(prisma.orgLinkedInPageAssignment.findMany).mockResolvedValue([] as never);

    const res = await GET();
    const body = await json(res);
    expect(body.targets[0].label).toBe('LinkedIn');
  });

  it('excludes the personal target when the identity lacks an access_token', async () => {
    vi.mocked(prisma.linkedIdentity.findFirst).mockResolvedValue(
      makeIdentity({ accessToken: null }) as never
    );
    vi.mocked(prisma.orgLinkedInPageAssignment.findMany).mockResolvedValue([] as never);

    const res = await GET();
    const body = await json(res);
    expect(body.targets).toEqual([]);
  });

  it('excludes the personal target when no identity exists', async () => {
    vi.mocked(prisma.linkedIdentity.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.orgLinkedInPageAssignment.findMany).mockResolvedValue([] as never);

    const res = await GET();
    const body = await json(res);
    expect(body.targets).toEqual([]);
  });
});

// ── org page targets only ────────────────────────────────────────────────────

describe('GET /api/linkedin/targets — org pages only', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.linkedIdentity.findFirst).mockResolvedValue(null as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it('returns org page targets for active assignments', async () => {
    vi.mocked(prisma.orgLinkedInPageAssignment.findMany).mockResolvedValue([
      makeAssignment(),
      makeAssignment({
        pageId: 'org-page-uuid-2',
        linkedInPageId: 'li-page-456',
        pageName: 'Beta Inc',
        pageLogoUrl: 'https://example.com/beta.png',
      }),
    ] as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.targets).toEqual([
      {
        kind: 'orgPage',
        pageId: 'org-page-uuid-1',
        linkedInPageId: 'li-page-123',
        label: 'Acme Corp',
        logoUrl: null,
      },
      {
        kind: 'orgPage',
        pageId: 'org-page-uuid-2',
        linkedInPageId: 'li-page-456',
        label: 'Beta Inc',
        logoUrl: 'https://example.com/beta.png',
      },
    ]);
  });

  it('queries assignments scoped to the current user', async () => {
    vi.mocked(prisma.orgLinkedInPageAssignment.findMany).mockResolvedValue([] as never);

    await GET();

    expect(prisma.orgLinkedInPageAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-1' }),
      })
    );
  });

  it('filters out assignments with a disconnected credential', async () => {
    vi.mocked(prisma.orgLinkedInPageAssignment.findMany).mockResolvedValue([
      makeAssignment({ disconnectedAt: new Date('2023-06-01') }),
    ] as never);

    const res = await GET();
    const body = await json(res);
    expect(body.targets).toEqual([]);
  });

  it('filters out assignments with an expired credential', async () => {
    vi.mocked(prisma.orgLinkedInPageAssignment.findMany).mockResolvedValue([
      makeAssignment({ expiresAt: new Date('2020-01-01') }),
    ] as never);

    const res = await GET();
    const body = await json(res);
    expect(body.targets).toEqual([]);
  });

  it('keeps assignments whose credential has null expiresAt (never expires)', async () => {
    vi.mocked(prisma.orgLinkedInPageAssignment.findMany).mockResolvedValue([
      makeAssignment({ expiresAt: null, disconnectedAt: null }),
    ] as never);

    const res = await GET();
    const body = await json(res);
    expect(body.targets).toHaveLength(1);
    expect(body.targets[0].kind).toBe('orgPage');
  });

  it('keeps only the active assignment when active and inactive are mixed', async () => {
    vi.mocked(prisma.orgLinkedInPageAssignment.findMany).mockResolvedValue([
      makeAssignment({ pageId: 'dead-page', disconnectedAt: new Date('2023-06-01') }),
      makeAssignment({ pageId: 'live-page', pageName: 'Live Org' }),
    ] as never);

    const res = await GET();
    const body = await json(res);
    expect(body.targets).toHaveLength(1);
    expect(body.targets[0].pageId).toBe('live-page');
  });
});

// ── personal + org pages combined ────────────────────────────────────────────

describe('GET /api/linkedin/targets — personal and org pages', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it('returns the personal target first, followed by org pages', async () => {
    vi.mocked(prisma.linkedIdentity.findFirst).mockResolvedValue(makeIdentity() as never);
    vi.mocked(prisma.orgLinkedInPageAssignment.findMany).mockResolvedValue([
      makeAssignment(),
    ] as never);

    const res = await GET();
    const body = await json(res);
    expect(body.targets).toHaveLength(2);
    expect(body.targets[0].kind).toBe('personal');
    expect(body.targets[1].kind).toBe('orgPage');
    expect(body.targets[1].pageId).toBe('org-page-uuid-1');
  });

  it('returns only org pages when the personal identity lacks a token', async () => {
    vi.mocked(prisma.linkedIdentity.findFirst).mockResolvedValue(
      makeIdentity({ accessToken: null }) as never
    );
    vi.mocked(prisma.orgLinkedInPageAssignment.findMany).mockResolvedValue([
      makeAssignment(),
    ] as never);

    const res = await GET();
    const body = await json(res);
    expect(body.targets).toHaveLength(1);
    expect(body.targets[0].kind).toBe('orgPage');
  });

  it('returns an empty list when nothing is connected', async () => {
    vi.mocked(prisma.linkedIdentity.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.orgLinkedInPageAssignment.findMany).mockResolvedValue([] as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.targets).toEqual([]);
  });
});
