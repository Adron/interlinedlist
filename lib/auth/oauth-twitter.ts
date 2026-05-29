/**
 * Twitter/X OAuth 2.0 + PKCE helpers
 */

import { randomBytes } from 'crypto';
import { APP_URL } from '@/lib/config/app';

const TWITTER_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';
const TWITTER_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
const TWITTER_USER_URL = 'https://api.twitter.com/2/users/me?user.fields=profile_image_url,username,name';

export const TWITTER_PROVIDER = 'twitter';

const TWITTER_SCOPES = 'tweet.read tweet.write users.read offline.access';

export function isTwitterConfigured(): boolean {
  return Boolean(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET);
}

export function getTwitterConfig() {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET must be set');
  }
  return { clientId, clientSecret };
}

export function generateState(): string {
  return randomBytes(32).toString('base64url');
}

export function getTwitterRedirectUri(): string {
  return process.env.TWITTER_REDIRECT_URI || `${APP_URL}/api/auth/twitter/callback`;
}

export function buildTwitterAuthUrl(state: string, codeChallenge: string, link: boolean): string {
  const { clientId } = getTwitterConfig();
  const redirectUri = getTwitterRedirectUri();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: TWITTER_SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  if (link) {
    params.set('link', 'true');
  }
  return `${TWITTER_AUTH_URL}?${params.toString()}`;
}

export interface TwitterTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

export async function exchangeTwitterCode(
  code: string,
  codeVerifier: string
): Promise<TwitterTokenResponse> {
  const { clientId, clientSecret } = getTwitterConfig();
  const redirectUri = getTwitterRedirectUri();
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(TWITTER_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Twitter token exchange failed: ${text}`);
  }

  return response.json();
}

export interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

export async function fetchTwitterUser(accessToken: string): Promise<TwitterUser> {
  const response = await fetch(TWITTER_USER_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch Twitter user info');
  }
  const data = await response.json();
  return data.data as TwitterUser;
}
