/**
 * Unit tests for lib/twitter/token-refresh.ts
 *
 * Covers:
 *   - getValidTwitterAccessToken returns the cached token when fresh
 *   - getValidTwitterAccessToken refreshes when expired and persists
 *   - getValidTwitterAccessToken returns null when refresh fails
 *   - forceRefreshTwitterAccessToken behaviour
 *   - persistence preserves unrelated providerData keys
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── prisma mock ───────────────────────────────────────────────────────────
// Capture the last update() args so tests can assert what we wrote back.

const updateMock = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    linkedIdentity: {
      update: (...args: unknown[]) => updateMock(...args),
    },
  },
}));

// Import under test after the mock is registered.
import {
  getValidTwitterAccessToken,
  forceRefreshTwitterAccessToken,
} from './token-refresh';
import type { TwitterProviderData } from './post-status';

// ─── env scaffolding for refreshTwitterToken ───────────────────────────────

function setEnv(vars: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

const savedEnv = {
  TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID,
  TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET,
};

beforeEach(() => {
  setEnv({
    TWITTER_CLIENT_ID: 'test-client-id',
    TWITTER_CLIENT_SECRET: 'test-client-secret',
  });
  updateMock.mockReset();
  updateMock.mockResolvedValue({});
});

afterEach(() => {
  setEnv(savedEnv);
  vi.restoreAllMocks();
});

// ─── getValidTwitterAccessToken — fresh-token path ─────────────────────────

describe('getValidTwitterAccessToken — fresh token', () => {
  it('returns the stored token without refreshing when expires_at is far in the future', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const providerData: TwitterProviderData = {
      access_token: 'fresh-token',
      refresh_token: 'r1',
      expires_at: Date.now() + 60 * 60 * 1000, // 1 hour out
    };

    const token = await getValidTwitterAccessToken({
      id: 'id-1',
      providerData,
    });

    expect(token).toBe('fresh-token');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('returns the stored token without refreshing when expires_at is missing (legacy row)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const providerData: TwitterProviderData = {
      access_token: 'legacy-token',
      refresh_token: 'r1',
    };

    const token = await getValidTwitterAccessToken({
      id: 'id-2',
      providerData,
    });

    expect(token).toBe('legacy-token');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ─── getValidTwitterAccessToken — refresh path ─────────────────────────────

describe('getValidTwitterAccessToken — expired token', () => {
  it('calls the Twitter token endpoint when expired and returns the new token', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_in: 7200,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const providerData: TwitterProviderData = {
      access_token: 'old-access',
      refresh_token: 'old-refresh',
      expires_at: Date.now() - 1000, // 1 second past expiry
    };

    const token = await getValidTwitterAccessToken({
      id: 'id-3',
      providerData,
    });

    expect(token).toBe('new-access');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.twitter.com/2/oauth2/token');
    expect(init.method).toBe('POST');
    const body = (init.body as URLSearchParams).toString();
    expect(body).toContain('grant_type=refresh_token');
    expect(body).toContain('refresh_token=old-refresh');
  });

  it('persists the new token + refresh_token + expires_at to providerData', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_in: 7200,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const beforeRefresh = Date.now();
    await getValidTwitterAccessToken({
      id: 'identity-xyz',
      providerData: {
        access_token: 'old-access',
        refresh_token: 'old-refresh',
        expires_at: Date.now() - 1000,
      },
    });

    expect(updateMock).toHaveBeenCalledTimes(1);
    const call = updateMock.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'identity-xyz' });
    const written = call.data.providerData as TwitterProviderData;
    expect(written.access_token).toBe('new-access');
    expect(written.refresh_token).toBe('new-refresh');
    expect(written.expires_at).toBeGreaterThanOrEqual(beforeRefresh + 7200 * 1000 - 5000);
    expect(written.expires_at).toBeLessThanOrEqual(beforeRefresh + 7200 * 1000 + 5000);
  });

  it('refreshes when expires_at is within the 60s skew window', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'fresh', refresh_token: 'r2', expires_in: 7200 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await getValidTwitterAccessToken({
      id: 'id-skew',
      providerData: {
        access_token: 'about-to-die',
        refresh_token: 'r1',
        expires_at: Date.now() + 30 * 1000, // 30s out — inside the 60s skew
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('preserves unrelated keys in providerData when persisting', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'a2', refresh_token: 'r2', expires_in: 7200 }),
    }));

    await getValidTwitterAccessToken({
      id: 'id-preserve',
      providerData: {
        access_token: 'a1',
        refresh_token: 'r1',
        expires_at: Date.now() - 1000,
        // an unrelated key future versions might add
        ...({ custom: 'keep-me' } as object),
      } as TwitterProviderData,
    });

    const written = updateMock.mock.calls[0][0].data.providerData as Record<string, unknown>;
    expect(written.custom).toBe('keep-me');
  });
});

// ─── getValidTwitterAccessToken — failure modes ────────────────────────────

describe('getValidTwitterAccessToken — failure modes', () => {
  it('returns null when the refresh endpoint returns non-ok and does not throw', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
      text: async () => 'invalid_grant',
    }));

    const token = await getValidTwitterAccessToken({
      id: 'id-fail',
      providerData: {
        access_token: 'old',
        refresh_token: 'bad-refresh',
        expires_at: Date.now() - 1000,
      },
    });

    expect(token).toBeNull();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('returns null when fetch throws and does not propagate the error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('Network down')));

    const token = await getValidTwitterAccessToken({
      id: 'id-throw',
      providerData: {
        access_token: 'old',
        refresh_token: 'r1',
        expires_at: Date.now() - 1000,
      },
    });

    expect(token).toBeNull();
  });

  it('returns null when providerData is missing access_token entirely', async () => {
    const token = await getValidTwitterAccessToken({
      id: 'id-empty',
      providerData: null,
    });
    expect(token).toBeNull();
  });

  it('returns the stored token when expired but no refresh_token is on file (legacy)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const token = await getValidTwitterAccessToken({
      id: 'id-no-refresh',
      providerData: {
        access_token: 'old-but-only',
        expires_at: Date.now() - 1000,
      },
    });

    expect(token).toBe('old-but-only');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ─── forceRefreshTwitterAccessToken ────────────────────────────────────────

describe('forceRefreshTwitterAccessToken', () => {
  it('always calls the token endpoint regardless of expires_at', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'forced', refresh_token: 'r2', expires_in: 7200 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const token = await forceRefreshTwitterAccessToken({
      id: 'id-force',
      providerData: {
        access_token: 'stale',
        refresh_token: 'r1',
        expires_at: Date.now() + 60 * 60 * 1000, // claim fresh
      },
    });

    expect(token).toBe('forced');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledTimes(1);
  });

  it('returns null when no refresh_token is on file', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const token = await forceRefreshTwitterAccessToken({
      id: 'id-no-refresh',
      providerData: {
        access_token: 'stale',
      },
    });

    expect(token).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null when the refresh endpoint fails and does not throw', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
      text: async () => 'invalid_grant',
    }));

    const token = await forceRefreshTwitterAccessToken({
      id: 'id-force-fail',
      providerData: {
        access_token: 'stale',
        refresh_token: 'rotten',
      },
    });

    expect(token).toBeNull();
  });
});
