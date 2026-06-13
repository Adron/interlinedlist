/**
 * Unit tests for GET and PUT /api/linkedin/posting-targets
 *
 * Mocks:
 *  - @/lib/prisma        — prevents real DB calls (also exercises
 *                          lib/linkedin/targets.getAvailableLinkedInTargets
 *                          transitively, since the route delegates to it)
 *  - @/lib/auth/session  — controls auth result
 */

import { NextRequest } from 'next/server';
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
    linkedInPostingTargetPreference: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { GET, PUT } from './route';

// ── helpers ──────────────────────────────────────────────────────────────────

const mockUser = { id: 'user-1' };

function makePersonalPage(overrides?: {
  id?: string;
  linkedInPageId?: string;
  pageName?: string;
  pageLogoUrl?: string | null;
}) {
  return {
    id: overrides?.id ?? 'pp-uuid-1',
    identityId: 'identity-1',
    linkedInPageId: overrides?.linkedInPageId ?? 'li-page-777',
    pageName: overrides?.pageName ?? 'My Company',
    pageLogoUrl: overrides?.pageLogoUrl ?? null,
    lastSyncedAt: new Date('2026-06-01'),
  };
}

function makeIdentity(overrides?: {
  providerUsername?: string | null;
  avatarUrl?: string | null;
  accessToken?: string | null;
  personalPages?: ReturnType<typeof makePersonalPage>[];
}) {
  const accessToken =
    overrides?.accessToken !== undefined ? overrides.accessToken : 'personal-token';
  return {
    providerUsername:
      overrides?.providerUsername !== undefined ? overrides.providerUsername : 'jane-doe',
    avatarUrl:
      overrides?.avatarUrl !== undefined ? overrides.avatarUrl : 'https://example.com/avatar.png',
    providerData: accessToken !== null ? { access_token: accessToken } : null,
    personalPages: overrides?.personalPages ?? [],
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

/** Personal identity + one org page available; no preference rows by default. */
function setupAvailableTargets(options?: {
  identity?: ReturnType<typeof makeIdentity> | null;
  assignments?: ReturnType<typeof makeAssignment>[];
  preferences?: { kind: string; pageId?: string | null; personalPageId?: string | null }[];
}) {
  vi.mocked(prisma.linkedIdentity.findFirst).mockResolvedValue(
    (options?.identity !== undefined ? options.identity : makeIdentity()) as never
  );
  vi.mocked(prisma.orgLinkedInPageAssignment.findMany).mockResolvedValue(
    (options?.assignments ?? [makeAssignment()]) as never
  );
  vi.mocked(prisma.linkedInPostingTargetPreference.findMany).mockResolvedValue(
    (options?.preferences ?? []) as never
  );
  vi.mocked(prisma.$transaction).mockResolvedValue([] as never);
}

function makePutRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/linkedin/posting-targets', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeInvalidJsonPutRequest(): NextRequest {
  return new NextRequest('http://localhost/api/linkedin/posting-targets', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: 'not json {',
  });
}

async function json(response: Response) {
  return response.json();
}

// ── GET — auth ───────────────────────────────────────────────────────────────

describe('GET /api/linkedin/posting-targets — auth', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null as never);
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error).toMatch(/unauthorized/i);
  });
});

// ── GET — default rule: zero preference rows ⇒ all enabled ──────────────────

describe('GET /api/linkedin/posting-targets — no preference rows', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it('marks every available target enabled when no preference rows exist', async () => {
    setupAvailableTargets({ preferences: [] });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.targets).toEqual([
      {
        kind: 'personal',
        label: 'jane-doe',
        avatarUrl: 'https://example.com/avatar.png',
        enabled: true,
      },
      {
        kind: 'orgPage',
        pageId: 'org-page-uuid-1',
        linkedInPageId: 'li-page-123',
        label: 'Acme Corp',
        logoUrl: null,
        enabled: true,
      },
    ]);
  });

  it('returns an empty list when nothing is connected', async () => {
    setupAvailableTargets({ identity: null, assignments: [], preferences: [] });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.targets).toEqual([]);
  });

  it('queries preference rows scoped to the current user', async () => {
    setupAvailableTargets();

    await GET();

    expect(prisma.linkedInPostingTargetPreference.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-1' }),
      })
    );
  });
});

