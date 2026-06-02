import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserOrSyncToken } from "@/lib/auth/sync-token";
import { getListById, validateParentRelationship } from "@/lib/lists/queries";

export const dynamic = "force-dynamic";

/**
 * GET /api/lists/[id]
 * Get a single list by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserOrSyncToken(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const list = await getListById(params.id, user.id);

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    return NextResponse.json({ data: list }, { status: 200 });
  } catch (error) {
    console.error("Get list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/lists/[id]
 * Update a list
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserOrSyncToken(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify list ownership
    const list = await getListById(params.id, user.id);

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, messageId, metadata, parentId, isPublic, folderId } = body;

    // Validate folderId if provided
    if (folderId !== undefined) {
      if (folderId !== null && typeof folderId !== "string") {
        return NextResponse.json({ error: "Invalid folderId" }, { status: 400 });
      }
      if (folderId !== null) {
        const folder = await prisma.listFolder.findFirst({
          where: { id: folderId, userId: user.id, deletedAt: null },
        });
        if (!folder) {
          return NextResponse.json(
            { error: "Folder not found or access denied" },
            { status: 404 }
          );
        }
      }
    }

    // Validate parentId if provided
    if (parentId !== undefined) {
      if (parentId !== null && typeof parentId !== "string") {
        return NextResponse.json({ error: "Invalid parentId" }, { status: 400 });
      }

      if (parentId !== null) {
        // Check if parent exists and belongs to user
        const parent = await prisma.list.findFirst({
          where: {
            id: parentId,
            userId: user.id,
            deletedAt: null,
          },
        });

        if (!parent) {
          return NextResponse.json(
            { error: "Parent list not found or access denied" },
            { status: 404 }
          );
        }

        // Validate no circular reference
        const isValid = await validateParentRelationship(params.id, parentId, user.id);
        if (!isValid) {
          return NextResponse.json(
            { error: "Setting this parent would create a circular reference" },
            { status: 400 }
          );
        }
      }
    }

    const updated = await prisma.list.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(messageId !== undefined && { messageId: messageId || null }),
        ...(metadata !== undefined && { metadata }),
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(isPublic !== undefined && { isPublic: isPublic === true }),
        ...(folderId !== undefined && { folderId: folderId || null }),
      },
      include: {
        properties: {
          orderBy: {
            displayOrder: "asc",
          },
        },
      },
    });

    return NextResponse.json(
      { message: "List updated successfully", data: updated },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/lists/[id]
 * Delete a list (hard delete with cascading)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserOrSyncToken(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify list ownership
    const list = await getListById(params.id, user.id);

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Hard delete - Prisma will cascade delete ListProperty and ListDataRow
    // due to onDelete: Cascade in schema
    await prisma.list.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "List deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Delete list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
