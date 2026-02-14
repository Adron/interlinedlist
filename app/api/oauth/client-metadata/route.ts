import { NextResponse } from 'next/server';
import { APP_URL } from '@/lib/config/app';

export const dynamic = 'force-dynamic';

/**
 * OAuth client metadata for Bluesky/AT Protocol.
 * This URL should be set as BLUESKY_CLIENT_ID and must be publicly accessible.
 */
export async function GET() {
  const clientId = `${APP_URL}/api/oauth/client-metadata`;
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/39b03427-0fde-45ae-9ce7-7e7f4ee5aa45',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client-metadata/route.ts:GET',message:'Client metadata requested',data:{clientId,APP_URL},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
  // #endregion

  const metadata = {
    client_id: clientId,
    client_name: 'InterlinedList',
    client_uri: APP_URL,
    application_type: 'web',
    dpop_bound_access_tokens: true,
    grant_types: ['authorization_code', 'refresh_token'],
    redirect_uris: [`${APP_URL}/api/auth/bluesky/callback`],
    response_types: ['code'],
    scope: 'atproto',
    token_endpoint_auth_method: 'none' as const,
    // Using 'none' for simpler setup - no private key required.
    // For production, consider private_key_jwt with jwks
  };

  return NextResponse.json(metadata, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