// ── GET — with preference rows, only matching rows are enabled ──────────────

describe('GET /api/linkedin/posting-targets — with preference rows', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it('enables only personal when a single personal row exists', async () => {
    setupAvailableTargets({
      preferences: [{ kind: 'personal', pageId: null }],
    });

    const res = await GET();
    const body = await json(res);
    expect(body.targets).toHaveLength(2);
    expect(body.targets[0]).toMatchObject({ kind: 'personal', enabled: true });
    expect(body.targets[1]).toMatchObject({ kind: 'orgPage', enabled: false });
  });

  it('enables only the matching org page when a single orgPage row exists', async () => {
    setupAvailableTargets({
      assignments: [
        makeAssignment(),
        makeAssignment({ pageId: 'org-page-uuid-2', pageName: 'Beta Inc' }),
      ],
      preferences: [{ kind: 'orgPage', pageId: 'org-page-uuid-2' }],
    });

    const res = await GET();
    const body = await json(res);
    expect(body.targets).toHaveLength(3);
    expect(body.targets[0]).toMatchObject({ kind: 'personal', enabled: false });
    expect(body.targets[1]).toMatchObject({ pageId: 'org-page-uuid-1', enabled: false });
    expect(body.targets[2]).toMatchObject({ pageId: 'org-page-uuid-2', enabled: true });
  });

  it('enables both personal and an org page when both rows exist', async () => {
    setupAvailableTargets({
      preferences: [
        { kind: 'personal', pageId: null },
        { kind: 'orgPage', pageId: 'org-page-uuid-1' },
      ],
    });

    const res = await GET();
    const body = await json(res);
    expect(body.targets[0]).toMatchObject({ kind: 'personal', enabled: true });
    expect(body.targets[1]).toMatchObject({ kind: 'orgPage', enabled: true });
  });

  it('disables everything when rows exist but none match the available targets', async () => {
    setupAvailableTargets({
      preferences: [{ kind: 'orgPage', pageId: 'some-other-page' }],
    });

    const res = await GET();
    const body = await json(res);
    expect(body.targets.every((t: { enabled: boolean }) => t.enabled === false)).toBe(true);
  });
});

// ── PUT — auth ───────────────────────────────────────────────────────────────

describe('PUT /api/linkedin/posting-targets — auth', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null as never);
    const res = await PUT(makePutRequest({ targets: [] }));
    expect(res.status).toBe(401);
  });
});

// ── PUT — body validation ────────────────────────────────────────────────────

describe('PUT /api/linkedin/posting-targets — body validation', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);
    setupAvailableTargets();
  });
  afterEach(() => vi.restoreAllMocks());

  it('returns 400 for an unparseable JSON body', async () => {
    const res = await PUT(makeInvalidJsonPutRequest());
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toMatch(/invalid json/i);
  });

  it('returns 400 when targets is missing', async () => {
    const res = await PUT(makePutRequest({}));
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toMatch(/must be an array/i);
  });

  it('returns 400 when targets is not an array', async () => {
    const res = await PUT(makePutRequest({ targets: { kind: 'personal' } }));
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toMatch(/must be an array/i);
  });

  it('returns 400 when a target has an unknown kind', async () => {
    const res = await PUT(makePutRequest({ targets: [{ kind: 'bogus' }] }));
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toMatch(/invalid targets/i);
  });

  it('returns 400 when an orgPage target is missing pageId', async () => {
    const res = await PUT(makePutRequest({ targets: [{ kind: 'orgPage' }] }));
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toMatch(/invalid targets/i);
  });

  it('does not touch the database when validation fails', async () => {
    await PUT(makePutRequest({ targets: [{ kind: 'bogus' }] }));
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.linkedInPostingTargetPreference.deleteMany).not.toHaveBeenCalled();
  });
});

