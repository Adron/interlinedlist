/**
 * Unit tests for lib/linkedin/resolve-linkedin-target.ts
 *
 * Prisma is mocked at module level so no DB connection is needed.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock Prisma before importing the module under test ────────────────────

const mockFindFirstAssignment = vi.hoisted(() => vi.fn());
const mockFindFirstIdentity = vi.hoisted(() => vi.fn());

vi.mock('@/lib/prisma', () => ({
  prisma: {
    orgLinkedInPageAssignment: {
      findFirst: mockFindFirstAssignment,
    },
    linkedIdentity: {
      findFirst: mockFindFirstIdentity,
    },
  },
}));

import { parseRequestedLinkedInTarget, resolveLinkedInTarget } from './resolve-linkedin-target';

// ─── helpers ───────────────────────────────────────────────────────────────

function makeAssignment(overrides?: {
  accessToken?: string;
  linkedInPageId?: string;
  credentialId?: string;
  disconnectedAt?: Date | null;
  expiresAt?: Date | null;
}) {
  return {
    userId: 'user-1',
    page: {
      linkedInPageId: overrides?.linkedInPageId ?? 'page-123',
      credential: {
        id: overrides?.credentialId ?? 'cred-abc',
        accessToken: overrides?.accessToken ?? 'org-access-token',
        disconnectedAt: overrides?.disconnectedAt ?? null,
        expiresAt: overrides?.expiresAt ?? null,
        connectedAt: new Date('2024-01-01'),
      },
    },
  };
}

function makeIdentity(overrides?: {
  id?: string;
  providerUserId?: string;
  accessToken?: string | null;
}) {
  const accessToken = overrides?.accessToken !== undefined ? overrides.accessToken : 'personal-token';
  return {
    id: overrides?.id ?? 'identity-1',
    providerUserId: overrides?.providerUserId ?? 'li-user-999',
    providerData: accessToken !== null ? { access_token: accessToken } : null,
  };
}

// ─── org assignment found (active credential) ─────────────────────────────

describe('resolveLinkedInTarget — org assignment found', () => {
  beforeEach(() => {
    mockFindFirstAssignment.mockResolvedValue(makeAssignment());
    mockFindFirstIdentity.mockResolvedValue(makeIdentity());
  });

  afterEach(() => vi.clearAllMocks());

  it('returns a target with the org credential accessToken', async () => {
    const target = await resolveLinkedInTarget('user-1');
    expect(target?.accessToken).toBe('org-access-token');
  });

  it('returns authorUrn built from the org page ID', async () => {
    const target = await resolveLinkedInTarget('user-1');
    expect(target?.authorUrn).toBe('urn:li:organization:page-123');
  });

  it('returns the org credential ID as credentialId', async () => {
    const target = await resolveLinkedInTarget('user-1');
    expect(target?.credentialId).toBe('cred-abc');
  });

  it('does NOT fall through to personal identity lookup when org assignment is active', async () => {
    await resolveLinkedInTarget('user-1');
    expect(mockFindFirstIdentity).not.toHaveBeenCalled();
  });
});

// ─── org assignment found but credential is disconnected ──────────────────

describe('resolveLinkedInTarget — org assignment with disconnected credential', () => {
  beforeEach(() => {
    mockFindFirstAssignment.mockResolvedValue(
      makeAssignment({ disconnectedAt: new Date('2023-06-01') })
    );
    mockFindFirstIdentity.mockResolvedValue(makeIdentity());
  });

  afterEach(() => vi.clearAllMocks());

  it('falls back to personal identity when org credential is disconnected', async () => {
    const target = await resolveLinkedInTarget('user-1');
    expect(target?.authorUrn).toBe('urn:li:person:li-user-999');
  });

  it('uses the personal access token', async () => {
    const target = await resolveLinkedInTarget('user-1');
    expect(target?.accessToken).toBe('personal-token');
  });
});

// ─── org assignment found but credential is expired ───────────────────────

describe('resolveLinkedInTarget — org assignment with expired credential', () => {
  beforeEach(() => {
    mockFindFirstAssignment.mockResolvedValue(
      makeAssignment({ expiresAt: new Date('2020-01-01') }) // well in the past
    );
    mockFindFirstIdentity.mockResolvedValue(makeIdentity());
  });

  afterEach(() => vi.clearAllMocks());

  it('falls back to personal identity when org credential is expired', async () => {
    const target = await resolveLinkedInTarget('user-1');
    expect(target?.authorUrn).toBe('urn:li:person:li-user-999');
  });
});

// ─── no org assignment — falls back to personal identity ──────────────────

describe('resolveLinkedInTarget — no org assignment, personal identity exists', () => {
  beforeEach(() => {
    mockFindFirstAssignment.mockResolvedValue(null);
    mockFindFirstIdentity.mockResolvedValue(makeIdentity());
  });

  afterEach(() => vi.clearAllMocks());

  it('returns a target with personal accessToken', async () => {
    const target = await resolveLinkedInTarget('user-1');
    expect(target?.accessToken).toBe('personal-token');
  });

  it('returns authorUrn built from providerUserId', async () => {
    const target = await resolveLinkedInTarget('user-1');
    expect(target?.authorUrn).toBe('urn:li:person:li-user-999');
  });

  it('returns the linkedIdentity id as credentialId', async () => {
    const target = await resolveLinkedInTarget('user-1');
    expect(target?.credentialId).toBe('identity-1');
  });

  it('queries the personal linkedIdentity for provider="linkedin"', async () => {
    await resolveLinkedInTarget('user-1');
    expect(mockFindFirstIdentity).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ provider: 'linkedin' }),
      })
    );
  });
});

// ─── no org assignment, no personal identity ──────────────────────────────

describe('resolveLinkedInTarget — neither org assignment nor personal identity', () => {
  beforeEach(() => {
    mockFindFirstAssignment.mockResolvedValue(null);
    mockFindFirstIdentity.mockResolvedValue(null);
  });

  afterEach(() => vi.clearAllMocks());

  it('returns null', async () => {
    const target = await resolveLinkedInTarget('user-1');
    expect(target).toBeNull();
  });
});

// ─── no org assignment, personal identity has no access_token ─────────────

describe('resolveLinkedInTarget — personal identity with missing access_token', () => {
  afterEach(() => vi.clearAllMocks());

  it('returns null when providerData is null', async () => {
    mockFindFirstAssignment.mockResolvedValue(null);
    mockFindFirstIdentity.mockResolvedValue(makeIdentity({ accessToken: null }));

    const target = await resolveLinkedInTarget('user-1');
    expect(target).toBeNull();
  });

  it('returns null when providerData has no access_token key', async () => {
    mockFindFirstAssignment.mockResolvedValue(null);
    mockFindFirstIdentity.mockResolvedValue({
      id: 'identity-2',
      providerUserId: 'li-user-000',
      providerData: {},
    });

    const target = await resolveLinkedInTarget('user-1');
    expect(target).toBeNull();
  });
});

// ─── org assignment with non-expiring credential ──────────────────────────

describe('resolveLinkedInTarget — org credential with null expiresAt (never expires)', () => {
  beforeEach(() => {
    mockFindFirstAssignment.mockResolvedValue(
      makeAssignment({ expiresAt: null, disconnectedAt: null })
    );
  });

  afterEach(() => vi.clearAllMocks());

  it('treats null expiresAt as active', async () => {
    const target = await resolveLinkedInTarget('user-1');
    expect(target?.authorUrn).toBe('urn:li:organization:page-123');
  });
});

// ─── explicit requested target: { kind: 'personal' } ──────────────────────

describe('resolveLinkedInTarget — explicit personal target', () => {
  afterEach(() => vi.clearAllMocks());

  it('returns the personal urn/token even when an active org assignment exists', async () => {
    mockFindFirstAssignment.mockResolvedValue(makeAssignment());
    mockFindFirstIdentity.mockResolvedValue(makeIdentity());

    const target = await resolveLinkedInTarget('user-1', { kind: 'personal' });
    expect(target?.authorUrn).toBe('urn:li:person:li-user-999');
    expect(target?.accessToken).toBe('personal-token');
    expect(target?.credentialId).toBe('identity-1');
  });

  it('does NOT query org assignments when personal is explicitly requested', async () => {
    mockFindFirstAssignment.mockResolvedValue(makeAssignment());
    mockFindFirstIdentity.mockResolvedValue(makeIdentity());

    await resolveLinkedInTarget('user-1', { kind: 'personal' });
    expect(mockFindFirstAssignment).not.toHaveBeenCalled();
  });

  it('returns null when no personal identity exists — even with an active org assignment available', async () => {
    mockFindFirstAssignment.mockResolvedValue(makeAssignment());
    mockFindFirstIdentity.mockResolvedValue(null);

    const target = await resolveLinkedInTarget('user-1', { kind: 'personal' });
    expect(target).toBeNull();
    expect(mockFindFirstAssignment).not.toHaveBeenCalled();
  });

  it('returns null when the identity has no access_token (providerData null)', async () => {
    mockFindFirstAssignment.mockResolvedValue(makeAssignment());
    mockFindFirstIdentity.mockResolvedValue(makeIdentity({ accessToken: null }));

    const target = await resolveLinkedInTarget('user-1', { kind: 'personal' });
    expect(target).toBeNull();
  });

  it('returns null when providerData exists but lacks an access_token key', async () => {
    mockFindFirstAssignment.mockResolvedValue(makeAssignment());
    mockFindFirstIdentity.mockResolvedValue({
      id: 'identity-3',
      providerUserId: 'li-user-111',
      providerData: {},
    });

    const target = await resolveLinkedInTarget('user-1', { kind: 'personal' });
    expect(target).toBeNull();
    expect(mockFindFirstAssignment).not.toHaveBeenCalled();
  });
});

// ─── explicit requested target: { kind: 'orgPage', pageId } ───────────────

describe('resolveLinkedInTarget — explicit orgPage target', () => {
  afterEach(() => vi.clearAllMocks());

  it('returns the org URN, token and credentialId for a valid active assignment', async () => {
    mockFindFirstAssignment.mockResolvedValue(makeAssignment());
    mockFindFirstIdentity.mockResolvedValue(makeIdentity());

    const target = await resolveLinkedInTarget('user-1', {
      kind: 'orgPage',
      pageId: 'org-page-uuid-1',
    });
    expect(target?.authorUrn).toBe('urn:li:organization:page-123');
    expect(target?.accessToken).toBe('org-access-token');
    expect(target?.credentialId).toBe('cred-abc');
  });

  it('queries the assignment scoped to BOTH userId and pageId', async () => {
    mockFindFirstAssignment.mockResolvedValue(makeAssignment());

    await resolveLinkedInTarget('user-1', { kind: 'orgPage', pageId: 'org-page-uuid-1' });

    expect(mockFindFirstAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-1', pageId: 'org-page-uuid-1' }),
      })
    );
  });

  it('returns null when no assignment exists for that pageId', async () => {
    mockFindFirstAssignment.mockResolvedValue(null);
    mockFindFirstIdentity.mockResolvedValue(makeIdentity());

    const target = await resolveLinkedInTarget('user-1', {
      kind: 'orgPage',
      pageId: 'unassigned-page',
    });
    expect(target).toBeNull();
  });

  it('does NOT fall back to the personal identity when the assignment is missing', async () => {
    mockFindFirstAssignment.mockResolvedValue(null);
    mockFindFirstIdentity.mockResolvedValue(makeIdentity());

    await resolveLinkedInTarget('user-1', { kind: 'orgPage', pageId: 'unassigned-page' });
    expect(mockFindFirstIdentity).not.toHaveBeenCalled();
  });

  it('returns null when the org credential is disconnected', async () => {
    mockFindFirstAssignment.mockResolvedValue(
      makeAssignment({ disconnectedAt: new Date('2023-06-01') })
    );
    mockFindFirstIdentity.mockResolvedValue(makeIdentity());

    const target = await resolveLinkedInTarget('user-1', {
      kind: 'orgPage',
      pageId: 'org-page-uuid-1',
    });
    expect(target).toBeNull();
  });

  it('does NOT fall back to the personal identity when the credential is disconnected', async () => {
    mockFindFirstAssignment.mockResolvedValue(
      makeAssignment({ disconnectedAt: new Date('2023-06-01') })
    );
    mockFindFirstIdentity.mockResolvedValue(makeIdentity());

    await resolveLinkedInTarget('user-1', { kind: 'orgPage', pageId: 'org-page-uuid-1' });
    expect(mockFindFirstIdentity).not.toHaveBeenCalled();
  });

  it('returns null when the org credential is expired', async () => {
    mockFindFirstAssignment.mockResolvedValue(
      makeAssignment({ expiresAt: new Date('2020-01-01') })
    );
    mockFindFirstIdentity.mockResolvedValue(makeIdentity());

    const target = await resolveLinkedInTarget('user-1', {
      kind: 'orgPage',
      pageId: 'org-page-uuid-1',
    });
    expect(target).toBeNull();
  });

  it('does NOT fall back to the personal identity when the credential is expired', async () => {
    mockFindFirstAssignment.mockResolvedValue(
      makeAssignment({ expiresAt: new Date('2020-01-01') })
    );
    mockFindFirstIdentity.mockResolvedValue(makeIdentity());

    await resolveLinkedInTarget('user-1', { kind: 'orgPage', pageId: 'org-page-uuid-1' });
    expect(mockFindFirstIdentity).not.toHaveBeenCalled();
  });

  it('treats a credential with null expiresAt as active', async () => {
    mockFindFirstAssignment.mockResolvedValue(
      makeAssignment({ expiresAt: null, disconnectedAt: null })
    );

    const target = await resolveLinkedInTarget('user-1', {
      kind: 'orgPage',
      pageId: 'org-page-uuid-1',
    });
    expect(target?.authorUrn).toBe('urn:li:organization:page-123');
  });
});

// ─── parseRequestedLinkedInTarget ──────────────────────────────────────────

describe('parseRequestedLinkedInTarget — accepted values', () => {
  it('returns ok with undefined target for undefined input', () => {
    expect(parseRequestedLinkedInTarget(undefined)).toEqual({ ok: true, target: undefined });
  });

  it('returns ok with undefined target for null input', () => {
    expect(parseRequestedLinkedInTarget(null)).toEqual({ ok: true, target: undefined });
  });

  it('accepts { kind: "personal" }', () => {
    expect(parseRequestedLinkedInTarget({ kind: 'personal' })).toEqual({
      ok: true,
      target: { kind: 'personal' },
    });
  });

  it('accepts { kind: "orgPage", pageId: "abc" }', () => {
    expect(parseRequestedLinkedInTarget({ kind: 'orgPage', pageId: 'abc' })).toEqual({
      ok: true,
      target: { kind: 'orgPage', pageId: 'abc' },
    });
  });
});

describe('parseRequestedLinkedInTarget — rejected values', () => {
  it('rejects the bare string "personal"', () => {
    expect(parseRequestedLinkedInTarget('personal')).toEqual({ ok: false });
  });

  it('rejects { kind: "orgPage" } without a pageId', () => {
    expect(parseRequestedLinkedInTarget({ kind: 'orgPage' })).toEqual({ ok: false });
  });

  it('rejects { kind: "orgPage", pageId: 5 } with a non-string pageId', () => {
    expect(parseRequestedLinkedInTarget({ kind: 'orgPage', pageId: 5 })).toEqual({ ok: false });
  });

  it('rejects an empty-string pageId', () => {
    expect(parseRequestedLinkedInTarget({ kind: 'orgPage', pageId: '' })).toEqual({ ok: false });
  });

  it('rejects an unknown kind', () => {
    expect(parseRequestedLinkedInTarget({ kind: 'bogus' })).toEqual({ ok: false });
  });

  it('rejects a number', () => {
    expect(parseRequestedLinkedInTarget(42)).toEqual({ ok: false });
  });

  it('rejects an array', () => {
    expect(parseRequestedLinkedInTarget([])).toEqual({ ok: false });
  });
});
