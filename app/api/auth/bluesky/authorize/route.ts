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
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/39b03427-0fde-45ae-9ce7-7e7f4ee5aa45',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'authorize/route.ts:GET',message:'Bluesky authorize entry',data:{clientId,APP_URL,link},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  try {
    const { NodeOAuthClient, OAuthClient } = await import('@atproto/oauth-client-node');
    const { blueskyStateStore, blueskySessionStore } = await import('@/lib/auth/oauth-bluesky-stores');

    const metadata = await OAuthClient.fetchMetadata({
      clientId: clientId as `https://${string}/${string}`,
    });
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/39b03427-0fde-45ae-9ce7-7e7f4ee5aa45',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'authorize/route.ts:afterFetchMetadata',message:'fetchMetadata succeeded',data:{redirectUris:metadata.redirect_uris},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion

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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/39b03427-0fde-45ae-9ce7-7e7f4ee5aa45',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'authorize/route.ts:afterAuthorize',message:'authorize succeeded',data:{url:url.toString().slice(0,80)},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
    // #endregion

    return NextResponse.redirect(url.toString());
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/39b03427-0fde-45ae-9ce7-7e7f4ee5aa45',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'authorize/route.ts:catch',message:'Bluesky authorize error',data:{error:String(error),name:error instanceof Error?error.name:'',stack:error instanceof Error?error.stack?.slice(0,200):''},timestamp:Date.now(),hypothesisId:'H2,H4'})}).catch(()=>{});
    // #endregion
    console.error('Bluesky authorize error:', error);
    const message = error instanceof Error ? error.message : 'Bluesky authorization failed';
    const redirectUrl = link ? '/settings' : '/login';
    return NextResponse.redirect(
      `${APP_URL}${redirectUrl}?error=${encodeURIComponent(message)}`
    );
  }
}
