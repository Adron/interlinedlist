import { NextRequest, NextResponse } from 'next/server';
import { APP_URL } from '@/lib/config/app';
import { getBlueskyClientMetadata } from '@/lib/auth/oauth-bluesky';

export const dynamic = 'force-dynamic';

/**
 * Bluesky OAuth - Initiate authorization flow.
 * Uses client metadata from BLUESKY_CLIENT_ID or auto-derived from APP_URL.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const link = searchParams.get('link') === 'true';
  const handle = searchParams.get('handle')?.trim();

  try {
    const { NodeOAuthClient } = await import('@atproto/oauth-client-node');
    const { blueskyStateStore, blueskySessionStore } = await import('@/lib/auth/oauth-bluesky-stores');

    const metadata = getBlueskyClientMetadata();

    const client = new NodeOAuthClient({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      clientMetadata: metadata as any,
      stateStore: blueskyStateStore,
      sessionStore: blueskySessionStore,
    });

    const state = JSON.stringify({
      link,
      provider: 'bluesky',
      random: crypto.randomUUID(),
    });

    const input = handle || 'https://bsky.social';
    const url = await client.authorize(input, {
      state,
    });

    return NextResponse.redirect(url.toString());
  } catch (error) {
    console.error('Bluesky authorize error:', error);
    const message = error instanceof Error ? error.message : 'Bluesky authorization failed';
    const redirectUrl = link ? '/settings' : '/login';
    return NextResponse.redirect(
      `${APP_URL}${redirectUrl}?error=${encodeURIComponent(message)}`
    );
  }
}
