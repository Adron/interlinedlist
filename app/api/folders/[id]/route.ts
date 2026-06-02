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

    // Detach lists from this folder before soft-deleting
    await prisma.list.updateMany({
      where: { folderId: id, userId: user.id },
      data: { folderId: null },
    });

    await prisma.listFolder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json(
      { message: "Folder deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete list folder error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
