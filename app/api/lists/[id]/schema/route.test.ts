/**
 * Unit tests for PUT /api/lists/[id]/schema — non-destructive property update.
 *
 * Mocks:
 *  - @/lib/prisma          — prevents real DB calls
 *  - @/lib/auth/sync-token — controls auth result
 *
 * The DSL (destructive) branch is not exercised here; it has separate coverage
 * via its existing callers and is left intact for backward compatibility.
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    list: {
      findUnique: vi.fn(),
    },
    listProperty: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    listDataRow: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/auth/sync-token", () => ({
  getCurrentUserOrSyncToken: vi.fn(),
}));

// queries.ts and dsl-parser.ts are imported by the destructive branch only,
// but are referenced at module top so we stub them to avoid loading real code.
vi.mock("@/lib/lists/queries", () => ({
  getListProperties: vi.fn(),
  validateParentRelationship: vi.fn(),
}));

vi.mock("@/lib/lists/dsl-parser", () => ({
  parseDSLSchema: vi.fn(),
  validateDSLSchema: vi.fn(),
  parsedSchemaToDSL: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getCurrentUserOrSyncToken } from "@/lib/auth/sync-token";
import { PUT } from "./route";

// ── helpers ───────────────────────────────────────────────────────────────────

const LIST_ID = "list-1";
const USER_ID = "user-1";
const mockUser = { id: USER_ID, customerStatus: "free" };

function makeRequest(
  body: unknown,
  query: Record<string, string> = {}
): [NextRequest, { params: { id: string } }] {
  const url = new URL(`http://localhost/api/lists/${LIST_ID}/schema`);
  Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
  const req = new NextRequest(url.toString(), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return [req, { params: { id: LIST_ID } }];
}

async function json(response: Response) {
  return response.json();
}

/**
 * Wire prisma.$transaction so the callback runs against the same mocked
 * delegate methods used outside transactions. The test then asserts against
 * the global mock call lists.
 */
function setupTransactionPassthrough() {
  vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
    if (typeof fn === "function") {
      return (fn as (tx: typeof prisma) => unknown)(prisma);
    }
    return fn;
  });
}

function mockListOwnedByUser() {
  vi.mocked(prisma.list.findUnique).mockResolvedValue({
    id: LIST_ID,
    userId: USER_ID,
    deletedAt: null,
  } as never);
}

// ── auth ──────────────────────────────────────────────────────────────────────

describe("PUT /api/lists/[id]/schema — auth", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(null as never);
    const [req, ctx] = makeRequest({ properties: [] });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(401);
  });
});

// ── ownership ─────────────────────────────────────────────────────────────────

describe("PUT /api/lists/[id]/schema — ownership", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns 404 when the list does not exist", async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue(null as never);
    const [req, ctx] = makeRequest({ properties: [] });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns 404 when the list is soft-deleted", async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue({
      id: LIST_ID,
      userId: USER_ID,
      deletedAt: new Date(),
    } as never);
    const [req, ctx] = makeRequest({ properties: [] });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns 403 when the list belongs to a different user", async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue({
      id: LIST_ID,
      userId: "someone-else",
      deletedAt: null,
    } as never);
    const [req, ctx] = makeRequest({ properties: [] });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(403);
  });
});

// ── validation ────────────────────────────────────────────────────────────────

describe("PUT /api/lists/[id]/schema — validation", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
    mockListOwnedByUser();
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns 400 when two properties share a propertyKey", async () => {
    const [req, ctx] = makeRequest({
      properties: [
        { propertyKey: "title", propertyName: "Title", propertyType: "text" },
        { propertyKey: "title", propertyName: "Other", propertyType: "text" },
      ],
    });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(400);
    expect((await json(res)).error).toMatch(/duplicate propertyKey/i);
  });

  it("returns 400 when propertyType is unknown", async () => {
    const [req, ctx] = makeRequest({
      properties: [
        { propertyKey: "foo", propertyName: "Foo", propertyType: "blob" },
      ],
    });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(400);
    expect((await json(res)).error).toMatch(/Unknown propertyType/i);
  });

  it("returns 400 when propertyKey exceeds 60 chars", async () => {
    const [req, ctx] = makeRequest({
      properties: [
        { propertyKey: "k".repeat(61), propertyName: "K", propertyType: "text" },
      ],
    });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 when propertyName exceeds 120 chars", async () => {
    const [req, ctx] = makeRequest({
      properties: [
        { propertyKey: "k", propertyName: "n".repeat(121), propertyType: "text" },
      ],
    });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 when propertyKey would change for an existing id", async () => {
    vi.mocked(prisma.listProperty.findMany).mockResolvedValue([
      {
        id: "prop-a",
        listId: LIST_ID,
        propertyKey: "original_key",
        propertyName: "Original",
        propertyType: "text",
        displayOrder: 0,
        isRequired: false,
        isVisible: true,
        defaultValue: null,
        helpText: null,
        placeholder: null,
        validationRules: null,
        visibilityCondition: null,
      },
    ] as never);

    const [req, ctx] = makeRequest({
      properties: [
        {
          id: "prop-a",
          propertyKey: "renamed_key",
          propertyName: "Original",
          propertyType: "text",
        },
      ],
    });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(400);
    expect((await json(res)).error).toMatch(/propertyKey cannot change/i);
  });

  it("returns 400 when id references a property not on this list", async () => {
    vi.mocked(prisma.listProperty.findMany).mockResolvedValue([] as never);
    const [req, ctx] = makeRequest({
      properties: [
        {
          id: "bogus",
          propertyKey: "title",
          propertyName: "Title",
          propertyType: "text",
        },
      ],
    });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(400);
    expect((await json(res)).error).toMatch(/does not exist/i);
  });
});

