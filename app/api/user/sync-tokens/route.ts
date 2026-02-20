import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { randomBytes } from "crypto";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * POST /api/user/sync-tokens
 * Create a new sync token (API key) for CLI auth.
 * Requires session. Returns the raw token once - store it securely.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() || "CLI" : "CLI";

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);

    await prisma.syncToken.create({
      data: { userId: user.id, tokenHash, name },
    });

    return NextResponse.json(
      { token: rawToken, name, message: "Store this token securely. It will not be shown again." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create sync token error:", error);
    return NextResponse.json(
      { error: "Failed to create sync token" },
      { status: 500 }
    );
  }
}
