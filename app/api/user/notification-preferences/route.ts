import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUserOrSyncToken } from '@/lib/auth/sync-token';
import {
  buildPreferencesResponse,
  buildEventResponse,
  getEventDef,
  mergePreference,
  type NotificationChannel,
} from '@/lib/notifications/preferences';

export const dynamic = 'force-dynamic';

async function loadPreferences(userId: string): Promise<unknown> {
  const record = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationPreferences: true },
  });
  return record?.notificationPreferences ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserOrSyncToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prefs = await loadPreferences(user.id);
    return NextResponse.json(buildPreferencesResponse(prefs), { status: 200 });
  } catch (error) {
    console.error('Get notification preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUserOrSyncToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { key, channels } = body ?? {};

    if (typeof key !== 'string' || !getEventDef(key)) {
      return NextResponse.json({ error: 'Unknown notification event key' }, { status: 400 });
    }

    const eventDef = getEventDef(key)!;

    if (typeof channels !== 'object' || channels === null || Array.isArray(channels)) {
      return NextResponse.json({ error: 'channels object is required' }, { status: 400 });
    }

    const channelUpdates: Partial<Record<NotificationChannel, boolean>> = {};
    for (const [channel, value] of Object.entries(channels as Record<string, unknown>)) {
      if (!eventDef.channels.includes(channel as NotificationChannel)) {
        return NextResponse.json(
          { error: `Channel '${channel}' is not supported for event '${key}'` },
          { status: 400 }
        );
      }
      if (typeof value !== 'boolean') {
        return NextResponse.json({ error: 'Channel values must be booleans' }, { status: 400 });
      }
      channelUpdates[channel as NotificationChannel] = value;
    }

    if (Object.keys(channelUpdates).length === 0) {
      return NextResponse.json({ error: 'At least one valid channel is required' }, { status: 400 });
    }

    const prefs = await loadPreferences(user.id);
    const merged = mergePreference(prefs, key, channelUpdates);

    await prisma.user.update({
      where: { id: user.id },
      data: { notificationPreferences: merged as Prisma.InputJsonValue },
    });

    return NextResponse.json(buildEventResponse(merged, key), { status: 200 });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
