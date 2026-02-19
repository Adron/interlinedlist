import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/lists/[id]/watchers/users
 * Search for users to add as watchers. List owner only.
 * Excludes existing watchers and the list owner.
 */
export async function GET(
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
      where: {
        id: listId,
        userId: user.id,
        deletedAt: null,
      },
      select: { id: true, userId: true },
    });

    if (!list) {
      return NextResponse.json(
        { error: "List not found or access denied" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const search = searchParams.get("search") || "";
    const excludeWatchersParam = searchParams.get("excludeWatchers") || "";

    const excludeUserIds: string[] = [list.userId];
    if (excludeWatchersParam) {
      excludeUserIds.push(...excludeWatchersParam.split(",").filter(Boolean));
    } else {
      const watchers = await prisma.listWatcher.findMany({
        where: { listId },
        select: { userId: true },
      });
      excludeUserIds.push(...watchers.map((w) => w.userId));
    }

    const where: Prisma.UserWhereInput = {
      id: { notIn: excludeUserIds },
      ...(search
        ? {
            OR: [
              { username: { contains: search, mode: "insensitive" } },
              { displayName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          avatar: true,
        },
        orderBy: { username: "asc" },
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      total,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Search users for list watchers error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
