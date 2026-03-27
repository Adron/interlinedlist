import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAndPublicOwner } from '@/lib/auth/admin-access';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';

export const dynamic = 'force-dynamic';

const MIN_LENGTH = 8;

/**
 * POST /api/admin/users/[userId]/password
 * Set a user's password (admin + Public owner only). Invalidates all sessions for that user.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> | { userId: string } }
) {
  try {
    const admin = await checkAdminAndPublicOwner();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const resolved = params instanceof Promise ? await params : params;
    const { userId } = resolved;

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const password = body?.password;

    if (typeof password !== 'string' || password.length < MIN_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_LENGTH} characters` },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash },
      });
      await tx.session.deleteMany({ where: { userId } });
    });

    return NextResponse.json({ message: 'Password updated' }, { status: 200 });
  } catch (error) {
    console.error('Admin set password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