// ── PUT — availability checks ────────────────────────────────────────────────

describe('PUT /api/linkedin/posting-targets — availability checks', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it('returns 400 when personal is requested but the account is not linked', async () => {
    setupAvailableTargets({ identity: null });

    const res = await PUT(makePutRequest({ targets: [{ kind: 'personal' }] }));
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toMatch(/personal linkedin account is not linked/i);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns 400 when an orgPage pageId is not assigned to the user', async () => {
    setupAvailableTargets();

    const res = await PUT(
      makePutRequest({ targets: [{ kind: 'orgPage', pageId: 'unassigned-page' }] })
    );
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toMatch(/not assigned to you/i);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an orgPage whose assignment credential is disconnected (page not available)', async () => {
    setupAvailableTargets({
      assignments: [makeAssignment({ disconnectedAt: new Date('2023-06-01') })],
    });

    const res = await PUT(
      makePutRequest({ targets: [{ kind: 'orgPage', pageId: 'org-page-uuid-1' }] })
    );
    expect(res.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects the whole request when one of several targets is unavailable', async () => {
    setupAvailableTargets();

    const res = await PUT(
      makePutRequest({
        targets: [
          { kind: 'orgPage', pageId: 'org-page-uuid-1' },
          { kind: 'orgPage', pageId: 'unassigned-page' },
        ],
      })
    );
    expect(res.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

// ── PUT — successful replace ─────────────────────────────────────────────────

describe('PUT /api/linkedin/posting-targets — successful replace', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it('replaces preference rows in a transaction (deleteMany then createMany)', async () => {
    setupAvailableTargets({
      preferences: [
        { kind: 'personal', pageId: null },
        { kind: 'orgPage', pageId: 'org-page-uuid-1' },
      ],
    });

    const res = await PUT(
      makePutRequest({
        targets: [{ kind: 'personal' }, { kind: 'orgPage', pageId: 'org-page-uuid-1' }],
      })
    );
    expect(res.status).toBe(200);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const ops = vi.mocked(prisma.$transaction).mock.calls[0][0] as unknown[];
    expect(ops).toHaveLength(2);

    expect(prisma.linkedInPostingTargetPreference.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(prisma.linkedInPostingTargetPreference.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 'user-1', kind: 'personal' },
        { userId: 'user-1', kind: 'orgPage', pageId: 'org-page-uuid-1' },
      ],
    });
  });

  it('dedupes repeated personal and repeated pageId entries before saving', async () => {
    setupAvailableTargets({
      preferences: [
        { kind: 'personal', pageId: null },
        { kind: 'orgPage', pageId: 'org-page-uuid-1' },
      ],
    });

    const res = await PUT(
      makePutRequest({
        targets: [
          { kind: 'personal' },
          { kind: 'personal' },
          { kind: 'orgPage', pageId: 'org-page-uuid-1' },
          { kind: 'orgPage', pageId: 'org-page-uuid-1' },
        ],
      })
    );
    expect(res.status).toBe(200);

    expect(prisma.linkedInPostingTargetPreference.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 'user-1', kind: 'personal' },
        { userId: 'user-1', kind: 'orgPage', pageId: 'org-page-uuid-1' },
      ],
    });
  });

  it('returns the GET shape with enabled flags reflecting the saved rows', async () => {
    setupAvailableTargets({
      preferences: [{ kind: 'personal', pageId: null }],
    });

    const res = await PUT(makePutRequest({ targets: [{ kind: 'personal' }] }));
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.targets).toEqual([
      {
        kind: 'personal',
        label: 'jane-doe',
        avatarUrl: 'https://example.com/avatar.png',
        enabled: true,
      },
      {
        kind: 'orgPage',
        pageId: 'org-page-uuid-1',
        linkedInPageId: 'li-page-123',
        label: 'Acme Corp',
        logoUrl: null,
        enabled: false,
      },
    ]);
  });

  it('deletes all rows without createMany when targets is an empty array', async () => {
    setupAvailableTargets({ preferences: [] });

    const res = await PUT(makePutRequest({ targets: [] }));
    expect(res.status).toBe(200);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const ops = vi.mocked(prisma.$transaction).mock.calls[0][0] as unknown[];
    expect(ops).toHaveLength(1);
    expect(prisma.linkedInPostingTargetPreference.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(prisma.linkedInPostingTargetPreference.createMany).not.toHaveBeenCalled();
  });

  it('falls back to all-enabled in the response after clearing every row (default rule)', async () => {
    setupAvailableTargets({ preferences: [] });

    const res = await PUT(makePutRequest({ targets: [] }));
    const body = await json(res);
    expect(body.targets).toHaveLength(2);
    expect(body.targets.every((t: { enabled: boolean }) => t.enabled === true)).toBe(true);
  });
});

