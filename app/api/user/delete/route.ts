import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { deleteSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/user/delete
 * Delete the current user's account. Requires username and email verification.
 * Cascades delete all user data (messages, lists, memberships, etc.).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { username, email } = body;

    if (!username || typeof username !== 'string' || !email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Username and email are required' },
        { status: 400 }
      );
    }

    // Verify username matches (case-sensitive to match typical uniqueness)
    if (username !== user.username) {
      return NextResponse.json(
        { error: 'Username and email do not match your account. Please try again.' },
        { status: 400 }
      );
    }

    // Verify email matches (case-insensitive)
    if (email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Username and email do not match your account. Please try again.' },
        { status: 400 }
      );
    }

    // Block if user is the last administrator
    const isAdmin = await prisma.administrator.findUnique({
      where: { userId: user.id },
    });

    if (isAdmin) {
      const adminCount = await prisma.administrator.count();
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete your account. You are the only administrator.' },
          { status: 400 }
        );
      }
    }

    // Delete user (cascades to messages, lists, memberships, follows, linked identities, etc.)
    await prisma.user.delete({
      where: { id: user.id },
    });

    // Clear session to log the user out
    await deleteSession();

    return NextResponse.json({ message: 'Account deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
