/**
 * GitHub OAuth 2.0 helpers
 * Uses authorization code flow with PKCE
 */

import { createHash, randomBytes } from 'crypto';
import { APP_URL } from '@/lib/config/app';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';

export const GITHUB_PROVIDER = 'github';

export function getGitHubConfig() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be set');
  }
  return { clientId, clientSecret };
}

export function generatePKCE() {
  const codeVerifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { codeVerifier, codeChallenge };
}

export function generateState(): string {
  return randomBytes(32).toString('base64url');
}

export function buildGitHubAuthUrl(
  state: string,
  codeChallenge: string,
  link: boolean
): string {
  const { clientId } = getGitHubConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${APP_URL}/api/auth/github/callback`,
    scope: 'user:email read:user',
    state,
    response_type: 'code',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  if (link) {
    params.set('link', 'true');
  }
  return `${GITHUB_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGitHubCode(
  code: string,
  codeVerifier: string
): Promise<{ access_token: string }> {
  const { clientId, clientSecret } = getGitHubConfig();
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${APP_URL}/api/auth/github/callback`,
      code_verifier: codeVerifier,
    }),
  });
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error_description || data.error);
  }
  return data;
}

export interface GitHubUser {
  id: number;
  login: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  html_url: string;
}

export async function fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch(GITHUB_USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch GitHub user');
  }
  const user = await response.json();

  // GitHub may not return email in user endpoint; fetch emails if needed
  let email = user.email;
  if (!email) {
    const emailsRes = await fetch(GITHUB_EMAILS_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    });
    if (emailsRes.ok) {
      const emails = await emailsRes.json();
      const primary = emails.find((e: { primary: boolean }) => e.primary);
      email = primary?.email || emails[0]?.email || null;
    }
  }

  return {
    id: user.id,
    login: user.login,
    email: email || null,
    name: user.name || null,
    avatar_url: user.avatar_url || null,
    html_url: user.html_url || `https://github.com/${user.login}`,
  };
}
