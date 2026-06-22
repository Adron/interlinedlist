import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserOrSyncToken } from "@/lib/auth/sync-token";

export const dynamic = "force-dynamic";

/**
 * GET /api/lists/search
 * Search lists by title or description
 * Query params: q (required), limit (default 20, max 100), offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserOrSyncToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || q.trim().length === 0) {
      return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
    }

    const rawLimit = parseInt(searchParams.get("limit") ?? "20", 10);
    const rawOffset = parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = Math.min(isNaN(rawLimit) || rawLimit < 1 ? 20 : rawLimit, 100);
    const offset = isNaN(rawOffset) || rawOffset < 0 ? 0 : rawOffset;

    const where = {
      userId: user.id,
      deletedAt: null,
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { description: { contains: q, mode: "insensitive" as const } },
      ],
    };

    const [rawLists, total] = await prisma.$transaction([
      prisma.list.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          isPublic: true,
          folderId: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { dataRows: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.list.count({ where }),
    ]);

    const lists = rawLists.map(({ _count, ...rest }) => ({
      ...rest,
      itemCount: _count.dataRows,
    }));

    return NextResponse.json(
      {
        lists,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + lists.length < total,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Search lists error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