// ── create new property ───────────────────────────────────────────────────────

describe("PUT /api/lists/[id]/schema — create new property", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
    mockListOwnedByUser();
    setupTransactionPassthrough();
  });
  afterEach(() => vi.restoreAllMocks());

  it("creates a new property when no id is given", async () => {
    vi.mocked(prisma.listProperty.findMany)
      .mockResolvedValueOnce([] as never) // initial load
      .mockResolvedValueOnce([
        // final fetch — return the freshly-created shape
        {
          id: "prop-new",
          listId: LIST_ID,
          propertyKey: "title",
          propertyName: "Title",
          propertyType: "text",
          displayOrder: 0,
          isVisible: true,
          isRequired: false,
          defaultValue: null,
          helpText: null,
          placeholder: null,
        },
      ] as never);
    vi.mocked(prisma.listProperty.create).mockResolvedValue({} as never);

    const [req, ctx] = makeRequest({
      properties: [
        { propertyKey: "title", propertyName: "Title", propertyType: "text" },
      ],
    });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.properties).toHaveLength(1);
    expect(body.properties[0].propertyKey).toBe("title");

    // create was called once with the right data
    expect(vi.mocked(prisma.listProperty.create)).toHaveBeenCalledTimes(1);
    const call = vi.mocked(prisma.listProperty.create).mock.calls[0][0] as {
      data: { propertyKey: string; listId: string; displayOrder: number };
    };
    expect(call.data.propertyKey).toBe("title");
    expect(call.data.listId).toBe(LIST_ID);
    expect(call.data.displayOrder).toBe(0);
  });
});

// ── rename display name in place ──────────────────────────────────────────────

describe("PUT /api/lists/[id]/schema — rename display name", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
    mockListOwnedByUser();
    setupTransactionPassthrough();
  });
  afterEach(() => vi.restoreAllMocks());

  it("updates propertyName without touching propertyKey, preserving row data", async () => {
    const existing = {
      id: "prop-a",
      listId: LIST_ID,
      propertyKey: "title",
      propertyName: "Old Title",
      propertyType: "text",
      displayOrder: 0,
      isRequired: false,
      isVisible: true,
      defaultValue: null,
      helpText: null,
      placeholder: null,
    };
    vi.mocked(prisma.listProperty.findMany)
      .mockResolvedValueOnce([existing] as never)
      .mockResolvedValueOnce([
        { ...existing, propertyName: "New Title" },
      ] as never);
    vi.mocked(prisma.listProperty.update).mockResolvedValue({} as never);

    const [req, ctx] = makeRequest({
      properties: [
        {
          id: "prop-a",
          propertyKey: "title",
          propertyName: "New Title",
          propertyType: "text",
        },
      ],
    });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(200);

    // Update was applied to the existing row (not delete+create)
    expect(vi.mocked(prisma.listProperty.update)).toHaveBeenCalledTimes(1);
    const update = vi.mocked(prisma.listProperty.update).mock.calls[0][0] as {
      where: { id: string };
      data: { propertyName: string };
    };
    expect(update.where.id).toBe("prop-a");
    expect(update.data.propertyName).toBe("New Title");

    // Nothing was deleted and no row data was rewritten — row data preserved.
    expect(vi.mocked(prisma.listProperty.deleteMany)).not.toHaveBeenCalled();
    expect(vi.mocked(prisma.listDataRow.update)).not.toHaveBeenCalled();
  });
});

// ── reorder ───────────────────────────────────────────────────────────────────

describe("PUT /api/lists/[id]/schema — reorder", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
    mockListOwnedByUser();
    setupTransactionPassthrough();
  });
  afterEach(() => vi.restoreAllMocks());

  it("renumbers displayOrder contiguously based on incoming array order", async () => {
    const a = {
      id: "prop-a",
      listId: LIST_ID,
      propertyKey: "a",
      propertyName: "A",
      propertyType: "text",
      displayOrder: 0,
    };
    const b = {
      id: "prop-b",
      listId: LIST_ID,
      propertyKey: "b",
      propertyName: "B",
      propertyType: "text",
      displayOrder: 1,
    };
    vi.mocked(prisma.listProperty.findMany)
      .mockResolvedValueOnce([a, b] as never)
      .mockResolvedValueOnce([b, a] as never);
    vi.mocked(prisma.listProperty.update).mockResolvedValue({} as never);

    const [req, ctx] = makeRequest({
      properties: [
        { id: "prop-b", propertyKey: "b", propertyName: "B", propertyType: "text" },
        { id: "prop-a", propertyKey: "a", propertyName: "A", propertyType: "text" },
      ],
    });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(200);

    // First update is for prop-b at displayOrder 0; second is for prop-a at 1.
    const calls = vi.mocked(prisma.listProperty.update).mock.calls.map(
      (c) =>
        c[0] as {
          where: { id: string };
          data: { displayOrder: number };
        }
    );
    expect(calls[0].where.id).toBe("prop-b");
    expect(calls[0].data.displayOrder).toBe(0);
    expect(calls[1].where.id).toBe("prop-a");
    expect(calls[1].data.displayOrder).toBe(1);
  });
});

