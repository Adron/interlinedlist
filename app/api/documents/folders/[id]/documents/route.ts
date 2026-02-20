import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getFolderById, computeContentHash } from "@/lib/documents/queries";

export const dynamic = "force-dynamic";

async function resolveParams(params: Promise<{ id: string }> | { id: string }) {
  return params instanceof Promise ? await params : params;
}

/**
 * GET /api/documents/folders/[id]/documents
 * List documents in a folder
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await resolveParams(params);
    const folder = await getFolderById(id, user.id);

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    return NextResponse.json({ documents: folder.documents }, { status: 200 });
  } catch (error) {
    console.error("Get folder documents error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/documents/folders/[id]/documents
 * Create a new document in a folder
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: folderId } = await resolveParams(params);
    const folder = await getFolderById(folderId, user.id);

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
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
        folderId,
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
    console.error("Create document error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
