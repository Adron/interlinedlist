/**
 * Unit tests for PUT /api/folders/[id] and DELETE /api/folders/[id]
 *
 * Mocks:
 *  - @/lib/prisma          — prevents real DB calls
 *  - @/lib/auth/sync-token — controls auth result
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

// ── module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    listFolder: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    list: {
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/sync-token", () => ({
  getCurrentUserOrSyncToken: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getCurrentUserOrSyncToken } from "@/lib/auth/sync-token";
import { PUT, DELETE } from "./route";

// ── helpers ───────────────────────────────────────────────────────────────────

const mockUser = { id: "user-1", customerStatus: "subscriber" };
const FOLDER_ID = "folder-abc";

function makePutRequest(id: string, body: unknown): [NextRequest, { params: Promise<{ id: string }> }] {
  const req = new NextRequest(`http://localhost/api/folders/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return [req, { params: Promise.resolve({ id }) }];
}

function makeDeleteRequest(id: string): [NextRequest, { params: Promise<{ id: string }> }] {
  const req = new NextRequest(`http://localhost/api/folders/${id}`, {
    method: "DELETE",
  });
  return [req, { params: Promise.resolve({ id }) }];
}

async function json(response: Response) {
  return response.json();
}

// ── PUT — auth ────────────────────────────────────────────────────────────────

describe("PUT /api/folders/[id] — auth", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(null as never);
    const [req, ctx] = makePutRequest(FOLDER_ID, { name: "New" });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(401);
  });
});

// ── PUT — folder ownership ────────────────────────────────────────────────────

describe("PUT /api/folders/[id] — folder not found / wrong user", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns 404 when the folder does not exist for this user", async () => {
    vi.mocked(prisma.listFolder.findFirst).mockResolvedValue(null as never);
    const [req, ctx] = makePutRequest(FOLDER_ID, { name: "New" });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(404);
    const body = await json(res);
    expect(body.error).toMatch(/Folder not found/);
  });
});

// ── PUT — name collision pre-check ────────────────────────────────────────────

describe("PUT /api/folders/[id] — name collision", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns 409 when a sibling folder already has the same name", async () => {
    // First findFirst call: the folder being updated exists
    // Second findFirst call: collision check finds a sibling with the same name
    vi.mocked(prisma.listFolder.findFirst)
      .mockResolvedValueOnce({ id: FOLDER_ID, name: "OldName", parentId: null } as never)
      .mockResolvedValueOnce({ id: "sibling-1", name: "NewName", parentId: null } as never);

    const [req, ctx] = makePutRequest(FOLDER_ID, { name: "NewName" });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(409);
    const body = await json(res);
    expect(body.error).toMatch(/already exists/i);
  });

  it("does NOT return 409 when no sibling has the same name", async () => {
    vi.mocked(prisma.listFolder.findFirst)
      .mockResolvedValueOnce({ id: FOLDER_ID, name: "OldName", parentId: null } as never)
      .mockResolvedValueOnce(null as never); // no collision

    vi.mocked(prisma.listFolder.update).mockResolvedValue({
      id: FOLDER_ID, name: "NewName", parentId: null,
    } as never);

    const [req, ctx] = makePutRequest(FOLDER_ID, { name: "NewName" });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(200);
  });

  it("returns 409 when the DB update itself raises a P2002 error", async () => {
    vi.mocked(prisma.listFolder.findFirst)
      .mockResolvedValueOnce({ id: FOLDER_ID, name: "OldName", parentId: null } as never)
      .mockResolvedValueOnce(null as never); // pre-check passes

    const p2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "5.0.0",
    });
    vi.mocked(prisma.listFolder.update).mockRejectedValue(p2002);

    const [req, ctx] = makePutRequest(FOLDER_ID, { name: "RaceName" });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(409);
  });
});

// ── PUT — success ──────────────────────────────────────────────────────────────

describe("PUT /api/folders/[id] — success", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns 200 with updated folder on valid rename", async () => {
    const updated = { id: FOLDER_ID, name: "Renamed", parentId: null };
    vi.mocked(prisma.listFolder.findFirst)
      .mockResolvedValueOnce({ id: FOLDER_ID, name: "OldName", parentId: null } as never)
      .mockResolvedValueOnce(null as never); // no collision
    vi.mocked(prisma.listFolder.update).mockResolvedValue(updated as never);

    const [req, ctx] = makePutRequest(FOLDER_ID, { name: "Renamed" });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.folder).toEqual(updated);
    expect(body.message).toMatch(/updated/i);
  });

  it("skips the collision check when name is not provided (parentId-only move)", async () => {
    const updated = { id: FOLDER_ID, name: "OldName", parentId: "new-parent" };
    vi.mocked(prisma.listFolder.findFirst)
      .mockResolvedValueOnce({ id: FOLDER_ID, name: "OldName", parentId: null } as never);
    vi.mocked(prisma.listFolder.update).mockResolvedValue(updated as never);

    const [req, ctx] = makePutRequest(FOLDER_ID, { parentId: "new-parent" });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(200);
    // findFirst called exactly once (folder lookup, no collision check)
    expect(vi.mocked(prisma.listFolder.findFirst)).toHaveBeenCalledTimes(1);
  });
});

// ── DELETE — auth ─────────────────────────────────────────────────────────────

describe("DELETE /api/folders/[id] — auth", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(null as never);
    const [req, ctx] = makeDeleteRequest(FOLDER_ID);
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(401);
  });
});

// ── DELETE — folder not found ─────────────────────────────────────────────────

describe("DELETE /api/folders/[id] — folder not found", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns 404 when folder does not exist for this user", async () => {
    vi.mocked(prisma.listFolder.findFirst).mockResolvedValue(null as never);
    const [req, ctx] = makeDeleteRequest(FOLDER_ID);
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(404);
  });
});

// ── DELETE — success ───────────────────────────────────────────────────────────

describe("DELETE /api/folders/[id] — success", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns 200, detaches lists and soft-deletes the folder", async () => {
    vi.mocked(prisma.listFolder.findFirst).mockResolvedValue({
      id: FOLDER_ID, name: "Work", userId: "user-1",
    } as never);
    vi.mocked(prisma.list.updateMany).mockResolvedValue({ count: 3 } as never);
    vi.mocked(prisma.listFolder.update).mockResolvedValue({} as never);

    const [req, ctx] = makeDeleteRequest(FOLDER_ID);
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.message).toMatch(/deleted/i);
  });

  it("calls list.updateMany to detach lists before soft-deleting", async () => {
    vi.mocked(prisma.listFolder.findFirst).mockResolvedValue({
      id: FOLDER_ID, name: "Work", userId: "user-1",
    } as never);
    vi.mocked(prisma.list.updateMany).mockResolvedValue({ count: 2 } as never);
    vi.mocked(prisma.listFolder.update).mockResolvedValue({} as never);

    const [req, ctx] = makeDeleteRequest(FOLDER_ID);
    await DELETE(req, ctx);

    expect(vi.mocked(prisma.list.updateMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ folderId: FOLDER_ID }),
        data: { folderId: null },
      })
    );
  });

  it("soft-deletes via listFolder.update with a deletedAt date", async () => {
    vi.mocked(prisma.listFolder.findFirst).mockResolvedValue({
      id: FOLDER_ID, name: "Work", userId: "user-1",
    } as never);
    vi.mocked(prisma.list.updateMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.listFolder.update).mockResolvedValue({} as never);

    const [req, ctx] = makeDeleteRequest(FOLDER_ID);
    await DELETE(req, ctx);

    const updateCall = vi.mocked(prisma.listFolder.update).mock.calls[0][0] as {
      where: { id: string };
      data: { deletedAt: unknown };
    };
    expect(updateCall.where.id).toBe(FOLDER_ID);
    expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
  });
});