// ── delete property ───────────────────────────────────────────────────────────

describe("PUT /api/lists/[id]/schema — delete property", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
    mockListOwnedByUser();
    setupTransactionPassthrough();
  });
  afterEach(() => vi.restoreAllMocks());

  it("deletes the property and strips its key from every row when row data is empty", async () => {
    const a = {
      id: "prop-a",
      listId: LIST_ID,
      propertyKey: "keep",
      propertyName: "Keep",
      propertyType: "text",
      displayOrder: 0,
    };
    const b = {
      id: "prop-b",
      listId: LIST_ID,
      propertyKey: "drop",
      propertyName: "Drop",
      propertyType: "text",
      displayOrder: 1,
    };
    vi.mocked(prisma.listProperty.findMany)
      .mockResolvedValueOnce([a, b] as never) // initial load
      .mockResolvedValueOnce([a] as never); // final fetch

    // Pre-flight scan finds no row data for "drop", so no force needed.
    vi.mocked(prisma.listDataRow.findMany).mockResolvedValueOnce([
      { rowData: { keep: "hello" } },
    ] as never);

    vi.mocked(prisma.listProperty.deleteMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.listProperty.update).mockResolvedValue({} as never);

    // Inside the transaction, the second findMany returns rows with id/rowData
    // for the strip step. (The first findMany already consumed its mock above.)
    vi.mocked(prisma.listDataRow.findMany).mockResolvedValueOnce([
      { id: "row-1", rowData: { keep: "hello" } },
    ] as never);

    const [req, ctx] = makeRequest({
      properties: [
        { id: "prop-a", propertyKey: "keep", propertyName: "Keep", propertyType: "text" },
      ],
    });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(200);

    // The "drop" property was deleted.
    expect(vi.mocked(prisma.listProperty.deleteMany)).toHaveBeenCalledTimes(1);
    const deleteCall = vi.mocked(prisma.listProperty.deleteMany).mock.calls[0][0] as {
      where: { id: { in: string[] } };
    };
    expect(deleteCall.where.id.in).toEqual(["prop-b"]);
  });

  it("returns 409 with propertiesWithData when a deleted property has row data and force is not set", async () => {
    const b = {
      id: "prop-b",
      listId: LIST_ID,
      propertyKey: "drop",
      propertyName: "Drop",
      propertyType: "text",
      displayOrder: 0,
    };
    vi.mocked(prisma.listProperty.findMany).mockResolvedValueOnce([b] as never);
    vi.mocked(prisma.listDataRow.findMany).mockResolvedValueOnce([
      { rowData: { drop: "still here" } },
    ] as never);

    // Empty incoming list — drops everything.
    const [req, ctx] = makeRequest({ properties: [] });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(409);
    const body = await json(res);
    expect(body.propertiesWithData).toContain("drop");
    // No destructive work happened.
    expect(vi.mocked(prisma.listProperty.deleteMany)).not.toHaveBeenCalled();
  });

  it("proceeds with the delete when ?force=true even though row data exists", async () => {
    const b = {
      id: "prop-b",
      listId: LIST_ID,
      propertyKey: "drop",
      propertyName: "Drop",
      propertyType: "text",
      displayOrder: 0,
    };
    vi.mocked(prisma.listProperty.findMany)
      .mockResolvedValueOnce([b] as never)
      .mockResolvedValueOnce([] as never);

    // Inside the transaction, strip-step finds a row with the doomed key.
    vi.mocked(prisma.listDataRow.findMany).mockResolvedValueOnce([
      { id: "row-1", rowData: { drop: "kept-until-force" } },
    ] as never);
    vi.mocked(prisma.listProperty.deleteMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.listDataRow.update).mockResolvedValue({} as never);

    const [req, ctx] = makeRequest({ properties: [] }, { force: "true" });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.listProperty.deleteMany)).toHaveBeenCalledTimes(1);
    // The doomed key was stripped from row-1.
    expect(vi.mocked(prisma.listDataRow.update)).toHaveBeenCalledTimes(1);
    const stripCall = vi.mocked(prisma.listDataRow.update).mock.calls[0][0] as {
      where: { id: string };
      data: { rowData: Record<string, unknown> };
    };
    expect(stripCall.where.id).toBe("row-1");
    expect("drop" in stripCall.data.rowData).toBe(false);
  });
});
