import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isTokenExpired } from '@/lib/auth/tokens';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        emailChangeToken: token,
      },
      select: {
        id: true,
        pendingEmail: true,
        emailChangeExpires: true,
      },
    });

    if (!user || !user.pendingEmail) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    if (isTokenExpired(user.emailChangeExpires)) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          pendingEmail: null,
          emailChangeToken: null,
          emailChangeExpires: null,
        },
      });

      return NextResponse.json(
        { error: 'Verification token has expired. Please request a new verification email.' },
        { status: 400 }
      );
    }

    // Check if pending email was taken by another user since request
    const emailInUse = await prisma.user.findUnique({
      where: { email: user.pendingEmail },
    });

    if (emailInUse && emailInUse.id !== user.id) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          pendingEmail: null,
          emailChangeToken: null,
          emailChangeExpires: null,
        },
      });

      return NextResponse.json(
        { error: 'This email is now associated with another account. Please request a new verification email.' },
        { status: 409 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.pendingEmail,
        pendingEmail: null,
        emailChangeToken: null,
        emailChangeExpires: null,
      },
    });

    return NextResponse.json(
      { message: 'Email updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verify email change error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
