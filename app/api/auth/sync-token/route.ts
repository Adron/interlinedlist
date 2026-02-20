import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";

export const dynamic = "force-dynamic";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * POST /api/auth/sync-token
 * Authenticate with email and password; returns a sync token (API key) for CLI use.
 * The CLI stores this token and uses it for subsequent sync requests.
 * No session cookie is set.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).trim() },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);

    await prisma.syncToken.create({
      data: { userId: user.id, tokenHash, name: "CLI" },
    });

    return NextResponse.json(
      { token: rawToken, message: "Sync token created. Store it in your CLI config." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Sync token auth error:", error);
    return NextResponse.json(
      { error: "Failed to create sync token" },
      { status: 500 }
    );
  }
}
