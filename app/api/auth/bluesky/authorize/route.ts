import { NextRequest, NextResponse } from 'next/server';
import { APP_URL } from '@/lib/config/app';
import { getBlueskyConfig } from '@/lib/auth/oauth-bluesky';

export const dynamic = 'force-dynamic';

/**
 * Bluesky OAuth - Initiate authorization flow.
 * Uses client metadata URL from BLUESKY_CLIENT_ID or auto-derived from APP_URL.
 * For local dev, ensure your app is reachable (e.g. via tunnel) so Bluesky can fetch metadata.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const link = searchParams.get('link') === 'true';

  const { clientId } = getBlueskyConfig();

  try {
    const { NodeOAuthClient, OAuthClient } = await import('@atproto/oauth-client-node');
    const { blueskyStateStore, blueskySessionStore } = await import('@/lib/auth/oauth-bluesky-stores');

    const metadata = await OAuthClient.fetchMetadata({
      clientId: clientId as `https://${string}/${string}`,
    });

    const client = new NodeOAuthClient({
      clientMetadata: metadata,
      stateStore: blueskyStateStore,
      sessionStore: blueskySessionStore,
    });

    const state = JSON.stringify({
      link,
      provider: 'bluesky',
      random: crypto.randomUUID(),
    });

    const url = await client.authorize('bsky.app', {
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
