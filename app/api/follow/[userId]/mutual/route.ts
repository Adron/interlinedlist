import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getMutualConnections } from '@/lib/follows/queries';

export const dynamic = 'force-dynamic';

/**
 * GET /api/follow/[userId]/mutual
 * Get mutual connections between current user and specified user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const otherUserId = searchParams.get('otherUserId') || user.id;

    // Get mutual connections between current user and the specified user
    const mutual = await getMutualConnections(user.id, params.userId);

    return NextResponse.json(mutual, { status: 200 });
  } catch (error: any) {
    console.error('Get mutual connections error:', error);
    if (error?.code === 'P2021' || error?.message?.includes('does not exist') || error?.message?.includes('follow')) {
      return NextResponse.json({ mutualFollowers: 0, mutualFollowing: 0 }, { status: 200 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
