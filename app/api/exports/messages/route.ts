import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/exports/messages
 * Export user's messages as CSV
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all user's messages
    const messages = await prisma.message.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Convert to CSV
    const headers = ['ID', 'Content', 'Publicly Visible', 'Created At', 'Updated At'];
    const rows = messages.map((message) => [
      message.id,
      `"${message.content.replace(/"/g, '""')}"`, // Escape quotes in CSV
      message.publiclyVisible ? 'Yes' : 'No',
      message.createdAt.toISOString(),
      message.updatedAt.toISOString(),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="messages-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Export messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
