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
const LINKEDIN_ORG_SCOPES = 'openid profile email w_member_social rw_organization_admin w_organization_social';

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
    // Link mode (initiated from /integrations) requests the org scopes so the
    // user's admin company pages can be discovered as posting targets. Plain
    // sign-in keeps the minimal scopes.
    scope: link ? LINKEDIN_ORG_SCOPES : LINKEDIN_SCOPES,
    state,
  });
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

export function getLinkedInOrgRedirectUri(): string {
  return (
    process.env.LINKEDIN_ORG_REDIRECT_URI ||
    `${APP_URL}/api/auth/linkedin/org-callback`
  );
}

export function buildLinkedInOrgAuthUrl(state: string): string {
  const { clientId } = getLinkedInConfig();
  const redirectUri = getLinkedInOrgRedirectUri();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: LINKEDIN_ORG_SCOPES,
    state,
  });
  return `${LINKEDIN_AUTH_URL}?${params.toString()}`;
}

export interface LinkedInAdminPage {
  id: string;
  name: string;
  logoUrl?: string;
}

export async function fetchLinkedInAdminPages(accessToken: string): Promise<LinkedInAdminPage[]> {
  const url = new URL('https://api.linkedin.com/v2/organizationalEntityAcls');
  url.searchParams.set('q', 'roleAssignee');
  url.searchParams.set('role', 'ADMINISTRATOR');
  url.searchParams.set('projection', '(elements*(organizationalTarget~(id,localizedName)))');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Linkedin-Version': '202510',
      'X-Restli-Protocol-Version': '2.0.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch LinkedIn admin pages: HTTP ${response.status}`);
  }

  const data = await response.json() as {
    elements?: Array<{
      'organizationalTarget~'?: {
        id?: number;
        localizedName?: string;
      };
    }>;
  };

  const pages: LinkedInAdminPage[] = [];
  for (const element of data.elements ?? []) {
    const orgData = element['organizationalTarget~'];
    if (!orgData?.id) continue;
    pages.push({
      id: String(orgData.id),
      name: orgData.localizedName ?? `Organization ${orgData.id}`,
    });
  }
  return pages;
}
