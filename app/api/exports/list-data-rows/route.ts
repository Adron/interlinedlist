import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/exports/list-data-rows
 * Export user's list data rows as CSV
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all user's list data rows
    const listDataRows = await prisma.listDataRow.findMany({
      where: {
        list: {
          userId: user.id,
          deletedAt: null,
        },
        deletedAt: null,
      },
      include: {
        list: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Convert to CSV
    // Since rowData is JSON, we'll stringify it
    const headers = ['ID', 'List ID', 'List Title', 'Row Data (JSON)', 'Row Number', 'Created At', 'Updated At'];
    const rows = listDataRows.map((row) => [
      row.id,
      row.listId,
      `"${(row.list.title || '').replace(/"/g, '""')}"`,
      `"${JSON.stringify(row.rowData).replace(/"/g, '""')}"`,
      row.rowNumber?.toString() || '',
      row.createdAt.toISOString(),
      row.updatedAt.toISOString(),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="list-data-rows-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Export list data rows error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
