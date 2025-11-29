import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth/middleware';

// Get user profile
export const GET = withAuth(async (req) => {
  try {
    const user = req.user!;

    const profile = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: profile });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// Update user profile
export const PUT = withAuth(async (req) => {
  try {
    const user = req.user!;
    const body = await req.json();
    const { displayName, avatarUrl, bio } = body;

    // Validate input
    const updateData: {
      displayName?: string;
      avatarUrl?: string;
      bio?: string;
    } = {};

    if (displayName !== undefined) {
      if (displayName.length > 100) {
        return NextResponse.json(
          { error: 'Display name must be less than 100 characters' },
          { status: 400 }
        );
      }
      updateData.displayName = displayName || null;
    }

    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl || null;
    }

    if (bio !== undefined) {
      if (bio && bio.length > 500) {
        return NextResponse.json(
          { error: 'Bio must be less than 500 characters' },
          { status: 400 }
        );
      }
      updateData.bio = bio || null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        emailVerified: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
