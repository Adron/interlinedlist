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

    const documents = await prisma.document.findMany({
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
    });

    const foldersById = new Map<
      string,
      { id: string; name: string; parentId: string | null }
    >();
    let folderIdsToFetch = Array.from(
      new Set(
        documents
          .map((document) => document.folderId)
          .filter((folderId): folderId is string => !!folderId)
      )
    );

    while (folderIdsToFetch.length > 0) {
      const fetchedFolders = await prisma.folder.findMany({
        where: {
          userId: user.id,
          deletedAt: null,
          id: { in: folderIdsToFetch },
        },
        select: { id: true, name: true, parentId: true },
      });

      for (const folder of fetchedFolders) {
        foldersById.set(folder.id, folder);
      }

      folderIdsToFetch = Array.from(
        new Set(
          fetchedFolders
            .map((folder) => folder.parentId)
            .filter(
              (parentId): parentId is string =>
                !!parentId && !foldersById.has(parentId)
            )
        )
      );
    }

    const folders = Array.from(foldersById.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return NextResponse.json({ documents, folders }, { status: 200 });
  } catch (error) {
    console.error("Get public documents error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
