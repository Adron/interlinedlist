/**
 * Unit tests for GET /api/documents/search
 *
 * Mocks:
 *  - @/lib/prisma            — prevents real DB calls
 *  - @/lib/auth/sync-token   — controls auth result
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    document: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/sync-token", () => ({
  getCurrentUserOrSyncToken: vi.fn(),
}));

// Import after mocks are registered
import { prisma } from "@/lib/prisma";
import { getCurrentUserOrSyncToken } from "@/lib/auth/sync-token";
import { GET } from "./route";

// ── helpers ───────────────────────────────────────────────────────────────────

const mockUser = { id: "user-1", customerStatus: "subscriber" };

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/documents/search");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

async function json(response: Response) {
  return response.json();
}

// ── auth guard ────────────────────────────────────────────────────────────────

describe("GET /api/documents/search — auth", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns 401 when no user is authenticated", async () => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(null as never);
    const res = await GET(makeRequest({ q: "hello" }));
    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error).toMatch(/Unauthorized/);
  });
});

// ── missing q param ───────────────────────────────────────────────────────────

describe("GET /api/documents/search — q validation", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns 400 when q is absent", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toMatch(/required/i);
  });

  it("returns 400 when q is an empty string", async () => {
    const res = await GET(makeRequest({ q: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when q is only whitespace", async () => {
    const res = await GET(makeRequest({ q: "   " }));
    expect(res.status).toBe(400);
  });
});

// ── limit clamping ─────────────────────────────────────────────────────────────

describe("GET /api/documents/search — limit clamping", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
  });
  afterEach(() => vi.restoreAllMocks());

  function setupTransaction(docs: unknown[], total: number) {
    vi.mocked(prisma.$transaction).mockResolvedValue([docs, total] as never);
  }

  it("clamps limit > 100 to 100", async () => {
    setupTransaction(new Array(100).fill({ id: "d", title: "T", folderId: null, updatedAt: new Date() }), 200);
    const res = await GET(makeRequest({ q: "test", limit: "500" }));
    const body = await json(res);
    expect(body.pagination.limit).toBe(100);
  });

  it("uses default limit 20 when limit <= 0", async () => {
    setupTransaction([], 0);
    const res = await GET(makeRequest({ q: "test", limit: "0" }));
    const body = await json(res);
    expect(body.pagination.limit).toBe(20);
  });

  it("uses default limit 20 when limit is negative", async () => {
    setupTransaction([], 0);
    const res = await GET(makeRequest({ q: "test", limit: "-5" }));
    const body = await json(res);
    expect(body.pagination.limit).toBe(20);
  });

  it("uses default limit 20 when limit is NaN", async () => {
    setupTransaction([], 0);
    const res = await GET(makeRequest({ q: "test", limit: "abc" }));
    const body = await json(res);
    expect(body.pagination.limit).toBe(20);
  });

  it("passes through a valid limit within range", async () => {
    setupTransaction(new Array(30).fill({ id: "d", title: "T", folderId: null, updatedAt: new Date() }), 30);
    const res = await GET(makeRequest({ q: "test", limit: "30" }));
    const body = await json(res);
    expect(body.pagination.limit).toBe(30);
  });
});

// ── pagination math ───────────────────────────────────────────────────────────

describe("GET /api/documents/search — pagination", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
  });
  afterEach(() => vi.restoreAllMocks());

  function doc() {
    return { id: "d", title: "T", folderId: null, updatedAt: new Date() };
  }

  it("hasMore=true when offset=20, 20 results returned, total=45", async () => {
    // offset(20) + returned(20) = 40 < total(45)
    vi.mocked(prisma.$transaction).mockResolvedValue([new Array(20).fill(doc()), 45] as never);
    const res = await GET(makeRequest({ q: "test", limit: "20", offset: "20" }));
    const body = await json(res);
    expect(body.pagination.hasMore).toBe(true);
    expect(body.pagination.total).toBe(45);
    expect(body.pagination.offset).toBe(20);
  });

  it("hasMore=false when offset=40, 5 results returned, total=45", async () => {
    // offset(40) + returned(5) = 45 which is NOT < 45
    vi.mocked(prisma.$transaction).mockResolvedValue([new Array(5).fill(doc()), 45] as never);
    const res = await GET(makeRequest({ q: "test", limit: "20", offset: "40" }));
    const body = await json(res);
    expect(body.pagination.hasMore).toBe(false);
  });

  it("hasMore=false when no results and total=0", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([[], 0] as never);
    const res = await GET(makeRequest({ q: "test" }));
    const body = await json(res);
    expect(body.pagination.hasMore).toBe(false);
  });

  it("uses default offset 0 when offset is absent", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([[], 0] as never);
    const res = await GET(makeRequest({ q: "test" }));
    const body = await json(res);
    expect(body.pagination.offset).toBe(0);
  });

  it("uses offset 0 when offset is negative", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([[], 0] as never);
    const res = await GET(makeRequest({ q: "test", offset: "-10" }));
    const body = await json(res);
    expect(body.pagination.offset).toBe(0);
  });
});

// ── success shape ─────────────────────────────────────────────────────────────

describe("GET /api/documents/search — success response", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns 200 with documents array and pagination envelope", async () => {
    const docs = [{ id: "abc", title: "My Doc", folderId: null, updatedAt: new Date() }];
    vi.mocked(prisma.$transaction).mockResolvedValue([docs, 1] as never);

    const res = await GET(makeRequest({ q: "doc" }));
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(Array.isArray(body.documents)).toBe(true);
    expect(body.documents).toHaveLength(1);
    expect(body.pagination).toBeDefined();
  });
});
