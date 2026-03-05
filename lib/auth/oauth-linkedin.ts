/**
 * LinkedIn OAuth 2.0 helpers
 * Uses authorization code flow (LinkedIn does not require PKCE)
 */

import { randomBytes } from 'crypto';
import { APP_URL } from '@/lib/config/app';

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

export const LINKEDIN_PROVIDER = 'linkedin';

const LINKEDIN_SCOPES = 'openid profile email w_member_social';

export function isLinkedInConfigured(): boolean {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  return Boolean(clientId && clientSecret);
}

export function getLinkedInConfig() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET must be set');
  }
  return { clientId, clientSecret };
}

export function generateState(): string {
  return randomBytes(32).toString('base64url');
}

export function getLinkedInRedirectUri(): string {
  return (
    process.env.LINKEDIN_REDIRECT_URI ||
    `${APP_URL}/api/auth/linkedin/callback`
  );
}

export function buildLinkedInAuthUrl(state: string, link: boolean): string {
  const { clientId } = getLinkedInConfig();
  const redirectUri = getLinkedInRedirectUri();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: LINKEDIN_SCOPES,
    state,
  });
  if (link) {
    params.set('link', 'true');
  }
  return `${LINKEDIN_AUTH_URL}?${params.toString()}`;
}

export interface LinkedInTokenResponse {
  access_token: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

export async function exchangeLinkedInCode(
  code: string,
  redirectUri: string
): Promise<LinkedInTokenResponse> {
  const { clientId, clientSecret } = getLinkedInConfig();
  const response = await fetch(LINKEDIN_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error_description || data.error);
  }
  return data;
}

export interface LinkedInUser {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
}

export async function fetchLinkedInUser(accessToken: string): Promise<LinkedInUser> {
  const response = await fetch(LINKEDIN_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch LinkedIn user');
  }
  return response.json();
}
