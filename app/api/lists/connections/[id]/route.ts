import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get the connection and verify user owns both lists
    const connection = await prisma.listConnection.findUnique({
      where: { id },
      include: {
        fromList: { select: { userId: true } },
        toList: { select: { userId: true } },
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    if (
      connection.fromList.userId !== user.id ||
      connection.toList.userId !== user.id
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this connection' },
        { status: 403 }
      );
    }

    await prisma.listConnection.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting connection:', error);
    return NextResponse.json(
      { error: 'Failed to delete connection' },
      { status: 500 }
    );
  }
}
