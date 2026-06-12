/**
 * Unit tests for lib/linkedin/personal-pages.ts
 *
 * Mocks:
 *  - @/lib/prisma              — prevents real DB calls
 *  - @/lib/auth/oauth-linkedin — controls the LinkedIn admin-pages API result
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── module mocks ─────────────────────────────────────────────────────────────

const mockDeleteMany = vi.hoisted(() => vi.fn());
const mockUpsert = vi.hoisted(() => vi.fn());
const mockFindMany = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());
const mockFetchAdminPages = vi.hoisted(() => vi.fn());

vi.mock('@/lib/prisma', () => ({
  prisma: {
    linkedInPersonalPage: {
      deleteMany: mockDeleteMany,
      upsert: mockUpsert,
      findMany: mockFindMany,
    },
    $transaction: mockTransaction,
  },
}));

vi.mock('@/lib/auth/oauth-linkedin', () => ({
  fetchLinkedInAdminPages: mockFetchAdminPages,
}));

import { syncLinkedInPersonalPages } from './personal-pages';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeRow(overrides?: {
  id?: string;
  linkedInPageId?: string;
  pageName?: string;
}) {
  return {
    id: overrides?.id ?? 'pp-uuid-1',
    identityId: 'identity-1',
    linkedInPageId: overrides?.linkedInPageId ?? '12345',
    pageName: overrides?.pageName ?? 'Acme Corp',
    pageLogoUrl: null,
    lastSyncedAt: new Date('2026-06-12T00:00:00Z'),
  };
}

beforeEach(() => {
  mockDeleteMany.mockReturnValue('delete-op');
  mockUpsert.mockReturnValue('upsert-op');
  mockTransaction.mockResolvedValue([]);
  mockFindMany.mockResolvedValue([makeRow()]);
});

afterEach(() => vi.clearAllMocks());

// ── happy path: upsert + delete reconciliation ──────────────────────────────

describe('syncLinkedInPersonalPages — reconciliation', () => {
  it('fetches admin pages with the provided access token', async () => {
    mockFetchAdminPages.mockResolvedValue([]);
    await syncLinkedInPersonalPages('identity-1', 'my-token');
    expect(mockFetchAdminPages).toHaveBeenCalledWith('my-token');
  });

  it('deletes rows whose linkedInPageId is no longer returned', async () => {
    mockFetchAdminPages.mockResolvedValue([
      { id: '12345', name: 'Acme Corp' },
      { id: '67890', name: 'Beta Inc' },
    ]);

    await syncLinkedInPersonalPages('identity-1', 'token');

    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { identityId: 'identity-1', linkedInPageId: { notIn: ['12345', '67890'] } },
    });
  });

  it('upserts every returned page keyed by identityId + linkedInPageId', async () => {
    mockFetchAdminPages.mockResolvedValue([
      { id: '12345', name: 'Acme Corp', logoUrl: 'https://example.com/acme.png' },
      { id: '67890', name: 'Beta Inc' },
    ]);

    await syncLinkedInPersonalPages('identity-1', 'token');

    expect(mockUpsert).toHaveBeenCalledTimes(2);
    expect(mockUpsert).toHaveBeenNthCalledWith(1, {
      where: {
        identityId_linkedInPageId: { identityId: 'identity-1', linkedInPageId: '12345' },
      },
      update: {
        pageName: 'Acme Corp',
        pageLogoUrl: 'https://example.com/acme.png',
        lastSyncedAt: expect.any(Date),
      },
      create: {
        identityId: 'identity-1',
        linkedInPageId: '12345',
        pageName: 'Acme Corp',
        pageLogoUrl: 'https://example.com/acme.png',
        lastSyncedAt: expect.any(Date),
      },
    });
  });

  it('normalizes a missing logoUrl to null in both update and create', async () => {
    mockFetchAdminPages.mockResolvedValue([{ id: '67890', name: 'Beta Inc' }]);

    await syncLinkedInPersonalPages('identity-1', 'token');

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ pageLogoUrl: null }),
        create: expect.objectContaining({ pageLogoUrl: null }),
      })
    );
  });

  it('runs the delete and all upserts in a single transaction, delete first', async () => {
    mockFetchAdminPages.mockResolvedValue([
      { id: '12345', name: 'Acme Corp' },
      { id: '67890', name: 'Beta Inc' },
    ]);

    await syncLinkedInPersonalPages('identity-1', 'token');

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    const ops = mockTransaction.mock.calls[0][0] as unknown[];
    expect(ops).toEqual(['delete-op', 'upsert-op', 'upsert-op']);
  });

  it('deletes every row (notIn: []) and upserts nothing when LinkedIn returns zero pages', async () => {
    mockFetchAdminPages.mockResolvedValue([]);

    await syncLinkedInPersonalPages('identity-1', 'token');

    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { identityId: 'identity-1', linkedInPageId: { notIn: [] } },
    });
    expect(mockUpsert).not.toHaveBeenCalled();
    const ops = mockTransaction.mock.calls[0][0] as unknown[];
    expect(ops).toEqual(['delete-op']);
  });

  it('returns the synced rows from findMany, scoped to the identity and ordered by pageName', async () => {
    mockFetchAdminPages.mockResolvedValue([{ id: '12345', name: 'Acme Corp' }]);
    const rows = [makeRow(), makeRow({ id: 'pp-uuid-2', linkedInPageId: '67890', pageName: 'Beta Inc' })];
    mockFindMany.mockResolvedValue(rows);

    const result = await syncLinkedInPersonalPages('identity-1', 'token');

    expect(result).toBe(rows);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { identityId: 'identity-1' },
      orderBy: { pageName: 'asc' },
    });
  });
});

// ── failure path ─────────────────────────────────────────────────────────────

describe('syncLinkedInPersonalPages — LinkedIn API failure', () => {
  it('propagates the fetch error and never touches the database', async () => {
    mockFetchAdminPages.mockRejectedValue(
      new Error('Failed to fetch LinkedIn admin pages: HTTP 403')
    );

    await expect(syncLinkedInPersonalPages('identity-1', 'token')).rejects.toThrow(
      'Failed to fetch LinkedIn admin pages: HTTP 403'
    );

    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockDeleteMany).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockFindMany).not.toHaveBeenCalled();
  });
});
