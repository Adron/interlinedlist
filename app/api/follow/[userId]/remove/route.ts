import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { removeFollower } from '@/lib/follows/queries';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/follow/[userId]/remove
 * Remove a follower (only callable by the user being followed)
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

    const { userId: followerId } = params;

    if (!followerId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Only the user being followed can remove followers
    const result = await removeFollower(followerId, currentUser.id);

    // Check if any records were deleted
    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Follower relationship not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Follower removed successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Remove follower error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
