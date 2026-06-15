import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/users/[username]/documents
 * Get public documents for a specific user by username
 * No authentication required (public endpoint)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [documents, folders] = await Promise.all([
      prisma.document.findMany({
        where: { userId: user.id, isPublic: true, deletedAt: null },
        select: {
          id: true,
          title: true,
          folderId: true,
          relativePath: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { title: "asc" },
      }),
      prisma.folder.findMany({
        where: { userId: user.id, deletedAt: null },
        select: { id: true, name: true, parentId: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({ documents, folders }, { status: 200 });
  } catch (error) {
    console.error("Get public documents error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