// ── GET — personalPage targets ───────────────────────────────────────────────

describe('GET /api/linkedin/posting-targets — personalPage targets', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it('includes personalPage targets enabled by default with zero preference rows', async () => {
    setupAvailableTargets({
      identity: makeIdentity({ personalPages: [makePersonalPage()] }),
      preferences: [],
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.targets).toContainEqual({
      kind: 'personalPage',
      personalPageId: 'pp-uuid-1',
      linkedInPageId: 'li-page-777',
      label: 'My Company',
      logoUrl: null,
      enabled: true,
    });
  });

  it('enables a personalPage only when a matching personalPageId preference row exists', async () => {
    setupAvailableTargets({
      identity: makeIdentity({
        personalPages: [
          makePersonalPage(),
          makePersonalPage({ id: 'pp-uuid-2', linkedInPageId: 'li-page-888', pageName: 'Other Co' }),
        ],
      }),
      preferences: [{ kind: 'personalPage', personalPageId: 'pp-uuid-2' }],
    });

    const res = await GET();
    const body = await json(res);
    const personalPages = body.targets.filter(
      (t: { kind: string }) => t.kind === 'personalPage'
    );
    expect(personalPages).toEqual([
      expect.objectContaining({ personalPageId: 'pp-uuid-1', enabled: false }),
      expect.objectContaining({ personalPageId: 'pp-uuid-2', enabled: true }),
    ]);
  });

  it('does not enable a personalPage from an orgPage row carrying the same id in pageId', async () => {
    setupAvailableTargets({
      identity: makeIdentity({ personalPages: [makePersonalPage()] }),
      preferences: [{ kind: 'orgPage', pageId: 'pp-uuid-1' }],
    });

    const res = await GET();
    const body = await json(res);
    const personalPage = body.targets.find(
      (t: { kind: string }) => t.kind === 'personalPage'
    );
    expect(personalPage.enabled).toBe(false);
  });

  it('omits a personalPage that duplicates an active org page (org wins)', async () => {
    setupAvailableTargets({
      identity: makeIdentity({
        personalPages: [makePersonalPage({ linkedInPageId: 'li-page-123' })],
      }),
      assignments: [makeAssignment({ linkedInPageId: 'li-page-123' })],
      preferences: [],
    });

    const res = await GET();
    const body = await json(res);
    expect(body.targets.map((t: { kind: string }) => t.kind)).toEqual([
      'personal',
      'orgPage',
    ]);
  });
});

// ── PUT — personalPage targets ───────────────────────────────────────────────

