import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getFollowStatus } from '@/lib/follows/queries';

export const dynamic = 'force-dynamic';

/**
 * GET /api/follow/[userId]/status
 * Get follow status between current user and target user
 */
export async function GET(
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

    const status = await getFollowStatus(currentUser.id, followingId);

    return NextResponse.json(
      {
        status: status || null,
        isFollowing: status === 'approved',
        isPending: status === 'pending',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get follow status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
