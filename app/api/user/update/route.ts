import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { displayName, bio, avatar, theme, maxMessageLength } = body;

    // Validate maxMessageLength if provided
    if (maxMessageLength !== undefined) {
      const maxLength = parseInt(maxMessageLength, 10);
      if (isNaN(maxLength) || maxLength < 1 || maxLength > 10000) {
        return NextResponse.json(
          { error: 'maxMessageLength must be a positive integer between 1 and 10000' },
          { status: 400 }
        );
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(bio !== undefined && { bio }),
        ...(avatar !== undefined && { avatar }),
        ...(theme !== undefined && { theme }),
        ...(maxMessageLength !== undefined && { maxMessageLength: parseInt(maxMessageLength, 10) }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        bio: true,
        theme: true,
        emailVerified: true,
        maxMessageLength: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { message: 'User updated successfully', user: updatedUser },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

