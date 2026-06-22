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
      findMany: vi.fn(),
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
      .mockResolvedValueOnce({ id: FOLDER_ID, name: "OldName", parentId: null } as never)
      .mockResolvedValueOnce({ parentId: null } as never); // cycle-walk: new-parent is a root
    vi.mocked(prisma.listFolder.update).mockResolvedValue(updated as never);

    const [req, ctx] = makePutRequest(FOLDER_ID, { parentId: "new-parent" });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(200);
    // Two findFirst calls: folder lookup + one cycle-walk step. No collision
    // check because name was not provided.
    expect(vi.mocked(prisma.listFolder.findFirst)).toHaveBeenCalledTimes(2);
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
    // Default: no child folders. Recursive-cascade tests override this.
    vi.mocked(prisma.listFolder.findMany).mockResolvedValue([] as never);
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

// ── DELETE — recursive cascade ────────────────────────────────────────────────

describe("DELETE /api/folders/[id] — recursive cascade", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it("recursively soft-deletes child folders and moves their lists to root", async () => {
    // Parent (FOLDER_ID) has one child folder ("child-1"), which has no
    // children of its own. Both folders must be soft-deleted; lists at both
    // levels must have folderId cleared.
    vi.mocked(prisma.listFolder.findFirst).mockResolvedValue({
      id: FOLDER_ID, name: "Parent", userId: "user-1",
    } as never);
    vi.mocked(prisma.listFolder.findMany)
      .mockResolvedValueOnce([{ id: "child-1" }] as never) // children of parent
      .mockResolvedValueOnce([] as never); // children of child-1
    vi.mocked(prisma.list.updateMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.listFolder.update).mockResolvedValue({} as never);

    const [req, ctx] = makeDeleteRequest(FOLDER_ID);
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(200);

    // updateMany called once per folder in the tree (parent + child)
    expect(vi.mocked(prisma.list.updateMany)).toHaveBeenCalledTimes(2);
    const folderIdsDetached = vi
      .mocked(prisma.list.updateMany)
      .mock.calls.map((c) => (c[0] as { where: { folderId: string } }).where.folderId);
    expect(folderIdsDetached).toContain("child-1");
    expect(folderIdsDetached).toContain(FOLDER_ID);

    // Both folders soft-deleted
    expect(vi.mocked(prisma.listFolder.update)).toHaveBeenCalledTimes(2);
    const deletedFolderIds = vi
      .mocked(prisma.listFolder.update)
      .mock.calls.map((c) => (c[0] as { where: { id: string } }).where.id);
    expect(deletedFolderIds).toContain("child-1");
    expect(deletedFolderIds).toContain(FOLDER_ID);
  });
});

// ── PUT — 80-char max name ────────────────────────────────────────────────────

describe("PUT /api/folders/[id] — name length validation", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns 400 when name exceeds 80 characters", async () => {
    vi.mocked(prisma.listFolder.findFirst).mockResolvedValueOnce({
      id: FOLDER_ID, name: "OldName", parentId: null,
    } as never);
    const longName = "x".repeat(81);
    const [req, ctx] = makePutRequest(FOLDER_ID, { name: longName });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toMatch(/80 characters/i);
  });

  it("returns 400 when name trims to empty string", async () => {
    vi.mocked(prisma.listFolder.findFirst).mockResolvedValueOnce({
      id: FOLDER_ID, name: "OldName", parentId: null,
    } as never);
    const [req, ctx] = makePutRequest(FOLDER_ID, { name: "   " });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toMatch(/Name is required/i);
  });
});

// ── PUT — cycle protection ────────────────────────────────────────────────────

describe("PUT /api/folders/[id] — cycle protection", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns 400 when reparenting a folder under itself", async () => {
    vi.mocked(prisma.listFolder.findFirst).mockResolvedValueOnce({
      id: FOLDER_ID, name: "Self", parentId: null,
    } as never);
    const [req, ctx] = makePutRequest(FOLDER_ID, { parentId: FOLDER_ID });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toMatch(/own parent/i);
  });

  it("returns 400 when reparenting a folder under one of its descendants", async () => {
    // Tree: FOLDER_ID -> "child-1" -> "grand-1"
    // Trying to set FOLDER_ID.parentId = "grand-1" must be rejected.
    vi.mocked(prisma.listFolder.findFirst)
      .mockResolvedValueOnce({ id: FOLDER_ID, name: "Root", parentId: null } as never) // initial lookup
      .mockResolvedValueOnce({ parentId: "child-1" } as never) // walk: grand-1 -> child-1
      .mockResolvedValueOnce({ parentId: FOLDER_ID } as never); // walk: child-1 -> FOLDER_ID (hit!)

    const [req, ctx] = makePutRequest(FOLDER_ID, { parentId: "grand-1" });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toMatch(/descendant/i);
  });

  it("returns 404 when the proposed parent does not exist", async () => {
    vi.mocked(prisma.listFolder.findFirst)
      .mockResolvedValueOnce({ id: FOLDER_ID, name: "Root", parentId: null } as never)
      .mockResolvedValueOnce(null as never); // walk: proposed parent not found

    const [req, ctx] = makePutRequest(FOLDER_ID, { parentId: "ghost" });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns 200 when reparenting to a valid unrelated folder", async () => {
    // FOLDER_ID moves under "elsewhere" (a root folder). No cycle.
    vi.mocked(prisma.listFolder.findFirst)
      .mockResolvedValueOnce({ id: FOLDER_ID, name: "Mover", parentId: null } as never)
      .mockResolvedValueOnce({ parentId: null } as never); // walk: elsewhere has no parent
    vi.mocked(prisma.listFolder.update).mockResolvedValue({
      id: FOLDER_ID, name: "Mover", parentId: "elsewhere",
    } as never);

    const [req, ctx] = makePutRequest(FOLDER_ID, { parentId: "elsewhere" });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(200);
  });
});
