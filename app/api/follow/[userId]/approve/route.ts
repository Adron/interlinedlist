import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { approveFollowRequest } from '@/lib/follows/queries';

export const dynamic = 'force-dynamic';

/**
 * POST /api/follow/[userId]/approve
 * Approve a pending follow request
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

    const { userId: followerId } = params;

    if (!followerId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Only the user being followed can approve requests
    try {
      const follow = await approveFollowRequest(followerId, currentUser.id);

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
        { status: 200 }
      );
    } catch (error: any) {
      if (error.message === 'Follow request not found') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      if (error.message === 'Follow request is not pending') {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Approve follow request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
