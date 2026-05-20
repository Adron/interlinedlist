import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserOrSyncToken } from '@/lib/auth/sync-token';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserOrSyncToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fromListId, toListId, label } = body;

    if (!fromListId || !toListId) {
      return NextResponse.json(
        { error: 'fromListId and toListId are required' },
        { status: 400 }
      );
    }

    if (fromListId === toListId) {
      return NextResponse.json(
        { error: 'Cannot connect a list to itself' },
        { status: 400 }
      );
    }

    // Verify user owns both lists
    const [fromList, toList] = await Promise.all([
      prisma.list.findUnique({
        where: { id: fromListId },
        select: { userId: true },
      }),
      prisma.list.findUnique({
        where: { id: toListId },
        select: { userId: true },
      }),
    ]);

    if (!fromList || fromList.userId !== user.id || !toList || toList.userId !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to create this connection' },
        { status: 403 }
      );
    }

    const connection = await prisma.listConnection.create({
      data: {
        fromListId,
        toListId,
        ...(label && { label }),
      },
    });

    return NextResponse.json(connection, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Connection already exists' },
        { status: 409 }
      );
    }
    console.error('Error creating connection:', error);
    return NextResponse.json(
      { error: 'Failed to create connection' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserOrSyncToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all lists for the user
    const userLists = await prisma.list.findMany({
      where: { userId: user.id },
      select: { id: true },
    });

    const listIds = userLists.map((l) => l.id);

    if (listIds.length === 0) {
      return NextResponse.json({ connections: [] });
    }

    // Get all connections between user's lists
    const connections = await prisma.listConnection.findMany({
      where: {
        OR: [
          { fromListId: { in: listIds } },
          { toListId: { in: listIds } },
        ],
      },
    });

    return NextResponse.json({ connections });
  } catch (error) {
    console.error('Error fetching connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}
