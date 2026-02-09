import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getFollowing } from '@/lib/follows/queries';
import { FollowStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/follow/[userId]/following
 * Get list of users a user is following
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const status = searchParams.get('status') as FollowStatus | null;

    // Validate limit
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Validate offset
    if (offset < 0) {
      return NextResponse.json(
        { error: 'Offset must be non-negative' },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (status && status !== 'pending' && status !== 'approved') {
      return NextResponse.json(
        { error: 'Status must be "pending" or "approved"' },
        { status: 400 }
      );
    }

    const result = await getFollowing(userId, {
      limit,
      offset,
      status: status || undefined,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Get following error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
