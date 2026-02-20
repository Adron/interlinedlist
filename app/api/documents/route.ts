import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { computeContentHash } from "@/lib/documents/queries";

export const dynamic = "force-dynamic";

/**
 * GET /api/documents
 * Get root-level documents (folderId is null) for the current user
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documents = await prisma.document.findMany({
      where: { userId: user.id, folderId: null, deletedAt: null },
      orderBy: { relativePath: "asc" },
    });

    return NextResponse.json({ documents }, { status: 200 });
  } catch (error) {
    console.error("Get root documents error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/documents
 * Create a root-level document (folderId is null)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, relativePath, isPublic } = body;

    const path = relativePath ?? (title ? `${title.replace(/\s+/g, "-").toLowerCase()}.md` : "untitled.md");
    const finalPath = path.endsWith(".md") ? path : `${path}.md`;

    const docContent = content ?? "";
    const contentHash = computeContentHash(docContent);

    const document = await prisma.document.create({
      data: {
        userId: user.id,
        folderId: null,
        title: title?.trim() ?? finalPath.replace(/\.md$/, ""),
        content: docContent,
        relativePath: finalPath,
        isPublic: isPublic === true,
        contentHash,
      },
    });

    return NextResponse.json(
      { message: "Document created successfully", document },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create root document error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
