import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getFollowRequests } from '@/lib/follows/queries';

export const dynamic = 'force-dynamic';

/**
 * GET /api/follow/requests
 * Get pending follow requests for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const requests = await getFollowRequests(currentUser.id);

    return NextResponse.json(
      {
        requests: requests.map((r: { createdAt: Date | string; [key: string]: any }) => ({
          ...r,
          createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
        })),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get follow requests error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
