import { NextRequest, NextResponse } from 'next/server';
import { APP_URL } from '@/lib/config/app';

export const dynamic = 'force-dynamic';

/**
 * Bluesky OAuth - Initiate authorization flow.
 * Requires @atproto/oauth-client-node and proper configuration.
 * For now, redirects with message when not fully configured.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const link = searchParams.get('link') === 'true';

  const clientId = process.env.BLUESKY_CLIENT_ID;
  if (!clientId) {
    const redirectUrl = link ? '/settings' : '/login';
    return NextResponse.redirect(
      `${APP_URL}${redirectUrl}?error=${encodeURIComponent(
        'Bluesky OAuth is not configured. Set BLUESKY_CLIENT_ID to your client metadata URL (e.g. https://yourdomain.com/api/oauth/client-metadata).'
      )}`
    );
  }

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
