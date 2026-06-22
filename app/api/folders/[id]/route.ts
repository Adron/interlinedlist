import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUserOrSyncToken } from "@/lib/auth/sync-token";

export const dynamic = "force-dynamic";

async function resolveParams(params: Promise<{ id: string }> | { id: string }) {
  return params instanceof Promise ? await params : params;
}

/**
 * PUT /api/folders/[id]
 * Rename or move a list folder
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUserOrSyncToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await resolveParams(params);

    const folder = await prisma.listFolder.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, parentId } = body;

    if (name !== undefined && name !== null) {
      const trimmedName = String(name).trim();
      if (trimmedName.length === 0) {
        return NextResponse.json({ error: "Name is required" }, { status: 400 });
      }
      if (trimmedName.length > 80) {
        return NextResponse.json(
          { error: "Name must be 80 characters or fewer" },
          { status: 400 }
        );
      }
    }

    // Cycle protection: reject reparenting under self or any descendant.
    // Walking from the proposed parent upward, we must never hit this folder.
    if (parentId !== undefined && parentId !== null) {
      if (typeof parentId !== "string") {
        return NextResponse.json({ error: "Invalid parentId" }, { status: 400 });
      }
      if (parentId === id) {
        return NextResponse.json(
          { error: "A folder cannot be its own parent" },
          { status: 400 }
        );
      }
      const visited = new Set<string>();
      let cursor: string | null = parentId;
      while (cursor) {
        if (cursor === id) {
          return NextResponse.json(
            { error: "Cannot move a folder under one of its descendants" },
            { status: 400 }
          );
        }
        if (visited.has(cursor)) break;
        visited.add(cursor);
        const next: { parentId: string | null } | null =
          await prisma.listFolder.findFirst({
            where: { id: cursor, userId: user.id, deletedAt: null },
            select: { parentId: true },
          });
        if (!next) {
          return NextResponse.json(
            { error: "Parent folder not found or access denied" },
            { status: 404 }
          );
        }
        cursor = next.parentId;
      }
    }

    // Pre-check for name collision when renaming
    if (name !== undefined && name !== null) {
      const trimmedName = String(name).trim();
      const resolvedParentId =
        parentId !== undefined ? parentId || null : folder.parentId;
      const collision = await prisma.listFolder.findFirst({
        where: {
          userId: user.id,
          parentId: resolvedParentId,
          name: trimmedName,
          deletedAt: null,
          NOT: { id },
        },
      });
      if (collision) {
        return NextResponse.json(
          { error: "A folder with that name already exists here" },
          { status: 409 }
        );
      }
    }

    try {
      const updated = await prisma.listFolder.update({
        where: { id },
        data: {
          ...(name !== undefined && name !== null && { name: String(name).trim() }),
          ...(parentId !== undefined && { parentId: parentId || null }),
        },
        select: { id: true, name: true, parentId: true },
      });

      return NextResponse.json(
        { message: "Folder updated successfully", folder: updated },
        { status: 200 }
      );
    } catch (updateError) {
      if (
        updateError instanceof Prisma.PrismaClientKnownRequestError &&
        updateError.code === "P2002"
      ) {
        return NextResponse.json(
          { error: "A folder with that name already exists here" },
          { status: 409 }
        );
      }
      throw updateError;
    }
  } catch (error) {
    console.error("Update list folder error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/folders/[id]
 * Soft-delete a list folder; detach its lists first
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUserOrSyncToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await resolveParams(params);

    const folder = await prisma.listFolder.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const now = new Date();
    const userId = user.id;

    // Recursively soft-delete child folders and move every descendant list to
    // the root (folderId = null). Lists are never soft-deleted by this cascade,
    // matching the spec: "child lists move to root".
    async function softDeleteFolder(folderId: string) {
      const children = await prisma.listFolder.findMany({
        where: { parentId: folderId, userId, deletedAt: null },
        select: { id: true },
      });
      for (const child of children) {
        await softDeleteFolder(child.id);
      }
      await prisma.list.updateMany({
        where: { folderId, userId },
        data: { folderId: null },
      });
      await prisma.listFolder.update({
        where: { id: folderId },
        data: { deletedAt: now },
      });
    }

    await softDeleteFolder(id);

    return NextResponse.json(
      { message: "Folder deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete list folder error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
