import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAndPublicOwner } from '@/lib/auth/admin-access';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/email-logs
 * Query params:
 *   limit, offset, status, emailType,
 *   search (recipient contains, case-insensitive),
 *   dateRange (today | 7d | 30d | all),
 *   sort (asc | desc)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await checkAdminAndPublicOwner();
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const status = searchParams.get('status') || undefined;
    const emailType = searchParams.get('emailType') || undefined;
    const search = searchParams.get('search') || undefined;
    const dateRange = searchParams.get('dateRange') || 'all';
    const sort = searchParams.get('sort') === 'asc' ? 'asc' : 'desc';

    const where: {
      status?: string;
      emailType?: string;
      recipient?: { contains: string; mode: 'insensitive' };
      createdAt?: { gte: Date };
    } = {};

    if (status) where.status = status;
    if (emailType) where.emailType = emailType;
    if (search) where.recipient = { contains: search, mode: 'insensitive' };

    if (dateRange !== 'all') {
      const now = new Date();
      if (dateRange === 'today') {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        where.createdAt = { gte: start };
      } else if (dateRange === '7d') {
        where.createdAt = { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      } else if (dateRange === '30d') {
        where.createdAt = { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
      }
    }

    const [logs, total, summaryGroups] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: sort },
        take: limit,
        skip: offset,
      }),
      prisma.emailLog.count({ where }),
      prisma.emailLog.groupBy({
        by: ['status'],
        _count: { status: true },
        where,
      }),
    ]);

    const summary: Record<string, number> = {};
    for (const g of summaryGroups) {
      summary[g.status] = g._count.status;
    }

    const logsWithDates = logs.map((log) => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
    }));

    return NextResponse.json({
      logs: logsWithDates,
      total,
      summary,
      pagination: {
        limit,
        offset,
        hasMore: offset + logs.length < total,
      },
    });
  } catch (error) {
    console.error('Email logs fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
