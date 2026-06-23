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

  it("returns 400 when q is longer than 200 chars", async () => {
    const res = await GET(makeRequest({ q: "a".repeat(201) }));
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toMatch(/200/);
  });

  it("accepts q exactly 200 chars", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([[], 0] as never);
    const res = await GET(makeRequest({ q: "a".repeat(200) }));
    expect(res.status).toBe(200);
  });
});

// ── limit validation ──────────────────────────────────────────────────────────

describe("GET /api/lists/search — limit validation", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns 400 when limit > 100", async () => {
    const res = await GET(makeRequest({ q: "list", limit: "500" }));
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toMatch(/100/);
  });

  it("accepts limit exactly 100", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([[], 0] as never);
    const res = await GET(makeRequest({ q: "list", limit: "100" }));
    expect(res.status).toBe(200);
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
    return {
      id: "l",
      title: "List",
      description: null,
      isPublic: true,
      folderId: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-02T00:00:00Z"),
      _count: { dataRows: 0 },
    };
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

  function rowWith(isPublic: unknown, id = "l1", title = "Public") {
    return {
      id,
      title,
      description: null,
      isPublic,
      folderId: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-02T00:00:00Z"),
      _count: { dataRows: 1 },
    };
  }

  it("reflects boolean true as-is from the DB row", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([[rowWith(true)], 1] as never);
    const res = await GET(makeRequest({ q: "pub" }));
    const body = await json(res);
    expect(body.lists[0].isPublic).toBe(true);
  });

  it("reflects boolean false as-is from the DB row", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([[rowWith(false, "l2", "Private")], 1] as never);
    const res = await GET(makeRequest({ q: "priv" }));
    const body = await json(res);
    expect(body.lists[0].isPublic).toBe(false);
  });

  it("does NOT treat the string 'true' as boolean true — type identity is preserved", async () => {
    // Simulates a misconfigured consumer passing a string; the route echoes DB value unchanged.
    // The route uses `=== true` checks on Prisma's typed boolean, so a string never equals true.
    const stringTrue = "true" as unknown as boolean;
    vi.mocked(prisma.$transaction).mockResolvedValue([[rowWith(stringTrue, "l3", "Bad")], 1] as never);
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
    const row = {
      id: "l4",
      title: "Counts",
      description: null,
      isPublic: true,
      folderId: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-02T00:00:00Z"),
      _count: { dataRows: 7 },
    };
    vi.mocked(prisma.$transaction).mockResolvedValue([[row], 1] as never);
    const res = await GET(makeRequest({ q: "count" }));
    const body = await json(res);
    expect(body.lists[0].itemCount).toBe(7);
    expect(body.lists[0]._count).toBeUndefined();
  });
});

// ── matching, ownership, response shape ───────────────────────────────────────

describe("GET /api/lists/search — matching and ownership", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
  });
  afterEach(() => vi.restoreAllMocks());

  function row(overrides: Partial<{ id: string; title: string; description: string | null; folderId: string | null }> = {}) {
    return {
      id: "l1",
      title: "My List",
      description: null,
      isPublic: true,
      folderId: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-02T00:00:00Z"),
      _count: { dataRows: 2 },
      ...overrides,
    };
  }

  it("returns a list whose title matches the query", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([
      [row({ title: "Grocery List" })],
      1,
    ] as never);
    const res = await GET(makeRequest({ q: "grocery" }));
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.lists).toHaveLength(1);
    expect(body.lists[0].title).toBe("Grocery List");
  });

  it("returns a list whose description matches the query", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([
      [row({ title: "Untitled", description: "weekly shopping run" })],
      1,
    ] as never);
    const res = await GET(makeRequest({ q: "shopping" }));
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.lists[0].description).toBe("weekly shopping run");
  });

  it("returns null description verbatim without coercion", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([[row({ description: null })], 1] as never);
    const res = await GET(makeRequest({ q: "my" }));
    const body = await json(res);
    expect(body.lists[0]).toHaveProperty("description", null);
  });

  it("scopes the query to the authenticated user (userId + deletedAt:null)", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([[], 0] as never);
    await GET(makeRequest({ q: "anything" }));

    const findManyCall = vi.mocked(prisma.list.findMany).mock.calls[0]?.[0] as any;
    const countCall = vi.mocked(prisma.list.count).mock.calls[0]?.[0] as any;

    expect(findManyCall.where.userId).toBe(mockUser.id);
    expect(findManyCall.where.deletedAt).toBeNull();
    expect(findManyCall.where.OR).toEqual([
      { title: { contains: "anything", mode: "insensitive" } },
      { description: { contains: "anything", mode: "insensitive" } },
    ]);
    expect(findManyCall.orderBy).toEqual({ updatedAt: "desc" });
    expect(countCall.where.userId).toBe(mockUser.id);
  });

  it("returns the full DTO shape (id, title, description, isPublic, folderId, itemCount, createdAt, updatedAt)", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([
      [row({ id: "abc", title: "Hello", description: "world", folderId: "f-1" })],
      1,
    ] as never);
    const res = await GET(makeRequest({ q: "hello" }));
    const body = await json(res);
    const list = body.lists[0];
    expect(list.id).toBe("abc");
    expect(list.title).toBe("Hello");
    expect(list.description).toBe("world");
    expect(list.isPublic).toBe(true);
    expect(list.folderId).toBe("f-1");
    expect(list.itemCount).toBe(2);
    expect(typeof list.createdAt).toBe("string");
    expect(typeof list.updatedAt).toBe("string");
  });
});
