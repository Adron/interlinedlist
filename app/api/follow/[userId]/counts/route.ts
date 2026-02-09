import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getFollowCounts } from '@/lib/follows/queries';

export const dynamic = 'force-dynamic';

/**
 * GET /api/follow/[userId]/counts
 * Get follower/following counts for a user
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

    const { userId } = params;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const counts = await getFollowCounts(userId);

    return NextResponse.json(counts, { status: 200 });
  } catch (error: any) {
    console.error('Get follow counts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
