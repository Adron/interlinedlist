import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { canViewerDigMessage, digMessage, undigMessage } from '@/lib/messages/dig';
import { notifyMessageDig } from '@/lib/notifications/message-engagement';

export const dynamic = 'force-dynamic';

/**
 * POST /api/messages/[id]/dig — add a dig (idempotent if already dug)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = params instanceof Promise ? await params : params;
    const messageId = resolvedParams.id;
    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    const allowed = await canViewerDigMessage(currentUser.id, messageId);
    if (!allowed) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const result = await digMessage(currentUser.id, messageId);
    if (result.isNewDig && result.digCreatedAt) {
      notifyMessageDig({
        sourceMessageId: messageId,
        diggerId: currentUser.id,
        digCreatedAt: result.digCreatedAt,
      }).catch((err) => console.error('notifyMessageDig:', err));
    }
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Dig message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/messages/[id]/dig — remove a dig
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = params instanceof Promise ? await params : params;
    const messageId = resolvedParams.id;
    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    const allowed = await canViewerDigMessage(currentUser.id, messageId);
    if (!allowed) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const result = await undigMessage(currentUser.id, messageId);
    if (!result) {
      return NextResponse.json({ error: 'Dig not found' }, { status: 404 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Undig message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
