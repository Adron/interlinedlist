import { NextResponse } from 'next/server';
import { APP_URL } from '@/lib/config/app';
import { getClientMetadataUrl } from '@/lib/auth/oauth-bluesky';

export const dynamic = 'force-dynamic';

/**
 * OAuth client metadata for Bluesky/AT Protocol.
 * Uses 127.0.0.1 instead of localhost (RFC 8252) for loopback redirect_uris.
 */
export async function GET() {
  const clientId = getClientMetadataUrl();

  const metadata = {
    client_id: clientId,
    client_name: 'InterlinedList',
    client_uri: APP_URL,
    application_type: 'web',
    dpop_bound_access_tokens: true,
    grant_types: ['authorization_code', 'refresh_token'],
    redirect_uris: [`${clientId.replace('/api/oauth/client-metadata', '/api/auth/bluesky/callback')}`],
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
