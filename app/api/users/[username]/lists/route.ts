import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicListsByUser } from "@/lib/lists/queries";

export const dynamic = "force-dynamic";

/**
 * GET /api/users/[username]/lists
 * Get public lists for a specific user by username
 * No authentication required (public endpoint)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const page = searchParams.get("page")
      ? parseInt(searchParams.get("page")!, 10)
      : undefined;

    const result = await getPublicListsByUser(user.id, {
      limit,
      offset: page ? undefined : offset,
      page,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Get public lists error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
