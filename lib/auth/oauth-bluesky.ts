/**
 * Bluesky (AT Protocol) OAuth helpers
 * Uses @atproto/oauth-client-node for the full OAuth flow
 */

import { APP_URL } from '@/lib/config/app';

export const BLUESKY_PROVIDER = 'bluesky';

/** URL to the OAuth client metadata JSON. Used as client_id in Bluesky OAuth. */
export function getClientMetadataUrl(): string {
  return `${APP_URL}/api/oauth/client-metadata`;
}

export function getBlueskyConfig() {
  const clientId = process.env.BLUESKY_CLIENT_ID || getClientMetadataUrl();
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/39b03427-0fde-45ae-9ce7-7e7f4ee5aa45',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'oauth-bluesky.ts:getBlueskyConfig',message:'Bluesky config resolved',data:{clientId,fromEnv:!!process.env.BLUESKY_CLIENT_ID},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  return { clientId };
}
