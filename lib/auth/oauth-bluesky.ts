/**
 * Bluesky (AT Protocol) OAuth helpers
 * Uses @atproto/oauth-client-node for the full OAuth flow
 */

import { APP_URL } from '@/lib/config/app';

export const BLUESKY_PROVIDER = 'bluesky';

export function getBlueskyConfig() {
  const clientId = process.env.BLUESKY_CLIENT_ID;
  if (!clientId) {
    throw new Error('BLUESKY_CLIENT_ID must be set (URL to client metadata)');
  }
  return { clientId };
}

export function getClientMetadataUrl(): string {
  return `${APP_URL}/api/oauth/client-metadata`;
}
