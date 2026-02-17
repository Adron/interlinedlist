import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/users/[userId]
 * Update a user (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.isAdministrator) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId } = params;
    const body = await request.json();

    // Validate user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};

    // Update email if provided (check uniqueness)
    if (body.email !== undefined) {
      if (body.email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: body.email },
        });
        if (emailExists) {
          return NextResponse.json(
            { error: 'Email already in use' },
            { status: 400 }
          );
        }
      }
      updateData.email = body.email;
    }

    // Update username if provided (check uniqueness)
    if (body.username !== undefined) {
      if (body.username !== existingUser.username) {
        const usernameExists = await prisma.user.findUnique({
          where: { username: body.username },
        });
        if (usernameExists) {
          return NextResponse.json(
            { error: 'Username already in use' },
            { status: 400 }
          );
        }
      }
      updateData.username = body.username;
    }

    // Update other fields
    if (body.displayName !== undefined) {
      updateData.displayName = body.displayName || null;
    }
    if (body.avatar !== undefined) {
      updateData.avatar = body.avatar || null;
    }
    if (body.bio !== undefined) {
      updateData.bio = body.bio || null;
    }
    if (body.emailVerified !== undefined) {
      updateData.emailVerified = body.emailVerified;
    }
    if (body.cleared !== undefined) {
      updateData.cleared = body.cleared;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        bio: true,
        emailVerified: true,
        cleared: true,
        createdAt: true,
      },
    });

    // Handle administrator status separately
    if (body.isAdministrator !== undefined) {
      const isCurrentlyAdmin = await prisma.administrator.findUnique({
        where: { userId },
      });

      if (body.isAdministrator && !isCurrentlyAdmin) {
        // Add administrator
        await prisma.administrator.create({
          data: { userId },
        });
      } else if (!body.isAdministrator && isCurrentlyAdmin) {
        // Remove administrator
        await prisma.administrator.delete({
          where: { userId },
        });
      }
    }

    // Check if user is administrator after update
    const adminRecord = await prisma.administrator.findUnique({
      where: { userId },
    });

    return NextResponse.json(
      {
        user: {
          ...updatedUser,
          isAdministrator: !!adminRecord,
          createdAt: updatedUser.createdAt.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update user error:', error);
    
    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];
      return NextResponse.json(
        { error: `${field ? field.charAt(0).toUpperCase() + field.slice(1) : 'Field'} already in use` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[userId]
 * Delete a user (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!currentUser.isAdministrator) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId } = params;

    if (userId === currentUser.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isTargetAdmin = await prisma.administrator.findUnique({
      where: { userId },
    });

    if (isTargetAdmin) {
      const adminCount = await prisma.administrator.count();
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last administrator' },
          { status: 400 }
        );
      }
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ message: 'User deleted' }, { status: 200 });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
