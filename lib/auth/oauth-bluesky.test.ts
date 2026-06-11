/**
 * Unit tests for lib/auth/oauth-bluesky.ts
 *
 * Focuses on the getBlueskyFetch wrapper — specifically the duplex fix:
 * when a Request has a body, duplex: 'half' must be forwarded to undici.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock undici BEFORE any imports that might pull it in ────────────────────
// vi.mock is hoisted, so the factory must not reference outer variables.
// We use vi.hoisted to create the spy in the same hoisting pass.
const mockUndiciFetch = vi.hoisted(() => vi.fn().mockResolvedValue(new Response('ok')));

vi.mock('undici', () => ({
  fetch: mockUndiciFetch,
}));

import {
  BLUESKY_PROVIDER,
  getClientMetadataUrl,
  getBlueskyConfig,
  getBlueskyClientMetadata,
  getBlueskyFetch,
} from './oauth-bluesky';

// ─── helpers ────────────────────────────────────────────────────────────────

function setEnv(vars: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
}

// ─── BLUESKY_PROVIDER constant ───────────────────────────────────────────────

describe('BLUESKY_PROVIDER', () => {
  it('equals "bluesky"', () => {
    expect(BLUESKY_PROVIDER).toBe('bluesky');
  });
});

// ─── getClientMetadataUrl ────────────────────────────────────────────────────
// NOTE: APP_URL is computed once at module load time from NEXT_PUBLIC_APP_URL.
// Tests that change the env var after import cannot affect APP_URL; instead we
// verify the observable contract using whatever APP_URL happens to be.

describe('getClientMetadataUrl', () => {
  it('returns a URL ending with /api/oauth/client-metadata', () => {
    const url = getClientMetadataUrl();
    expect(url).toMatch(/\/api\/oauth\/client-metadata$/);
  });

  it('always returns a valid URL', () => {
    expect(() => new URL(getClientMetadataUrl())).not.toThrow();
  });

  it('never contains a bare "localhost" hostname (RFC 8252 loopback rule)', () => {
    // oauthSafeUrl rewrites localhost → 127.0.0.1
    const url = getClientMetadataUrl();
    const parsed = new URL(url);
    expect(parsed.hostname).not.toBe('localhost');
  });
});

// ─── getBlueskyConfig ────────────────────────────────────────────────────────

describe('getBlueskyConfig', () => {
  const saved = {
    BLUESKY_CLIENT_ID: process.env.BLUESKY_CLIENT_ID,
  };

  afterEach(() => setEnv(saved));

  it('uses BLUESKY_CLIENT_ID env var when set', () => {
    setEnv({ BLUESKY_CLIENT_ID: 'https://custom-client-id.example.com' });
    const { clientId } = getBlueskyConfig();
    expect(clientId).toBe('https://custom-client-id.example.com');
  });

  it('falls back to getClientMetadataUrl when BLUESKY_CLIENT_ID is not set', () => {
    setEnv({ BLUESKY_CLIENT_ID: undefined });
    const { clientId } = getBlueskyConfig();
    expect(clientId).toMatch(/\/api\/oauth\/client-metadata$/);
  });
});

// ─── getBlueskyClientMetadata ─────────────────────────────────────────────────

describe('getBlueskyClientMetadata', () => {
  const saved = {
    BLUESKY_CLIENT_ID: process.env.BLUESKY_CLIENT_ID,
  };

  afterEach(() => setEnv(saved));

  it('sets client_id matching getClientMetadataUrl when BLUESKY_CLIENT_ID not set', () => {
    setEnv({ BLUESKY_CLIENT_ID: undefined });
    const meta = getBlueskyClientMetadata();
    expect(meta.client_id).toMatch(/\/api\/oauth\/client-metadata$/);
  });

  it('uses BLUESKY_CLIENT_ID when set', () => {
    setEnv({ BLUESKY_CLIENT_ID: 'https://my-client-id.example.com/metadata' });
    const meta = getBlueskyClientMetadata();
    expect(meta.client_id).toBe('https://my-client-id.example.com/metadata');
  });

  it('sets client_name to "InterlinedList"', () => {
    const meta = getBlueskyClientMetadata();
    expect(meta.client_name).toBe('InterlinedList');
  });

  it('requires dpop_bound_access_tokens', () => {
    expect(getBlueskyClientMetadata().dpop_bound_access_tokens).toBe(true);
  });

  it('includes authorization_code and refresh_token grant types', () => {
    const meta = getBlueskyClientMetadata();
    expect(meta.grant_types).toContain('authorization_code');
    expect(meta.grant_types).toContain('refresh_token');
  });

  it('redirect_uris contains the callback path', () => {
    const meta = getBlueskyClientMetadata();
    expect(meta.redirect_uris[0]).toMatch(/\/api\/auth\/bluesky\/callback$/);
  });

  it('scope includes atproto', () => {
    expect(getBlueskyClientMetadata().scope).toContain('atproto');
  });

  it('token_endpoint_auth_method is "none"', () => {
    expect(getBlueskyClientMetadata().token_endpoint_auth_method).toBe('none');
  });
});

// ─── getBlueskyFetch — duplex injection ──────────────────────────────────────

describe('getBlueskyFetch', () => {
  beforeEach(() => {
    mockUndiciFetch.mockClear();
    mockUndiciFetch.mockResolvedValue(new Response('ok'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Request object with a body ────────────────────────────────────────────

  it('includes duplex: "half" when the Request has a body', async () => {
    const fetchFn = await getBlueskyFetch();
    // Node/undici requires duplex on the Request constructor itself when body is provided
    const req = new Request('https://bsky.social/xrpc/some.method', {
      method: 'POST',
      body: 'payload',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(true ? { duplex: 'half' } : {}),
    } as RequestInit);

    await fetchFn(req);

    expect(mockUndiciFetch).toHaveBeenCalledOnce();
    const [, init] = mockUndiciFetch.mock.calls[0];
    expect(init).toHaveProperty('duplex', 'half');
  });

  it('does NOT include duplex when the Request has no body', async () => {
    const fetchFn = await getBlueskyFetch();
    const req = new Request('https://bsky.social/xrpc/some.query', {
      method: 'GET',
    });

    await fetchFn(req);

    expect(mockUndiciFetch).toHaveBeenCalledOnce();
    const [, init] = mockUndiciFetch.mock.calls[0];
    expect(init).not.toHaveProperty('duplex');
  });

  // ── Request forwarding — URL and method ───────────────────────────────────

  it('forwards req.url as the first argument when input is a Request', async () => {
    const fetchFn = await getBlueskyFetch();
    const req = new Request('https://bsky.social/xrpc/some.query', { method: 'GET' });

    await fetchFn(req);

    const [url] = mockUndiciFetch.mock.calls[0];
    expect(url).toBe('https://bsky.social/xrpc/some.query');
  });

  it('forwards req.method when input is a Request', async () => {
    const fetchFn = await getBlueskyFetch();
    const req = new Request('https://bsky.social/xrpc/some.query', { method: 'DELETE' });

    await fetchFn(req);

    const [, init] = mockUndiciFetch.mock.calls[0];
    expect(init.method).toBe('DELETE');
  });

  it('forwards req.headers when input is a Request', async () => {
    const fetchFn = await getBlueskyFetch();
    const req = new Request('https://bsky.social/xrpc/some.query', {
      method: 'GET',
      headers: { 'x-custom': 'test-value' },
    });

    await fetchFn(req);

    const [, init] = mockUndiciFetch.mock.calls[0];
    expect(init.headers).toMatchObject({ 'x-custom': 'test-value' });
  });

  // ── Plain string URL ──────────────────────────────────────────────────────

  it('passes a string URL + init directly to undici (no decomposition)', async () => {
    const fetchFn = await getBlueskyFetch();
    const init: RequestInit = { method: 'GET', headers: { accept: 'application/json' } };

    await fetchFn('https://bsky.social/xrpc/com.atproto.identity.resolveHandle', init);

    expect(mockUndiciFetch).toHaveBeenCalledOnce();
    const [url, passedInit] = mockUndiciFetch.mock.calls[0];
    expect(url).toBe('https://bsky.social/xrpc/com.atproto.identity.resolveHandle');
    expect(passedInit).toBe(init);
  });

  it('passes a URL object + init directly to undici', async () => {
    const fetchFn = await getBlueskyFetch();
    const urlObj = new URL('https://bsky.social/xrpc/com.atproto.identity.resolveHandle');

    await fetchFn(urlObj);

    expect(mockUndiciFetch).toHaveBeenCalledOnce();
    const [url] = mockUndiciFetch.mock.calls[0];
    expect(url).toBe(urlObj);
  });

  // ── String URL: duplex not injected by wrapper ────────────────────────────

  it('does not inject duplex when called with a plain string URL (init passed as-is)', async () => {
    const fetchFn = await getBlueskyFetch();
    const init: RequestInit = { method: 'POST', body: 'some-body' };

    await fetchFn('https://bsky.social/xrpc/some.method', init);

    // The wrapper passes init straight through for string/URL inputs
    const [, passedInit] = mockUndiciFetch.mock.calls[0];
    expect(passedInit).toBe(init);
    expect(passedInit).not.toHaveProperty('duplex');
  });
});
