/**
 * Unit tests for GET /api/lists/search
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
    list: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/sync-token", () => ({
  getCurrentUserOrSyncToken: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getCurrentUserOrSyncToken } from "@/lib/auth/sync-token";
import { GET } from "./route";

// ── helpers ───────────────────────────────────────────────────────────────────

const mockUser = { id: "user-1", customerStatus: "subscriber" };

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/lists/search");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

async function json(response: Response) {
  return response.json();
}

// ── auth guard ────────────────────────────────────────────────────────────────

describe("GET /api/lists/search — auth", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(null as never);
    const res = await GET(makeRequest({ q: "notes" }));
    expect(res.status).toBe(401);
  });
});

// ── missing q param ───────────────────────────────────────────────────────────

describe("GET /api/lists/search — q validation", () => {
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

  it("returns 400 when q is empty string", async () => {
    const res = await GET(makeRequest({ q: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when q is whitespace only", async () => {
    const res = await GET(makeRequest({ q: "   " }));
    expect(res.status).toBe(400);
  });
});

// ── limit clamping ─────────────────────────────────────────────────────────────

describe("GET /api/lists/search — limit clamping", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
  });
  afterEach(() => vi.restoreAllMocks());

  function rawList(isPublic = true) {
    return {
      id: "l",
      title: "List",
      description: null,
      isPublic,
      folderId: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-02T00:00:00Z"),
      _count: { dataRows: 3 },
    };
  }

  it("clamps limit > 100 to 100", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([new Array(100).fill(rawList()), 200] as never);
    const res = await GET(makeRequest({ q: "list", limit: "9999" }));
    const body = await json(res);
    expect(body.pagination.limit).toBe(100);
  });

  it("uses default 20 when limit is 0", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([[], 0] as never);
    const res = await GET(makeRequest({ q: "list", limit: "0" }));
    const body = await json(res);
    expect(body.pagination.limit).toBe(20);
  });

  it("uses default 20 when limit is negative", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([[], 0] as never);
    const res = await GET(makeRequest({ q: "list", limit: "-1" }));
    const body = await json(res);
    expect(body.pagination.limit).toBe(20);
  });

  it("uses default 20 when limit is NaN", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([[], 0] as never);
    const res = await GET(makeRequest({ q: "list", limit: "nope" }));
    const body = await json(res);
    expect(body.pagination.limit).toBe(20);
  });
});

// ── pagination math ───────────────────────────────────────────────────────────

describe("GET /api/lists/search — pagination", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
  });
  afterEach(() => vi.restoreAllMocks());

  function rawList() {
    return { id: "l", title: "List", isPublic: true, _count: { dataRows: 0 } };
  }

  it("hasMore=true when offset=20, 20 results returned, total=45", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([new Array(20).fill(rawList()), 45] as never);
    const res = await GET(makeRequest({ q: "test", limit: "20", offset: "20" }));
    const body = await json(res);
    expect(body.pagination.hasMore).toBe(true);
  });

  it("hasMore=false when offset=40, 5 results returned, total=45", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([new Array(5).fill(rawList()), 45] as never);
    const res = await GET(makeRequest({ q: "test", limit: "20", offset: "40" }));
    const body = await json(res);
    expect(body.pagination.hasMore).toBe(false);
  });

  it("hasMore=false for empty result set", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([[], 0] as never);
    const res = await GET(makeRequest({ q: "test" }));
    const body = await json(res);
    expect(body.pagination.hasMore).toBe(false);
  });
});

// ── isPublic coercion ─────────────────────────────────────────────────────────
// The route returns isPublic verbatim from the DB row.
// A string "true" from the DB must NOT be coerced — the contract is that
// the route only uses boolean === true (from Prisma's typed schema).
// We verify the response reflects whatever Prisma returns.

describe("GET /api/lists/search — isPublic field passthrough", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it("reflects boolean true as-is from the DB row", async () => {
    const row = { id: "l1", title: "Public", isPublic: true, _count: { dataRows: 1 } };
    vi.mocked(prisma.$transaction).mockResolvedValue([[row], 1] as never);
    const res = await GET(makeRequest({ q: "pub" }));
    const body = await json(res);
    expect(body.lists[0].isPublic).toBe(true);
  });

  it("reflects boolean false as-is from the DB row", async () => {
    const row = { id: "l2", title: "Private", isPublic: false, _count: { dataRows: 0 } };
    vi.mocked(prisma.$transaction).mockResolvedValue([[row], 1] as never);
    const res = await GET(makeRequest({ q: "priv" }));
    const body = await json(res);
    expect(body.lists[0].isPublic).toBe(false);
  });

  it("does NOT treat the string 'true' as boolean true — type identity is preserved", async () => {
    // Simulates a misconfigured consumer passing a string; the route echoes DB value unchanged.
    // The route uses `=== true` checks on Prisma's typed boolean, so a string never equals true.
    const stringTrue = "true" as unknown as boolean;
    const row = { id: "l3", title: "Bad", isPublic: stringTrue, _count: { dataRows: 0 } };
    vi.mocked(prisma.$transaction).mockResolvedValue([[row], 1] as never);
    const res = await GET(makeRequest({ q: "bad" }));
    const body = await json(res);
    // The JSON serialised value should be the string "true", not boolean true.
    expect(body.lists[0].isPublic).not.toBe(true);
  });
});

// ── itemCount mapping ─────────────────────────────────────────────────────────

describe("GET /api/lists/search — itemCount field", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it("maps _count.dataRows to itemCount and removes _count", async () => {
    const row = { id: "l4", title: "Counts", isPublic: true, _count: { dataRows: 7 } };
    vi.mocked(prisma.$transaction).mockResolvedValue([[row], 1] as never);
    const res = await GET(makeRequest({ q: "count" }));
    const body = await json(res);
    expect(body.lists[0].itemCount).toBe(7);
    expect(body.lists[0]._count).toBeUndefined();
  });
});
