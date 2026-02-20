import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserOrSyncToken } from "@/lib/auth/sync-token";
import { put } from "@vercel/blob";
import { resizeAvatarToLimit } from "@/lib/avatar/resize";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ALLOWED_EXTENSIONS = /\.(png|jpg|jpeg|gif|webp|svg)$/i;
const MAX_SVG_BYTES = 500 * 1024; // 500KB for SVG

async function resolveParams(params: Promise<{ id: string }> | { id: string }) {
  return params instanceof Promise ? await params : params;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUserOrSyncToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: "Email verification required to post images." },
        { status: 403 }
      );
    }

    const { id: documentId } = await resolveParams(params);

    const document = await prisma.document.findFirst({
      where: { id: documentId, userId: user.id, deletedAt: null },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const contentType = file.type;
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    const originalName = file.name || "image.png";
    if (!ALLOWED_EXTENSIONS.test(originalName)) {
      return NextResponse.json(
        { error: "File must be png, jpg, jpeg, gif, webp, or svg" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let finalBuffer: Buffer;
    let contentTypeOut: string;
    let ext: string;

    if (contentType.includes("svg")) {
      if (buffer.length > MAX_SVG_BYTES) {
        return NextResponse.json(
          { error: `SVG must be 500KB or smaller (got ${(buffer.length / 1024).toFixed(1)}KB)` },
          { status: 400 }
        );
      }
      finalBuffer = buffer;
      contentTypeOut = contentType;
      ext = "svg";
    } else {
      const { buffer: resizedBuffer, contentType: resizedContent } =
        await resizeAvatarToLimit(buffer, contentType);
      finalBuffer = resizedBuffer;
      contentTypeOut = resizedContent;
      ext = resizedContent.includes("png") ? "png" : "jpg";
    }

    const basename = originalName.replace(ALLOWED_EXTENSIONS, "") || "image";
    const filename = `${basename}.${ext}`;
    const pathname = `documents/${user.id}/${documentId}/${filename}`;

    const blob = await put(pathname, finalBuffer, {
      access: "public",
      contentType: contentTypeOut,
    });

    return NextResponse.json({ url: blob.url }, { status: 200 });
  } catch (error) {
    console.error("Document image upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
