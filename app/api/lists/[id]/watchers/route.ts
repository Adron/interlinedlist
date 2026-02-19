import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/lists/[id]/watchers
 * Get watchers for a list. List owner only.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: listId } = await params;

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

    const watchers = await prisma.listWatcher.findMany({
      where: { listId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      watchers: watchers.map((w) => ({
        id: w.id,
        userId: w.userId,
        role: w.role || "watcher",
        createdAt: w.createdAt.toISOString(),
        user: w.user,
      })),
    });
  } catch (error) {
    console.error("Get list watchers error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lists/[id]/watchers
 * Add watcher(s) to a list.
 * - If body has { userId }: list owner adds that user as watcher (list must be public).
 * - Otherwise: current user adds themselves (list must be public, not own list).
 * Idempotent - returns success if already watching.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: listId } = await params;
  const list = await prisma.list.findFirst({
    where: { id: listId, deletedAt: null },
    select: { id: true, userId: true, isPublic: true },
  });
  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  const VALID_ROLES = ["watcher", "collaborator", "manager"] as const;
  const body = await request.json().catch(() => ({})) as { userId?: string; role?: string };
  const bodyUserId = body?.userId;
  const bodyRole = body?.role;

  const role = bodyRole && VALID_ROLES.includes(bodyRole as any)
    ? (bodyRole as typeof VALID_ROLES[number])
    : "watcher";

  if (bodyUserId) {
    if (list.userId !== user.id) {
      return NextResponse.json(
        { error: "Only the list owner can add other users as watchers" },
        { status: 403 }
      );
    }
    if (!list.isPublic) {
      return NextResponse.json(
        { error: "List must be public to add watchers" },
        { status: 400 }
      );
    }
    if (bodyUserId === user.id) {
      return NextResponse.json(
        { error: "Cannot add yourself as watcher" },
        { status: 400 }
      );
    }
    const targetUser = await prisma.user.findUnique({
      where: { id: bodyUserId },
      select: { id: true },
    });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const existing = await prisma.listWatcher.findUnique({
      where: { userId_listId: { userId: bodyUserId, listId } },
    });
    if (existing) {
      return NextResponse.json({ watching: true }, { status: 200 });
    }
    await prisma.listWatcher.create({
      data: { userId: bodyUserId, listId, role },
    });
    return NextResponse.json({ watching: true }, { status: 201 });
  }

  if (list.userId === user.id) {
    return NextResponse.json(
      { error: "Cannot watch your own list" },
      { status: 400 }
    );
  }
  if (!list.isPublic) {
    return NextResponse.json(
      { error: "List not found or not public" },
      { status: 404 }
    );
  }
  const existingSelf = await prisma.listWatcher.findUnique({
    where: { userId_listId: { userId: user.id, listId } },
  });
  if (existingSelf) {
    return NextResponse.json({ watching: true }, { status: 200 });
  }
  await prisma.listWatcher.create({
    data: { userId: user.id, listId },
  });
  return NextResponse.json({ watching: true }, { status: 201 });
  } catch (error) {
    console.error("Add list watcher error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
