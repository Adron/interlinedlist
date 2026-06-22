/**
 * Unit tests for lib/auth/oauth-twitter.ts
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isTwitterConfigured,
  getTwitterConfig,
  generateState,
  getTwitterRedirectUri,
  buildTwitterAuthUrl,
  exchangeTwitterCode,
  fetchTwitterUser,
  refreshTwitterToken,
  TWITTER_PROVIDER,
} from './oauth-twitter';

// ─── helpers ───────────────────────────────────────────────────────────────

function setEnv(vars: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
}

// ─── TWITTER_PROVIDER constant ─────────────────────────────────────────────

describe('TWITTER_PROVIDER', () => {
  it('equals "twitter"', () => {
    expect(TWITTER_PROVIDER).toBe('twitter');
  });
});

// ─── isTwitterConfigured ───────────────────────────────────────────────────

describe('isTwitterConfigured', () => {
  const saved = {
    TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID,
    TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET,
  };

  afterEach(() => setEnv(saved));

  it('returns true when both env vars are set', () => {
    setEnv({ TWITTER_CLIENT_ID: 'id123', TWITTER_CLIENT_SECRET: 'secret456' });
    expect(isTwitterConfigured()).toBe(true);
  });

  it('returns false when TWITTER_CLIENT_ID is missing', () => {
    setEnv({ TWITTER_CLIENT_ID: undefined, TWITTER_CLIENT_SECRET: 'secret456' });
    expect(isTwitterConfigured()).toBe(false);
  });

  it('returns false when TWITTER_CLIENT_SECRET is missing', () => {
    setEnv({ TWITTER_CLIENT_ID: 'id123', TWITTER_CLIENT_SECRET: undefined });
    expect(isTwitterConfigured()).toBe(false);
  });

  it('returns false when both env vars are missing', () => {
    setEnv({ TWITTER_CLIENT_ID: undefined, TWITTER_CLIENT_SECRET: undefined });
    expect(isTwitterConfigured()).toBe(false);
  });

  it('returns false when env vars are empty strings', () => {
    setEnv({ TWITTER_CLIENT_ID: '', TWITTER_CLIENT_SECRET: '' });
    expect(isTwitterConfigured()).toBe(false);
  });
});

// ─── getTwitterConfig ──────────────────────────────────────────────────────

describe('getTwitterConfig', () => {
  const saved = {
    TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID,
    TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET,
  };

  afterEach(() => setEnv(saved));

  it('returns clientId and clientSecret when both are set', () => {
    setEnv({ TWITTER_CLIENT_ID: 'myId', TWITTER_CLIENT_SECRET: 'mySecret' });
    const config = getTwitterConfig();
    expect(config.clientId).toBe('myId');
    expect(config.clientSecret).toBe('mySecret');
  });

  it('throws when TWITTER_CLIENT_ID is missing', () => {
    setEnv({ TWITTER_CLIENT_ID: undefined, TWITTER_CLIENT_SECRET: 'mySecret' });
    expect(() => getTwitterConfig()).toThrow(
      'TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET must be set'
    );
  });

  it('throws when TWITTER_CLIENT_SECRET is missing', () => {
    setEnv({ TWITTER_CLIENT_ID: 'myId', TWITTER_CLIENT_SECRET: undefined });
    expect(() => getTwitterConfig()).toThrow(
      'TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET must be set'
    );
  });

  it('throws when both are missing', () => {
    setEnv({ TWITTER_CLIENT_ID: undefined, TWITTER_CLIENT_SECRET: undefined });
    expect(() => getTwitterConfig()).toThrow();
  });
});

// ─── generateState ─────────────────────────────────────────────────────────

describe('generateState', () => {
  it('returns a non-empty string', () => {
    expect(generateState().length).toBeGreaterThan(0);
  });

  it('returns only base64url characters', () => {
    expect(generateState()).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('returns different values on successive calls', () => {
    expect(generateState()).not.toBe(generateState());
  });

  it('returns a string of reasonable length (at least 20 chars)', () => {
    // randomBytes(32) in base64url is ~43 chars
    expect(generateState().length).toBeGreaterThanOrEqual(20);
  });
});

// ─── getTwitterRedirectUri ─────────────────────────────────────────────────

describe('getTwitterRedirectUri', () => {
  const saved = {
    TWITTER_REDIRECT_URI: process.env.TWITTER_REDIRECT_URI,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };

  afterEach(() => setEnv(saved));

  it('returns TWITTER_REDIRECT_URI when explicitly set', () => {
    setEnv({ TWITTER_REDIRECT_URI: 'https://custom.example.com/callback' });
    expect(getTwitterRedirectUri()).toBe('https://custom.example.com/callback');
  });

  it('falls back to APP_URL-based path when env var is not set', () => {
    setEnv({ TWITTER_REDIRECT_URI: undefined });
    const uri = getTwitterRedirectUri();
    expect(uri).toMatch(/\/api\/auth\/twitter\/callback$/);
  });
});

// ─── buildTwitterAuthUrl ───────────────────────────────────────────────────

describe('buildTwitterAuthUrl', () => {
  const saved = {
    TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID,
    TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET,
    TWITTER_REDIRECT_URI: process.env.TWITTER_REDIRECT_URI,
  };

  beforeEach(() => {
    setEnv({
      TWITTER_CLIENT_ID: 'test-client-id',
      TWITTER_CLIENT_SECRET: 'test-client-secret',
      TWITTER_REDIRECT_URI: 'https://example.com/api/auth/twitter/callback',
    });
  });

  afterEach(() => setEnv(saved));

  it('returns a URL starting with the Twitter authorize endpoint', () => {
    const url = buildTwitterAuthUrl('state123', 'challenge456');
    expect(url).toMatch(/^https:\/\/twitter\.com\/i\/oauth2\/authorize/);
  });

  it('includes response_type=code', () => {
    const url = buildTwitterAuthUrl('state123', 'challenge456');
    expect(url).toContain('response_type=code');
  });

  it('includes client_id in query params', () => {
    const url = buildTwitterAuthUrl('state123', 'challenge456');
    expect(url).toContain('client_id=test-client-id');
  });

  it('includes the redirect_uri', () => {
    const url = buildTwitterAuthUrl('state123', 'challenge456');
    expect(url).toContain(encodeURIComponent('https://example.com/api/auth/twitter/callback'));
  });

  it('includes the state parameter', () => {
    const url = buildTwitterAuthUrl('my-state', 'my-challenge');
    expect(url).toContain('state=my-state');
  });

  it('includes the code_challenge', () => {
    const url = buildTwitterAuthUrl('my-state', 'my-challenge');
    expect(url).toContain('code_challenge=my-challenge');
  });

  it('includes code_challenge_method=S256', () => {
    const url = buildTwitterAuthUrl('state', 'challenge');
    expect(url).toContain('code_challenge_method=S256');
  });

  it('includes required scopes', () => {
    const url = buildTwitterAuthUrl('state', 'challenge');
    expect(url).toContain('tweet.read');
    expect(url).toContain('tweet.write');
    expect(url).toContain('users.read');
    expect(url).toContain('offline.access');
  });

  it('does not include link param in the Twitter auth URL', () => {
    const url = buildTwitterAuthUrl('state', 'challenge');
    expect(url).not.toContain('link=');
  });
});

// ─── exchangeTwitterCode ───────────────────────────────────────────────────

describe('exchangeTwitterCode', () => {
  const saved = {
    TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID,
    TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET,
    TWITTER_REDIRECT_URI: process.env.TWITTER_REDIRECT_URI,
  };

  beforeEach(() => {
    setEnv({
      TWITTER_CLIENT_ID: 'test-client-id',
      TWITTER_CLIENT_SECRET: 'test-client-secret',
      TWITTER_REDIRECT_URI: 'https://example.com/api/auth/twitter/callback',
    });
  });

  afterEach(() => {
    setEnv(saved);
    vi.restoreAllMocks();
  });

  it('returns token response on success', async () => {
    const mockToken = {
      access_token: 'access-abc',
      refresh_token: 'refresh-xyz',
      expires_in: 7200,
      scope: 'tweet.read tweet.write',
      token_type: 'bearer',
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockToken,
    }));

    const result = await exchangeTwitterCode('auth-code', 'verifier-123');
    expect(result.access_token).toBe('access-abc');
    expect(result.refresh_token).toBe('refresh-xyz');
    expect(result.expires_in).toBe(7200);
  });

  it('sends POST to the Twitter token endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'tok' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await exchangeTwitterCode('code', 'verifier');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.twitter.com/2/oauth2/token');
    expect(opts.method).toBe('POST');
  });

  it('sends Basic Authorization header with base64-encoded credentials', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'tok' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await exchangeTwitterCode('code', 'verifier');

    const [, opts] = mockFetch.mock.calls[0];
    const expectedCreds = Buffer.from('test-client-id:test-client-secret').toString('base64');
    expect(opts.headers['Authorization']).toBe(`Basic ${expectedCreds}`);
  });

  it('sends grant_type=authorization_code in body', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'tok' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await exchangeTwitterCode('my-code', 'my-verifier');

    const [, opts] = mockFetch.mock.calls[0];
    const body = opts.body.toString();
    expect(body).toContain('grant_type=authorization_code');
    expect(body).toContain('code=my-code');
    expect(body).toContain('code_verifier=my-verifier');
  });

  it('throws when the HTTP response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
      text: async () => 'invalid_client',
    }));

    await expect(exchangeTwitterCode('bad-code', 'verifier')).rejects.toThrow(
      'Twitter token exchange failed: invalid_client'
    );
  });
});

// ─── fetchTwitterUser ──────────────────────────────────────────────────────

describe('fetchTwitterUser', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the user data on success', async () => {
    const mockUser = {
      id: 'user-1',
      name: 'Test User',
      username: 'testuser',
      profile_image_url: 'https://pbs.twimg.com/profile_images/test.jpg',
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockUser }),
    }));

    const user = await fetchTwitterUser('access-token');
    expect(user.id).toBe('user-1');
    expect(user.name).toBe('Test User');
    expect(user.username).toBe('testuser');
    expect(user.profile_image_url).toBe('https://pbs.twimg.com/profile_images/test.jpg');
  });

  it('sends Bearer Authorization header', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: '1', name: 'A', username: 'a' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await fetchTwitterUser('my-token');

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers['Authorization']).toBe('Bearer my-token');
  });

  it('fetches the correct user URL including profile_image_url field', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: '1', name: 'A', username: 'a' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await fetchTwitterUser('token');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('https://api.twitter.com/2/users/me');
    expect(url).toContain('profile_image_url');
  });

  it('throws when the HTTP response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
    }));

    await expect(fetchTwitterUser('bad-token')).rejects.toThrow(
      'Failed to fetch Twitter user info'
    );
  });

  it('returns undefined profile_image_url when not present in response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: '2', name: 'B', username: 'b' } }),
    }));

    const user = await fetchTwitterUser('token');
    expect(user.profile_image_url).toBeUndefined();
  });
});

// ─── refreshTwitterToken ───────────────────────────────────────────────────

describe('refreshTwitterToken', () => {
  const saved = {
    TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID,
    TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET,
  };

  beforeEach(() => {
    setEnv({
      TWITTER_CLIENT_ID: 'test-client-id',
      TWITTER_CLIENT_SECRET: 'test-client-secret',
    });
  });

  afterEach(() => {
    setEnv(saved);
    vi.restoreAllMocks();
  });

  it('POSTs to the Twitter token endpoint with grant_type=refresh_token', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_in: 7200,
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await refreshTwitterToken('old-refresh-token');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.twitter.com/2/oauth2/token');
    expect(init.method).toBe('POST');
    const body = (init.body as URLSearchParams).toString();
    expect(body).toContain('grant_type=refresh_token');
    expect(body).toContain('refresh_token=old-refresh-token');
    expect(body).toContain('client_id=test-client-id');
  });

  it('sends Basic Authorization header with base64-encoded credentials', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'a', refresh_token: 'r' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await refreshTwitterToken('whatever');

    const [, init] = mockFetch.mock.calls[0];
    const expected = Buffer.from('test-client-id:test-client-secret').toString('base64');
    expect(init.headers['Authorization']).toBe(`Basic ${expected}`);
  });

  it('returns the new token pair on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_in: 7200,
      }),
    }));

    const result = await refreshTwitterToken('old');
    expect(result.access_token).toBe('new-access');
    expect(result.refresh_token).toBe('new-refresh');
    expect(result.expires_in).toBe(7200);
  });

  it('throws when the HTTP response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
      text: async () => 'invalid_grant',
    }));

    await expect(refreshTwitterToken('rotten')).rejects.toThrow(
      /Twitter token refresh failed: invalid_grant/
    );
  });
});
