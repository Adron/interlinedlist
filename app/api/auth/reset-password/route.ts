import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import { isTokenExpired } from '@/lib/auth/tokens';
import { validatePassword } from '@/lib/auth/password-policy';
import { rateLimit, getClientIp } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const limit = rateLimit(`reset:${getClientIp(request)}`, 10, 60 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const { token, password } = body;

    // Validation
    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
    }

    // Find user by reset token
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
      },
      select: {
        id: true,
        passwordResetExpires: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (isTokenExpired(user.passwordResetExpires)) {
      // Clear expired token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      });

      return NextResponse.json(
        { error: 'Reset token has expired. Please request a new password reset.' },
        { status: 400 }
      );
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return NextResponse.json(
      { message: 'Password has been reset successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

