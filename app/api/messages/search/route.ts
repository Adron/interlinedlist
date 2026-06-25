import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserOrSyncToken } from "@/lib/auth/sync-token";
import { buildMessageWhereClause, getPushedMessageInclude } from "@/lib/messages/queries";
import { attachDugByMeIncludingPushed } from "@/lib/messages/dig";

export const dynamic = "force-dynamic";

/**
 * GET /api/messages/search
 * Search top-level messages by content (respecting feed visibility)
 * Query params: q (required), limit (default 20, max 100), offset (default 0), onlyMine (default false)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserOrSyncToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawQ = searchParams.get("q");
    const q = rawQ?.trim() ?? "";

    if (q.length === 0) {
      return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
    }
    if (q.length > 200) {
      return NextResponse.json({ error: "Query parameter 'q' must be 200 characters or fewer" }, { status: 400 });
    }

    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");
    const rawLimit = parseInt(limitParam ?? "20", 10);
    const rawOffset = parseInt(offsetParam ?? "0", 10);

    if (limitParam !== null && !isNaN(rawLimit) && rawLimit > 100) {
      return NextResponse.json({ error: "Query parameter 'limit' must be 100 or fewer" }, { status: 400 });
    }

    const limit = isNaN(rawLimit) || rawLimit < 1 ? 20 : rawLimit;
    const offset = isNaN(rawOffset) || rawOffset < 0 ? 0 : rawOffset;

    const onlyMine = searchParams.get("onlyMine") === "true";

    // Build visibility clause mirroring the main messages feed
    let visibility;
    if (onlyMine) {
      visibility = { userId: user.id };
    } else {
      const userWithPreference = await prisma.user.findUnique({
        where: { id: user.id },
        select: { viewingPreference: true },
      });
      const viewingPreference = userWithPreference?.viewingPreference || "all_messages";
      visibility = await buildMessageWhereClause(user.id, viewingPreference);
    }

    const where = {
      AND: [
        visibility,
        { parentId: null },
        { content: { contains: q, mode: "insensitive" as const } },
      ],
    };

    const messages = await prisma.message.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        ...getPushedMessageInclude(),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.message.count({ where });

    const messagesWithDugs = await attachDugByMeIncludingPushed(messages, user.id);

    return NextResponse.json(
      {
        messages: messagesWithDugs,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + messages.length < total,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Search messages error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
