import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { followUser, unfollowUser } from '@/lib/follows/queries';

export const dynamic = 'force-dynamic';

/**
 * POST /api/follow/[userId]
 * Follow a user
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId: followingId } = params;

    if (!followingId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Prevent self-follows (also handled in followUser, but check here for better error message)
    if (currentUser.id === followingId) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      );
    }

    try {
      const follow = await followUser(currentUser.id, followingId);

      return NextResponse.json(
        {
          follow: {
            id: follow.id,
            followerId: follow.followerId,
            followingId: follow.followingId,
            status: follow.status,
            createdAt: follow.createdAt.toISOString(),
            updatedAt: follow.updatedAt.toISOString(),
          },
        },
        { status: 201 }
      );
    } catch (error: any) {
      if (error.message === 'Cannot follow yourself') {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      if (error.message === 'User not found') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Follow user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/follow/[userId]
 * Unfollow a user
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId: followingId } = params;

    if (!followingId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const result = await unfollowUser(currentUser.id, followingId);

    // Check if any records were deleted
    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Follow relationship not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Unfollowed successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Unfollow user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
