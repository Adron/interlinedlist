/**
 * Mastodon OAuth helpers
 * Supports any instance - app is registered dynamically per instance
 */

import { randomBytes } from 'crypto';
import { APP_URL } from '@/lib/config/app';

export function mastodonProvider(instance: string): string {
  return `mastodon:${instance}`;
}

export async function registerMastodonApp(
  instance: string
): Promise<{ clientId: string; clientSecret: string }> {
  const baseUrl = instance.startsWith('http') ? instance : `https://${instance}`;
  const response = await fetch(`${baseUrl}/api/v1/apps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'InterlinedList',
      redirect_uris: `${APP_URL}/api/auth/mastodon/callback`,
      scopes: 'read write follow',
      website: APP_URL,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Mastodon app registration failed: ${text}`);
  }
  const data = await response.json();
  return {
    clientId: data.client_id,
    clientSecret: data.client_secret,
  };
}

export function buildMastodonAuthUrl(
  instance: string,
  clientId: string,
  state: string
): string {
  const baseUrl = instance.startsWith('http') ? instance : `https://${instance}`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${APP_URL}/api/auth/mastodon/callback`,
    response_type: 'code',
    scope: 'read write follow',
    state,
  });
  return `${baseUrl}/oauth/authorize?${params.toString()}`;
}

export async function exchangeMastodonCode(
  instance: string,
  code: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string }> {
  const baseUrl = instance.startsWith('http') ? instance : `https://${instance}`;
  const response = await fetch(`${baseUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${APP_URL}/api/auth/mastodon/callback`,
      grant_type: 'authorization_code',
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Mastodon token exchange failed: ${text}`);
  }
  const data = await response.json();
  return { access_token: data.access_token };
}

export async function fetchMastodonAccount(
  instance: string,
  accessToken: string
): Promise<{
  id: string;
  username: string;
  display_name: string;
  avatar: string | null;
  url: string;
}> {
  const baseUrl = instance.startsWith('http') ? instance : `https://${instance}`;
  const response = await fetch(`${baseUrl}/api/v1/accounts/verify_credentials`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch Mastodon account');
  }
  const data = await response.json();
  return {
    id: String(data.id),
    username: data.username,
    display_name: data.display_name || data.username,
    avatar: data.avatar || null,
    url: data.url || `${baseUrl}/@${data.username}`,
  };
}

export function generateState(): string {
  return randomBytes(32).toString('base64url');
}
