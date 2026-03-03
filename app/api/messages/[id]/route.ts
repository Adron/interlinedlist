import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { deleteBlobsFromMessages } from '@/lib/blob';
import { LinkMetadata } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser();
    
    // Handle both sync and async params (Next.js 14+)
    const resolvedParams = params instanceof Promise ? await params : params;
    const messageId = resolvedParams.id;

    // Build where clause based on authentication
    let where: any = { id: messageId };

    if (user) {
      // Authenticated users see: their own messages (public or private) + all public messages
      where = {
        id: messageId,
        OR: [
          { userId: user.id }, // User's own messages
          { publiclyVisible: true }, // All public messages
        ],
      };
    } else {
      // Unauthenticated users see only public messages
      where = {
        id: messageId,
        publiclyVisible: true,
      };
    }

    // Fetch message with user data
    const message = await prisma.message.findFirst({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Serialize dates and linkMetadata
    const serializedMessage = {
      ...message,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
      linkMetadata: message.linkMetadata as LinkMetadata | null,
    };

    return NextResponse.json(serializedMessage, { status: 200 });
  } catch (error) {
    console.error('Get message error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Handle both sync and async params (Next.js 14+)
    const resolvedParams = params instanceof Promise ? await params : params;
    const messageId = resolvedParams.id;

    console.log('Delete request for message ID:', messageId);

    // Find the message and verify ownership
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { userId: true },
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    if (message.userId !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own messages' },
        { status: 403 }
      );
    }

    // Fetch message and all descendants (replies at any depth) for blob cleanup
    const allMessages: Array<{ imageUrls: unknown; videoUrls: unknown }> = [];
    let idsToProcess = [messageId];
    while (idsToProcess.length > 0) {
      const batch = await prisma.message.findMany({
        where: { id: { in: idsToProcess } },
        select: { id: true, imageUrls: true, videoUrls: true },
      });
      allMessages.push(...batch);
      const childIds = await prisma.message.findMany({
        where: { parentId: { in: idsToProcess } },
        select: { id: true },
      });
      idsToProcess = childIds.map((c) => c.id);
    }

    // Delete blob assets for message and all descendants
    await deleteBlobsFromMessages(allMessages);

    // Delete the message (cascade will delete descendants)
    await prisma.message.delete({
      where: { id: messageId },
    });

    return NextResponse.json(
      { message: 'Message deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete message error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

