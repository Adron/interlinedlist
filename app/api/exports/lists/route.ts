import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/exports/lists
 * Export user's lists as CSV
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all user's lists
    const lists = await prisma.list.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Convert to CSV
    const headers = ['ID', 'Title', 'Description', 'Is Public', 'Created At', 'Updated At'];
    const rows = lists.map((list) => [
      list.id,
      `"${(list.title || '').replace(/"/g, '""')}"`,
      `"${(list.description || '').replace(/"/g, '""')}"`,
      list.isPublic ? 'Yes' : 'No',
      list.createdAt.toISOString(),
      list.updatedAt.toISOString(),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="lists-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Export lists error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
