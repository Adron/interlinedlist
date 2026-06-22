/**
 * Unit tests for GET /api/folders and POST /api/folders
 *
 * Mocks:
 *  - @/lib/prisma                    — prevents real DB calls
 *  - @/lib/auth/sync-token           — controls auth result
 *  - @/lib/subscription/is-subscriber — controls subscription gate
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

// ── module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    listFolder: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/sync-token", () => ({
  getCurrentUserOrSyncToken: vi.fn(),
}));

vi.mock("@/lib/subscription/is-subscriber", () => ({
  isSubscriber: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getCurrentUserOrSyncToken } from "@/lib/auth/sync-token";
import { isSubscriber } from "@/lib/subscription/is-subscriber";
import { GET, POST } from "./route";

// ── helpers ───────────────────────────────────────────────────────────────────

const mockUser = { id: "user-1", customerStatus: "subscriber" };

function makeGetRequest(): NextRequest {
  return new NextRequest("http://localhost/api/folders");
}

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function json(response: Response) {
  return response.json();
}

// ── GET — auth ────────────────────────────────────────────────────────────────

describe("GET /api/folders — auth", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(null as never);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });
});

// ── GET — success ─────────────────────────────────────────────────────────────

describe("GET /api/folders — success", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns 200 with folders array", async () => {
    const folders = [{ id: "f1", name: "Work", parentId: null }];
    vi.mocked(prisma.listFolder.findMany).mockResolvedValue(folders as never);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.folders).toEqual(folders);
  });

  it("returns empty array when no folders exist", async () => {
    vi.mocked(prisma.listFolder.findMany).mockResolvedValue([] as never);

    const res = await GET(makeGetRequest());
    const body = await json(res);
    expect(body.folders).toEqual([]);
  });
});

// ── POST — auth ────────────────────────────────────────────────────────────────

describe("POST /api/folders — auth", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(null as never);
    const res = await POST(makePostRequest({ name: "Inbox" }));
    expect(res.status).toBe(401);
  });
});

// ── POST — subscription gate ───────────────────────────────────────────────────

describe("POST /api/folders — subscription gate", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns 403 when user is not a subscriber", async () => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
    vi.mocked(isSubscriber).mockReturnValue(false);

    const res = await POST(makePostRequest({ name: "Inbox" }));
    expect(res.status).toBe(403);
    const body = await json(res);
    expect(body.error).toMatch(/Subscribe/i);
  });
});

// ── POST — name validation ────────────────────────────────────────────────────

describe("POST /api/folders — name validation", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
    vi.mocked(isSubscriber).mockReturnValue(true);
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns 400 when name is absent", async () => {
    const res = await POST(makePostRequest({ parentId: null }));
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toMatch(/Name is required/i);
  });

  it("returns 400 when name is empty string", async () => {
    const res = await POST(makePostRequest({ name: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is whitespace only", async () => {
    const res = await POST(makePostRequest({ name: "   " }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is not a string", async () => {
    const res = await POST(makePostRequest({ name: 123 }));
    expect(res.status).toBe(400);
  });
});

// ── POST — parentId validation ────────────────────────────────────────────────

describe("POST /api/folders — parentId validation", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
    vi.mocked(isSubscriber).mockReturnValue(true);
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns 400 when parentId is a non-string truthy value", async () => {
    const res = await POST(makePostRequest({ name: "Work", parentId: 42 }));
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toMatch(/Invalid parentId/i);
  });

  it("returns 404 when parentId references a folder that does not exist", async () => {
    vi.mocked(prisma.listFolder.findFirst).mockResolvedValue(null as never);
    const res = await POST(makePostRequest({ name: "Work", parentId: "nonexistent-id" }));
    expect(res.status).toBe(404);
    const body = await json(res);
    expect(body.error).toMatch(/not found/i);
  });

  it("returns 201 when parentId references a valid folder owned by the user", async () => {
    // The route calls findFirst twice when parentId is provided: once to
    // verify the parent, and once to manually check for a sibling-name
    // collision (added to plug the NULL-parentId gap in the DB unique index).
    vi.mocked(prisma.listFolder.findFirst)
      .mockResolvedValueOnce({ id: "p1", name: "Parent", userId: "user-1" } as never)
      .mockResolvedValueOnce(null as never);
    vi.mocked(prisma.listFolder.create).mockResolvedValue({ id: "new-1", name: "Work", parentId: "p1" } as never);

    const res = await POST(makePostRequest({ name: "Work", parentId: "p1" }));
    expect(res.status).toBe(201);
  });
});

// ── POST — success ─────────────────────────────────────────────────────────────

describe("POST /api/folders — success", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
    vi.mocked(isSubscriber).mockReturnValue(true);
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns 201 with created folder when name is valid and no parentId", async () => {
    const created = { id: "f-new", name: "Projects", parentId: null };
    vi.mocked(prisma.listFolder.create).mockResolvedValue(created as never);

    const res = await POST(makePostRequest({ name: "Projects" }));
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.folder).toEqual(created);
    expect(body.message).toMatch(/created/i);
  });

  it("trims the folder name before creating", async () => {
    const created = { id: "f2", name: "Trimmed", parentId: null };
    vi.mocked(prisma.listFolder.create).mockResolvedValue(created as never);

    await POST(makePostRequest({ name: "  Trimmed  " }));

    const callArgs = vi.mocked(prisma.listFolder.create).mock.calls[0][0];
    expect((callArgs as { data: { name: string } }).data.name).toBe("Trimmed");
  });
});

// ── POST — name collision (P2002) ──────────────────────────────────────────────

describe("POST /api/folders — name collision", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue(mockUser as never);
    vi.mocked(isSubscriber).mockReturnValue(true);
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns 409 when Prisma raises a P2002 unique constraint error", async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "5.0.0",
    });
    vi.mocked(prisma.listFolder.create).mockRejectedValue(p2002);

    const res = await POST(makePostRequest({ name: "Existing" }));
    expect(res.status).toBe(409);
    const body = await json(res);
    expect(body.error).toMatch(/already exists/i);
  });

  it("returns 409 when an existing sibling already has the requested name (root level)", async () => {
    // Postgres treats NULL parentIds as distinct, so the [userId, parentId, name]
    // unique constraint cannot detect duplicates at root. The route's manual
    // findFirst() catches the collision before reaching .create().
    vi.mocked(prisma.listFolder.findFirst).mockResolvedValueOnce({
      id: "f-existing",
      name: "Projects",
      userId: "user-1",
      parentId: null,
    } as never);

    const res = await POST(makePostRequest({ name: "Projects" }));
    expect(res.status).toBe(409);
    const body = await json(res);
    expect(body.error).toMatch(/already exists/i);
    // .create must NOT have been called when the manual check trips
    expect(vi.mocked(prisma.listFolder.create)).not.toHaveBeenCalled();
  });

  it("propagates non-P2002 Prisma errors as 500", async () => {
    const p2025 = new Prisma.PrismaClientKnownRequestError("Record not found", {
      code: "P2025",
      clientVersion: "5.0.0",
    });
    vi.mocked(prisma.listFolder.create).mockRejectedValue(p2025);

    const res = await POST(makePostRequest({ name: "Work" }));
    expect(res.status).toBe(500);
  });
});
