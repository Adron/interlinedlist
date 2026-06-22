/**
 * Unit tests for PATCH /api/documents/[id] folderId behavior.
 *
 * Mocks:
 *  - @/lib/prisma                 — prevents real DB calls
 *  - @/lib/auth/sync-token        — controls auth result
 *  - @/lib/documents/queries      — controls document lookup + hashing
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    folder: { findFirst: vi.fn() },
    document: { update: vi.fn() },
  },
}));

vi.mock("@/lib/auth/sync-token", () => ({
  getCurrentUserOrSyncToken: vi.fn(),
}));

vi.mock("@/lib/documents/queries", () => ({
  getDocumentById: vi.fn(),
  getPublicDocumentById: vi.fn(),
  computeContentHash: vi.fn(() => "hash"),
}));

import { prisma } from "@/lib/prisma";
import { getCurrentUserOrSyncToken } from "@/lib/auth/sync-token";
import { getDocumentById } from "@/lib/documents/queries";
import { PATCH } from "./route";

const userId = "user-1";
const otherUserId = "user-2";
const documentId = "doc-1";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/documents/" + documentId, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

function invoke(body: Record<string, unknown>) {
  return PATCH(makeRequest(body), { params: { id: documentId } });
}

beforeEach(() => {
  vi.mocked(getCurrentUserOrSyncToken).mockResolvedValue({ id: userId } as never);
  vi.mocked(getDocumentById).mockResolvedValue({
    id: documentId,
    userId,
    folderId: null,
    title: "T",
    content: "",
    relativePath: "t.md",
  } as never);
  vi.mocked(prisma.document.update).mockResolvedValue({
    id: documentId,
    userId,
    folderId: null,
  } as never);
});

afterEach(() => vi.restoreAllMocks());

describe("PATCH /api/documents/[id] — folderId", () => {
  it("moves the document to a folder owned by the user", async () => {
    vi.mocked(prisma.folder.findFirst).mockResolvedValue({
      id: "folder-1",
      userId,
      deletedAt: null,
    } as never);

    const res = await invoke({ folderId: "folder-1" });
    expect(res.status).toBe(200);

    expect(prisma.folder.findFirst).toHaveBeenCalledWith({
      where: { id: "folder-1", userId, deletedAt: null },
    });
    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: documentId },
      data: expect.objectContaining({ folderId: "folder-1" }),
    });
  });

  it("moves the document to root when folderId is null", async () => {
    const res = await invoke({ folderId: null });
    expect(res.status).toBe(200);

    expect(prisma.folder.findFirst).not.toHaveBeenCalled();
    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: documentId },
      data: expect.objectContaining({ folderId: null }),
    });
  });

  it("treats empty string folderId as null (move to root)", async () => {
    const res = await invoke({ folderId: "" });
    expect(res.status).toBe(200);

    expect(prisma.folder.findFirst).not.toHaveBeenCalled();
    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: documentId },
      data: expect.objectContaining({ folderId: null }),
    });
  });

  it("returns 403 when folder belongs to another user", async () => {
    vi.mocked(prisma.folder.findFirst).mockResolvedValue(null as never);

    const res = await invoke({ folderId: "folder-of-" + otherUserId });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/Folder not found or access denied/i);

    expect(prisma.document.update).not.toHaveBeenCalled();
  });

  it("does not touch folderId when the field is omitted (additive)", async () => {
    const res = await invoke({ title: "New title" });
    expect(res.status).toBe(200);

    expect(prisma.folder.findFirst).not.toHaveBeenCalled();
    const callArgs = vi.mocked(prisma.document.update).mock.calls[0][0];
    expect("folderId" in (callArgs.data as Record<string, unknown>)).toBe(false);
    expect((callArgs.data as Record<string, unknown>).title).toBe("New title");
  });
});