describe('PUT /api/linkedin/posting-targets — personalPage targets', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it('returns 400 when a personalPage target is not available to the user', async () => {
    setupAvailableTargets({
      identity: makeIdentity({ personalPages: [makePersonalPage()] }),
    });

    const res = await PUT(
      makePutRequest({
        targets: [{ kind: 'personalPage', personalPageId: 'someone-elses-page' }],
      })
    );
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toMatch(/not available to you/i);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns 400 when the identity has no token (personalPage no longer available)', async () => {
    setupAvailableTargets({
      identity: makeIdentity({ accessToken: null, personalPages: [makePersonalPage()] }),
    });

    const res = await PUT(
      makePutRequest({ targets: [{ kind: 'personalPage', personalPageId: 'pp-uuid-1' }] })
    );
    expect(res.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a personalPage hidden by the org-wins dedupe (must be saved as orgPage instead)', async () => {
    setupAvailableTargets({
      identity: makeIdentity({
        personalPages: [makePersonalPage({ linkedInPageId: 'li-page-123' })],
      }),
      assignments: [makeAssignment({ linkedInPageId: 'li-page-123' })],
    });

    const res = await PUT(
      makePutRequest({ targets: [{ kind: 'personalPage', personalPageId: 'pp-uuid-1' }] })
    );
    expect(res.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('persists a personalPage preference via the personalPageId column (never pageId)', async () => {
    setupAvailableTargets({
      identity: makeIdentity({ personalPages: [makePersonalPage()] }),
      preferences: [{ kind: 'personalPage', personalPageId: 'pp-uuid-1' }],
    });

    const res = await PUT(
      makePutRequest({ targets: [{ kind: 'personalPage', personalPageId: 'pp-uuid-1' }] })
    );
    expect(res.status).toBe(200);

    expect(prisma.linkedInPostingTargetPreference.createMany).toHaveBeenCalledWith({
      data: [{ userId: 'user-1', kind: 'personalPage', personalPageId: 'pp-uuid-1' }],
    });
    const createManyArg = vi.mocked(prisma.linkedInPostingTargetPreference.createMany)
      .mock.calls[0]?.[0] as { data: Record<string, unknown>[] };
    expect(createManyArg.data[0]).not.toHaveProperty('pageId');
  });

  it('saves all three kinds together and reflects them in the response', async () => {
    setupAvailableTargets({
      identity: makeIdentity({ personalPages: [makePersonalPage()] }),
      preferences: [
        { kind: 'personal' },
        { kind: 'orgPage', pageId: 'org-page-uuid-1' },
        { kind: 'personalPage', personalPageId: 'pp-uuid-1' },
      ],
    });

    const res = await PUT(
      makePutRequest({
        targets: [
          { kind: 'personal' },
          { kind: 'orgPage', pageId: 'org-page-uuid-1' },
          { kind: 'personalPage', personalPageId: 'pp-uuid-1' },
        ],
      })
    );
    expect(res.status).toBe(200);

    expect(prisma.linkedInPostingTargetPreference.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 'user-1', kind: 'personal' },
        { userId: 'user-1', kind: 'orgPage', pageId: 'org-page-uuid-1' },
        { userId: 'user-1', kind: 'personalPage', personalPageId: 'pp-uuid-1' },
      ],
    });

    const body = await json(res);
    expect(body.targets.every((t: { enabled: boolean }) => t.enabled === true)).toBe(true);
    expect(body.targets.map((t: { kind: string }) => t.kind)).toEqual([
      'personal',
      'orgPage',
      'personalPage',
    ]);
  });

  it('dedupes repeated personalPage entries before saving', async () => {
    setupAvailableTargets({
      identity: makeIdentity({ personalPages: [makePersonalPage()] }),
      preferences: [{ kind: 'personalPage', personalPageId: 'pp-uuid-1' }],
    });

    const res = await PUT(
      makePutRequest({
        targets: [
          { kind: 'personalPage', personalPageId: 'pp-uuid-1' },
          { kind: 'personalPage', personalPageId: 'pp-uuid-1' },
        ],
      })
    );
    expect(res.status).toBe(200);

    expect(prisma.linkedInPostingTargetPreference.createMany).toHaveBeenCalledWith({
      data: [{ userId: 'user-1', kind: 'personalPage', personalPageId: 'pp-uuid-1' }],
    });
  });
});
