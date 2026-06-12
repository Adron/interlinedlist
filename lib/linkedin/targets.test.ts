/**
 * Unit tests for lib/linkedin/targets.ts — getAvailableLinkedInTargets
 *
 * Focuses on the personalPage targets discovered through the user's own
 * LinkedIn connection and the org-wins dedupe rule. Prisma is mocked.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── module mocks ─────────────────────────────────────────────────────────────

const mockFindFirstIdentity = vi.hoisted(() => vi.fn());
const mockFindManyAssignments = vi.hoisted(() => vi.fn());

vi.mock('@/lib/prisma', () => ({
  prisma: {
    linkedIdentity: {
      findFirst: mockFindFirstIdentity,
    },
    orgLinkedInPageAssignment: {
      findMany: mockFindManyAssignments,
    },
  },
}));

import { getAvailableLinkedInTargets } from './targets';

// ── helpers ──────────────────────────────────────────────────────────────────

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
  providerData?: Record<string, unknown> | null;
  personalPages?: ReturnType<typeof makePersonalPage>[];
}) {
  return {
    providerUsername: 'jane-doe',
    avatarUrl: 'https://example.com/avatar.png',
    providerData:
      overrides?.providerData !== undefined
        ? overrides.providerData
        : { access_token: 'personal-token' },
    personalPages: overrides?.personalPages ?? [],
  };
}

function makeAssignment(overrides?: {
  pageId?: string;
  linkedInPageId?: string;
  pageName?: string;
  disconnectedAt?: Date | null;
  expiresAt?: Date | null;
}) {
  return {
    userId: 'user-1',
    page: {
      id: overrides?.pageId ?? 'org-page-uuid-1',
      linkedInPageId: overrides?.linkedInPageId ?? 'li-page-123',
      pageName: overrides?.pageName ?? 'Acme Corp',
      pageLogoUrl: null,
      credential: {
        id: 'cred-abc',
        accessToken: 'org-access-token',
        disconnectedAt: overrides?.disconnectedAt ?? null,
        expiresAt: overrides?.expiresAt ?? null,
      },
    },
  };
}

beforeEach(() => {
  mockFindManyAssignments.mockResolvedValue([]);
});

afterEach(() => vi.clearAllMocks());

// ── personalPage targets ─────────────────────────────────────────────────────

describe('getAvailableLinkedInTargets — personalPage targets', () => {
  it('appends personalPage targets after personal when the identity has an active token', async () => {
    mockFindFirstIdentity.mockResolvedValue(
      makeIdentity({
        personalPages: [
          makePersonalPage({
            id: 'pp-uuid-1',
            linkedInPageId: 'li-page-777',
            pageName: 'My Company',
            pageLogoUrl: 'https://example.com/logo.png',
          }),
        ],
      })
    );

    const targets = await getAvailableLinkedInTargets('user-1');

    expect(targets).toEqual([
      {
        kind: 'personal',
        label: 'jane-doe',
        avatarUrl: 'https://example.com/avatar.png',
      },
      {
        kind: 'personalPage',
        personalPageId: 'pp-uuid-1',
        linkedInPageId: 'li-page-777',
        label: 'My Company',
        logoUrl: 'https://example.com/logo.png',
      },
    ]);
  });

  it('excludes personalPage targets when the identity has no access token', async () => {
    mockFindFirstIdentity.mockResolvedValue(
      makeIdentity({ providerData: null, personalPages: [makePersonalPage()] })
    );

    const targets = await getAvailableLinkedInTargets('user-1');
    expect(targets).toEqual([]);
  });

  it('excludes personalPage targets when the personal token is expired', async () => {
    mockFindFirstIdentity.mockResolvedValue(
      makeIdentity({
        providerData: {
          access_token: 'stale-token',
          expires_at: '2020-01-01T00:00:00.000Z',
        },
        personalPages: [makePersonalPage()],
      })
    );

    const targets = await getAvailableLinkedInTargets('user-1');
    expect(targets).toEqual([]);
  });

  it('includes personalPage targets when the token has a future expires_at', async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    mockFindFirstIdentity.mockResolvedValue(
      makeIdentity({
        providerData: { access_token: 'fresh-token', expires_at: future },
        personalPages: [makePersonalPage()],
      })
    );

    const targets = await getAvailableLinkedInTargets('user-1');
    expect(targets.map((t) => t.kind)).toEqual(['personal', 'personalPage']);
  });

  it('handles an identity without a personalPages relation (legacy shape)', async () => {
    const identity = makeIdentity();
    delete (identity as { personalPages?: unknown }).personalPages;
    mockFindFirstIdentity.mockResolvedValue(identity);

    const targets = await getAvailableLinkedInTargets('user-1');
    expect(targets).toEqual([
      expect.objectContaining({ kind: 'personal' }),
    ]);
  });
});

// ── org-wins dedupe ──────────────────────────────────────────────────────────

describe('getAvailableLinkedInTargets — org-wins dedupe', () => {
  it('skips a personalPage whose linkedInPageId already appears via an active org assignment', async () => {
    mockFindFirstIdentity.mockResolvedValue(
      makeIdentity({
        personalPages: [
          makePersonalPage({ id: 'pp-dup', linkedInPageId: 'li-page-123', pageName: 'Acme via Personal' }),
          makePersonalPage({ id: 'pp-unique', linkedInPageId: 'li-page-999', pageName: 'Solo Co' }),
        ],
      })
    );
    mockFindManyAssignments.mockResolvedValue([
      makeAssignment({ linkedInPageId: 'li-page-123' }),
    ]);

    const targets = await getAvailableLinkedInTargets('user-1');

    expect(targets).toHaveLength(3);
    expect(targets[0]).toMatchObject({ kind: 'personal' });
    expect(targets[1]).toMatchObject({ kind: 'orgPage', linkedInPageId: 'li-page-123' });
    expect(targets[2]).toMatchObject({
      kind: 'personalPage',
      personalPageId: 'pp-unique',
      linkedInPageId: 'li-page-999',
    });
    // The duplicate page surfaces only through the org assignment.
    expect(
      targets.filter((t) => 'linkedInPageId' in t && t.linkedInPageId === 'li-page-123')
    ).toHaveLength(1);
  });

  it('keeps the personalPage when the overlapping org assignment credential is inactive', async () => {
    mockFindFirstIdentity.mockResolvedValue(
      makeIdentity({
        personalPages: [
          makePersonalPage({ id: 'pp-dup', linkedInPageId: 'li-page-123' }),
        ],
      })
    );
    mockFindManyAssignments.mockResolvedValue([
      makeAssignment({
        linkedInPageId: 'li-page-123',
        disconnectedAt: new Date('2023-06-01'),
      }),
    ]);

    const targets = await getAvailableLinkedInTargets('user-1');

    expect(targets).toHaveLength(2);
    expect(targets[1]).toMatchObject({
      kind: 'personalPage',
      personalPageId: 'pp-dup',
      linkedInPageId: 'li-page-123',
    });
  });

  it('keeps the personalPage when the overlapping org credential is expired', async () => {
    mockFindFirstIdentity.mockResolvedValue(
      makeIdentity({
        personalPages: [makePersonalPage({ linkedInPageId: 'li-page-123' })],
      })
    );
    mockFindManyAssignments.mockResolvedValue([
      makeAssignment({
        linkedInPageId: 'li-page-123',
        expiresAt: new Date('2020-01-01'),
      }),
    ]);

    const targets = await getAvailableLinkedInTargets('user-1');
    expect(targets.map((t) => t.kind)).toEqual(['personal', 'personalPage']);
  });

  it('returns org pages and non-overlapping personal pages side by side', async () => {
    mockFindFirstIdentity.mockResolvedValue(
      makeIdentity({
        personalPages: [makePersonalPage({ linkedInPageId: 'li-page-999' })],
      })
    );
    mockFindManyAssignments.mockResolvedValue([
      makeAssignment({ linkedInPageId: 'li-page-123' }),
    ]);

    const targets = await getAvailableLinkedInTargets('user-1');
    expect(targets.map((t) => t.kind)).toEqual(['personal', 'orgPage', 'personalPage']);
  });
});
