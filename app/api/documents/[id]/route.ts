import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getDocumentById, getPublicDocumentById, computeContentHash } from "@/lib/documents/queries";
import { extractBlobUrlsFromMarkdown } from "@/lib/documents/extract-blob-urls";
import { del } from "@vercel/blob";

export const dynamic = "force-dynamic";

async function resolveParams(params: Promise<{ id: string }> | { id: string }) {
  return params instanceof Promise ? await params : params;
}

/**
 * GET /api/documents/[id]
 * Get a document by ID (owner or public)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await resolveParams(params);

    let document = user
      ? await getDocumentById(id, user.id)
      : null;

    if (!document && user) {
      document = await getPublicDocumentById(id);
    } else if (!document) {
      document = await getPublicDocumentById(id);
    }

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ document }, { status: 200 });
  } catch (error) {
    console.error("Get document error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/documents/[id]
 * Update a document
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await resolveParams(params);
    const document = await getDocumentById(id, user.id);

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title, content, isPublic } = body;

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = String(title).trim();
    if (isPublic !== undefined) updates.isPublic = isPublic === true;
    if (content !== undefined) {
      updates.content = content;
      updates.contentHash = computeContentHash(content);
    }

    const updated = await prisma.document.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json(
      { message: "Document updated successfully", document: updated },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update document error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/documents/[id]
 * Soft delete a document and cascade delete blob images
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await resolveParams(params);
    const document = await getDocumentById(id, user.id);

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const blobUrls = extractBlobUrlsFromMarkdown(document.content);
    if (blobUrls.length > 0) {
      await Promise.all(blobUrls.map((url) => del(url).catch(() => {})));
    }

    await prisma.document.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json(
      { message: "Document deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete document error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
