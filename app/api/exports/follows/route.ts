import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/exports/follows
 * Export user's follow relationships as CSV
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all user's follow relationships (both as follower and following)
    const follows = await prisma.follow.findMany({
      where: {
        OR: [
          { followerId: user.id },
          { followingId: user.id },
        ],
      },
      include: {
        follower: {
          select: {
            username: true,
            displayName: true,
            email: true,
          },
        },
        following: {
          select: {
            username: true,
            displayName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Convert to CSV
    const headers = [
      'ID',
      'Relationship Type',
      'Follower Username',
      'Follower Display Name',
      'Follower Email',
      'Following Username',
      'Following Display Name',
      'Following Email',
      'Status',
      'Created At',
      'Updated At',
    ];
    const rows = follows.map((follow) => {
      const isFollower = follow.followerId === user.id;
      return [
        follow.id,
        isFollower ? 'You are following' : 'Following you',
        follow.follower.username,
        follow.follower.displayName || '',
        follow.follower.email,
        follow.following.username,
        follow.following.displayName || '',
        follow.following.email,
        follow.status,
        follow.createdAt.toISOString(),
        follow.updatedAt.toISOString(),
      ];
    });

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="follows-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Export follows error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
