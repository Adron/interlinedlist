import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getListById } from "@/lib/lists/queries";

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
    const user = await getCurrentUser();

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
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify list ownership
    const list = await getListById(params.id, user.id);

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, messageId, metadata } = body;

    const updated = await prisma.list.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(messageId !== undefined && { messageId: messageId || null }),
        ...(metadata !== undefined && { metadata }),
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
 * Delete a list (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify list ownership
    const list = await getListById(params.id, user.id);

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    await prisma.list.update({
      where: { id: params.id },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ message: "List deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Delete list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
