/**
 * Fire-and-forget analytics tracking. Does not block requests.
 * Events are stored in PostgreSQL via AnalyticsEvent model.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const ANALYTICS_ENABLED = process.env.ANALYTICS_ENABLED !== 'false';

export async function trackPageView(
  path: string,
  options?: { sessionId?: string; userId?: string; referrer?: string }
): Promise<void> {
  if (!ANALYTICS_ENABLED) return;
  try {
    await prisma.analyticsEvent.create({
      data: {
        type: 'page_view',
        name: 'page_view',
        path: path || '/',
        sessionId: options?.sessionId ?? null,
        userId: options?.userId ?? null,
        referrer: options?.referrer ?? null,
      },
    });
  } catch {
    // Fire-and-forget: do not throw
  }
}

export async function trackAction(
  name: string,
  options?: { userId?: string; sessionId?: string; properties?: Record<string, unknown> }
): Promise<void> {
  if (!ANALYTICS_ENABLED) return;
  try {
    await prisma.analyticsEvent.create({
      data: {
        type: 'action',
        name,
        sessionId: options?.sessionId ?? null,
        userId: options?.userId ?? null,
        properties: (options?.properties ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch {
    // Fire-and-forget: do not throw
  }
}
