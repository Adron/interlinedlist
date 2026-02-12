/**
 * OAuth state cookie - stores state, PKCE verifier, and link flag
 * across the redirect flow
 */

import { cookies } from 'next/headers';

const OAUTH_STATE_COOKIE = 'oauth_state';
const OAUTH_STATE_MAX_AGE = 60 * 10; // 10 minutes

export interface OAuthState {
  state: string;
  codeVerifier: string;
  link: boolean;
  provider: string;
  instance?: string; // For Mastodon
}

export async function setOAuthStateCookie(value: OAuthState): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(OAUTH_STATE_COOKIE, JSON.stringify(value), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: OAUTH_STATE_MAX_AGE,
    path: '/',
  });
}

export async function getOAuthStateCookie(): Promise<OAuthState | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OAuthState;
  } catch {
    return null;
  }
}

export async function deleteOAuthStateCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(OAUTH_STATE_COOKIE);
}
