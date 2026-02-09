import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { rejectFollowRequest } from '@/lib/follows/queries';

export const dynamic = 'force-dynamic';

/**
 * POST /api/follow/[userId]/reject
 * Reject a pending follow request
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

    // Only the user being followed can reject requests
    const result = await rejectFollowRequest(followerId, currentUser.id);

    // Check if any records were deleted
    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Follow request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Follow request rejected' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Reject follow request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
