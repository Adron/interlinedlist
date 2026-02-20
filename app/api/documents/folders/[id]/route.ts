import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getFolderById, validateFolderParent } from "@/lib/documents/queries";

export const dynamic = "force-dynamic";

async function resolveParams(params: Promise<{ id: string }> | { id: string }) {
  return params instanceof Promise ? await params : params;
}

/**
 * GET /api/documents/folders/[id]
 * Get a folder by ID with children and documents
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await resolveParams(params);
    const folder = await getFolderById(id, user.id);

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    return NextResponse.json({ folder }, { status: 200 });
  } catch (error) {
    console.error("Get folder error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/documents/folders/[id]
 * Update a folder (rename, move)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await resolveParams(params);
    const folder = await getFolderById(id, user.id);

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, parentId } = body;

    if (parentId !== undefined) {
      if (parentId !== null && typeof parentId !== "string") {
        return NextResponse.json({ error: "Invalid parentId" }, { status: 400 });
      }
      const isValid = await validateFolderParent(id, parentId, user.id);
      if (!isValid) {
        return NextResponse.json(
          { error: "Setting this parent would create a circular reference" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.folder.update({
      where: { id },
      data: {
        ...(name !== undefined && name !== null && { name: String(name).trim() }),
        ...(parentId !== undefined && { parentId: parentId || null }),
      },
      include: {
        children: { where: { deletedAt: null }, orderBy: { name: "asc" } },
        documents: { where: { deletedAt: null } },
      },
    });

    return NextResponse.json(
      { message: "Folder updated successfully", folder: updated },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update folder error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/documents/folders/[id]
 * Soft delete a folder (cascade to children and documents)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await resolveParams(params);
    const folder = await getFolderById(id, user.id);

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const now = new Date();

    async function softDeleteFolder(folderId: string) {
      const children = await prisma.folder.findMany({
        where: { parentId: folderId, deletedAt: null },
      });
      for (const child of children) {
        await softDeleteFolder(child.id);
      }
      await prisma.document.updateMany({
        where: { folderId: folderId },
        data: { deletedAt: now },
      });
      await prisma.folder.update({
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
    console.error("Delete folder error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
