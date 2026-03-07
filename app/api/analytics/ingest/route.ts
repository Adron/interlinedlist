import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth/session';
import { trackPageView, trackAction } from '@/lib/analytics/track';
import {
  ANALYTICS_SESSION_COOKIE,
  ANALYTICS_SESSION_MAX_AGE_DAYS,
  getAnalyticsSessionCookieOptions,
} from '@/lib/analytics/session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { type, name, path, referrer, properties } = body as {
      type?: string;
      name?: string;
      path?: string;
      referrer?: string;
      properties?: Record<string, unknown>;
    };

    const cookieStore = await cookies();
    let sessionId = request.cookies.get(ANALYTICS_SESSION_COOKIE)?.value;
    if (!sessionId) {
      const opts = getAnalyticsSessionCookieOptions();
      sessionId = opts.value;
      cookieStore.set(ANALYTICS_SESSION_COOKIE, opts.value, {
        maxAge: ANALYTICS_SESSION_MAX_AGE_DAYS * 24 * 60 * 60,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    const user = await getCurrentUser();
    const userId = user?.id ?? undefined;

    if (type === 'page_view') {
      await trackPageView(path || '/', {
        sessionId,
        userId,
        referrer: referrer || undefined,
      });
    } else if (type === 'action' && name) {
      await trackAction(name, {
        sessionId,
        userId,
        properties,
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
