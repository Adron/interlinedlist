import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserOrSyncToken } from "@/lib/auth/sync-token";

export const dynamic = "force-dynamic";

/**
 * GET /api/documents/search
 * Search documents by title or content
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
        { content: { contains: q, mode: "insensitive" as const } },
      ],
    };

    const [documents, total] = await prisma.$transaction([
      prisma.document.findMany({
        where,
        select: { id: true, title: true, folderId: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.document.count({ where }),
    ]);

    return NextResponse.json(
      {
        documents,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + documents.length < total,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Search documents error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
