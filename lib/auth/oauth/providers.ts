/**
 * OAuth Provider Configuration
 * This file contains configuration and types for OAuth providers
 */

export type OAuthProvider = 'google' | 'github' | 'mastodon' | 'bluesky';

export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
  // Provider-specific additional config
  [key: string]: unknown;
}

export interface OAuthUserInfo {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  username?: string;
}

/**
 * Get OAuth provider configuration from environment variables
 */
export function getOAuthConfig(
  provider: OAuthProvider
): OAuthProviderConfig | null {
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/auth/oauth/${provider}/callback`;

  switch (provider) {
    case 'google':
      return {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirectUri,
        scopes: ['openid', 'profile', 'email'],
      };

    case 'github':
      return {
        clientId: process.env.GITHUB_CLIENT_ID || '',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
        redirectUri,
        scopes: ['user:email'],
      };

    case 'mastodon':
      return {
        clientId: process.env.MASTODON_CLIENT_ID || '',
        clientSecret: process.env.MASTODON_CLIENT_SECRET || '',
        redirectUri,
        instanceUrl: process.env.MASTODON_INSTANCE_URL || '',
        scopes: ['read', 'write'],
      };

    case 'bluesky':
      return {
        clientId: process.env.BLUESKY_CLIENT_ID || '',
        clientSecret: process.env.BLUESKY_CLIENT_SECRET || '',
        redirectUri,
        scopes: [],
      };

    default:
      return null;
  }
}

/**
 * Get OAuth authorization URL
 */
export function getOAuthAuthorizationUrl(
  provider: OAuthProvider
): string | null {
  const config = getOAuthConfig(provider);
  if (!config || !config.clientId) {
    return null;
  }

  switch (provider) {
    case 'google':
      const googleParams = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: (config.scopes || []).join(' '),
        access_type: 'offline',
        prompt: 'consent',
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${googleParams.toString()}`;

    case 'github':
      const githubParams = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        scope: (config.scopes || []).join(' '),
      });
      return `https://github.com/login/oauth/authorize?${githubParams.toString()}`;

    case 'mastodon':
      // Mastodon requires instance-specific URL
      const instanceUrl = (config as { instanceUrl?: string }).instanceUrl;
      if (!instanceUrl) return null;
      const mastodonParams = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: (config.scopes || []).join(' '),
      });
      return `${instanceUrl}/oauth/authorize?${mastodonParams.toString()}`;

    case 'bluesky':
      // Blue Sky uses AT Protocol - implementation will be added later
      return null;

    default:
      return null;
  }
}
