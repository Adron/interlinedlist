import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyResendWebhook, SvixHeaders } from '@/lib/email/webhook-verify';

type ResendEventType = 'email.delivered' | 'email.bounced' | 'email.complained';

interface ResendWebhookPayload {
  type: ResendEventType | string;
  created_at: string;
  data: {
    email_id: string;
    [key: string]: unknown;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error('RESEND_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const payload = await request.text();

  const headers: SvixHeaders = {
    'svix-id': request.headers.get('svix-id'),
    'svix-timestamp': request.headers.get('svix-timestamp'),
    'svix-signature': request.headers.get('svix-signature'),
  };

  const { valid, reason } = verifyResendWebhook(payload, headers, secret);
  if (!valid) {
    console.warn('Resend webhook verification failed:', reason);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let event: ResendWebhookPayload;
  try {
    event = JSON.parse(payload) as ResendWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const emailId = event.data?.email_id;
  if (!emailId) {
    return NextResponse.json({ received: true });
  }

  const log = await prisma.emailLog.findFirst({
    where: { providerId: emailId },
  });

  if (!log) {
    // Not our email or already cleaned up — still return 200 to stop retries
    return NextResponse.json({ received: true });
  }

  const existingMetadata = (log.metadata as Record<string, unknown>) ?? {};
  const existingEvents = (existingMetadata.webhookEvents as unknown[]) ?? [];

  const webhookEvent = {
    type: event.type,
    createdAt: event.created_at,
    data: event.data,
  };

  let newStatus: string | undefined;
  if (event.type === 'email.delivered') {
    newStatus = 'delivered';
  } else if (event.type === 'email.bounced') {
    newStatus = 'bounced';
  } else if (event.type === 'email.complained') {
    newStatus = 'complained';
  }

  const updatedMetadata: Prisma.InputJsonValue = {
    ...existingMetadata,
    webhookEvents: [...existingEvents, webhookEvent] as Prisma.InputJsonValue[],
  };

  await prisma.emailLog.update({
    where: { id: log.id },
    data: {
      ...(newStatus ? { status: newStatus } : {}),
      metadata: updatedMetadata,
    },
  });

  return NextResponse.json({ received: true });
}
