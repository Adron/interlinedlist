import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const VALID_ROLES = ["watcher", "collaborator", "manager"] as const;

/**
 * PUT /api/lists/[id]/watchers/[userId]
 * Change a user's role. List owner only.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: listId, userId: targetUserId } = await params;

    const list = await prisma.list.findFirst({
      where: {
        id: listId,
        userId: user.id,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!list) {
      return NextResponse.json(
        { error: "List not found or access denied" },
        { status: 404 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as { role?: string };
    const newRole = body?.role;

    if (!newRole || !VALID_ROLES.includes(newRole as (typeof VALID_ROLES)[number])) {
      return NextResponse.json(
        { error: "Invalid role. Must be watcher, collaborator, or manager" },
        { status: 400 }
      );
    }

    const updated = await prisma.listWatcher.updateMany({
      where: {
        listId,
        userId: targetUserId,
      },
      data: { role: newRole },
    });

    if (updated.count === 0) {
      return NextResponse.json(
        { error: "User not found in list access" },
        { status: 404 }
      );
    }

    return NextResponse.json({ role: newRole }, { status: 200 });
  } catch (error) {
    console.error("Update list watcher role error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/lists/[id]/watchers/[userId]
 * Remove a user from list access. List owner only.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: listId, userId: targetUserId } = await params;

    const list = await prisma.list.findFirst({
      where: {
        id: listId,
        userId: user.id,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!list) {
      return NextResponse.json(
        { error: "List not found or access denied" },
        { status: 404 }
      );
    }

    await prisma.listWatcher.deleteMany({
      where: {
        listId,
        userId: targetUserId,
      },
    });

    return NextResponse.json({ removed: true }, { status: 200 });
  } catch (error) {
    console.error("Remove list watcher error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
