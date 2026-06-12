/**
 * Unit tests for lib/auth/oauth-linkedin.ts
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LINKEDIN_PROVIDER,
  isLinkedInConfigured,
  getLinkedInConfig,
  generateState,
  getLinkedInRedirectUri,
  getLinkedInOrgRedirectUri,
  buildLinkedInAuthUrl,
  buildLinkedInOrgAuthUrl,
  fetchLinkedInAdminPages,
} from './oauth-linkedin';

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

// ─── LINKEDIN_PROVIDER constant ────────────────────────────────────────────

describe('LINKEDIN_PROVIDER', () => {
  it('equals "linkedin"', () => {
    expect(LINKEDIN_PROVIDER).toBe('linkedin');
  });
});

// ─── isLinkedInConfigured ──────────────────────────────────────────────────

describe('isLinkedInConfigured', () => {
  const saved = {
    LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID,
    LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET,
  };

  afterEach(() => setEnv(saved));

  it('returns true when both env vars are set', () => {
    setEnv({ LINKEDIN_CLIENT_ID: 'id123', LINKEDIN_CLIENT_SECRET: 'secret456' });
    expect(isLinkedInConfigured()).toBe(true);
  });

  it('returns false when LINKEDIN_CLIENT_ID is missing', () => {
    setEnv({ LINKEDIN_CLIENT_ID: undefined, LINKEDIN_CLIENT_SECRET: 'secret456' });
    expect(isLinkedInConfigured()).toBe(false);
  });

  it('returns false when LINKEDIN_CLIENT_SECRET is missing', () => {
    setEnv({ LINKEDIN_CLIENT_ID: 'id123', LINKEDIN_CLIENT_SECRET: undefined });
    expect(isLinkedInConfigured()).toBe(false);
  });

  it('returns false when both are missing', () => {
    setEnv({ LINKEDIN_CLIENT_ID: undefined, LINKEDIN_CLIENT_SECRET: undefined });
    expect(isLinkedInConfigured()).toBe(false);
  });

  it('returns false when env vars are empty strings', () => {
    setEnv({ LINKEDIN_CLIENT_ID: '', LINKEDIN_CLIENT_SECRET: '' });
    expect(isLinkedInConfigured()).toBe(false);
  });
});

// ─── getLinkedInConfig ─────────────────────────────────────────────────────

describe('getLinkedInConfig', () => {
  const saved = {
    LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID,
    LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET,
  };

  afterEach(() => setEnv(saved));

  it('returns clientId and clientSecret when both are set', () => {
    setEnv({ LINKEDIN_CLIENT_ID: 'myId', LINKEDIN_CLIENT_SECRET: 'mySecret' });
    const config = getLinkedInConfig();
    expect(config.clientId).toBe('myId');
    expect(config.clientSecret).toBe('mySecret');
  });

  it('throws when LINKEDIN_CLIENT_ID is missing', () => {
    setEnv({ LINKEDIN_CLIENT_ID: undefined, LINKEDIN_CLIENT_SECRET: 'mySecret' });
    expect(() => getLinkedInConfig()).toThrow(
      'LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET must be set'
    );
  });

  it('throws when LINKEDIN_CLIENT_SECRET is missing', () => {
    setEnv({ LINKEDIN_CLIENT_ID: 'myId', LINKEDIN_CLIENT_SECRET: undefined });
    expect(() => getLinkedInConfig()).toThrow(
      'LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET must be set'
    );
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
    expect(generateState().length).toBeGreaterThanOrEqual(20);
  });
});

// ─── getLinkedInRedirectUri ────────────────────────────────────────────────

describe('getLinkedInRedirectUri', () => {
  const saved = {
    LINKEDIN_REDIRECT_URI: process.env.LINKEDIN_REDIRECT_URI,
  };

  afterEach(() => setEnv(saved));

  it('returns LINKEDIN_REDIRECT_URI when explicitly set', () => {
    setEnv({ LINKEDIN_REDIRECT_URI: 'https://custom.example.com/callback' });
    expect(getLinkedInRedirectUri()).toBe('https://custom.example.com/callback');
  });

  it('falls back to APP_URL-based path when env var is not set', () => {
    setEnv({ LINKEDIN_REDIRECT_URI: undefined });
    const uri = getLinkedInRedirectUri();
    expect(uri).toMatch(/\/api\/auth\/linkedin\/callback$/);
  });
});

// ─── getLinkedInOrgRedirectUri ─────────────────────────────────────────────

describe('getLinkedInOrgRedirectUri', () => {
  const saved = {
    LINKEDIN_ORG_REDIRECT_URI: process.env.LINKEDIN_ORG_REDIRECT_URI,
  };

  afterEach(() => setEnv(saved));

  it('returns LINKEDIN_ORG_REDIRECT_URI when set', () => {
    setEnv({ LINKEDIN_ORG_REDIRECT_URI: 'https://custom.example.com/org-callback' });
    expect(getLinkedInOrgRedirectUri()).toBe('https://custom.example.com/org-callback');
  });

  it('falls back to APP_URL-based org-callback path when env var is not set', () => {
    setEnv({ LINKEDIN_ORG_REDIRECT_URI: undefined });
    const uri = getLinkedInOrgRedirectUri();
    expect(uri).toMatch(/\/api\/auth\/linkedin\/org-callback$/);
  });

  it('returns a different URI than the personal redirect when neither env var is set', () => {
    setEnv({ LINKEDIN_REDIRECT_URI: undefined, LINKEDIN_ORG_REDIRECT_URI: undefined });
    expect(getLinkedInOrgRedirectUri()).not.toBe(getLinkedInRedirectUri());
  });
});

// ─── buildLinkedInAuthUrl ──────────────────────────────────────────────────

describe('buildLinkedInAuthUrl', () => {
  const saved = {
    LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID,
    LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET,
    LINKEDIN_REDIRECT_URI: process.env.LINKEDIN_REDIRECT_URI,
  };

  beforeEach(() => {
    setEnv({
      LINKEDIN_CLIENT_ID: 'test-client-id',
      LINKEDIN_CLIENT_SECRET: 'test-client-secret',
      LINKEDIN_REDIRECT_URI: 'https://example.com/api/auth/linkedin/callback',
    });
  });

  afterEach(() => setEnv(saved));

  it('returns a URL starting with the LinkedIn authorization endpoint', () => {
    const url = buildLinkedInAuthUrl('state123', false);
    expect(url).toMatch(/^https:\/\/www\.linkedin\.com\/oauth\/v2\/authorization/);
  });

  it('includes response_type=code', () => {
    const url = buildLinkedInAuthUrl('state123', false);
    expect(url).toContain('response_type=code');
  });

  it('includes client_id in query params', () => {
    const url = buildLinkedInAuthUrl('state123', false);
    expect(url).toContain('client_id=test-client-id');
  });

  it('includes the redirect_uri', () => {
    const url = buildLinkedInAuthUrl('state123', false);
    expect(url).toContain(encodeURIComponent('https://example.com/api/auth/linkedin/callback'));
  });

  it('includes the state parameter', () => {
    const url = buildLinkedInAuthUrl('my-state', false);
    expect(url).toContain('state=my-state');
  });

  it('includes personal scopes (w_member_social but NOT rw_organization_admin)', () => {
    const url = buildLinkedInAuthUrl('state', false);
    expect(url).toContain('w_member_social');
    expect(url).not.toContain('rw_organization_admin');
  });

  it('adds link=true when link parameter is true', () => {
    const url = buildLinkedInAuthUrl('state', true);
    expect(url).toContain('link=true');
  });

  it('does not include link param when link is false', () => {
    const url = buildLinkedInAuthUrl('state', false);
    expect(url).not.toContain('link=');
  });
});

// ─── buildLinkedInOrgAuthUrl ───────────────────────────────────────────────

describe('buildLinkedInOrgAuthUrl', () => {
  const saved = {
    LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID,
    LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET,
    LINKEDIN_ORG_REDIRECT_URI: process.env.LINKEDIN_ORG_REDIRECT_URI,
  };

  beforeEach(() => {
    setEnv({
      LINKEDIN_CLIENT_ID: 'test-client-id',
      LINKEDIN_CLIENT_SECRET: 'test-client-secret',
      LINKEDIN_ORG_REDIRECT_URI: 'https://example.com/api/auth/linkedin/org-callback',
    });
  });

  afterEach(() => setEnv(saved));

  it('returns a URL starting with the LinkedIn authorization endpoint', () => {
    const url = buildLinkedInOrgAuthUrl('state123');
    expect(url).toMatch(/^https:\/\/www\.linkedin\.com\/oauth\/v2\/authorization/);
  });

  it('includes response_type=code', () => {
    const url = buildLinkedInOrgAuthUrl('state123');
    expect(url).toContain('response_type=code');
  });

  it('includes the org redirect_uri', () => {
    const url = buildLinkedInOrgAuthUrl('state');
    expect(url).toContain(encodeURIComponent('https://example.com/api/auth/linkedin/org-callback'));
  });

  it('includes rw_organization_admin scope', () => {
    const url = buildLinkedInOrgAuthUrl('state');
    expect(url).toContain('rw_organization_admin');
  });

  it('also includes w_member_social scope', () => {
    const url = buildLinkedInOrgAuthUrl('state');
    expect(url).toContain('w_member_social');
  });

  it('includes the state parameter', () => {
    const url = buildLinkedInOrgAuthUrl('my-org-state');
    expect(url).toContain('state=my-org-state');
  });

  it('does not include a link=true param (org flow has no link mode)', () => {
    const url = buildLinkedInOrgAuthUrl('state');
    expect(url).not.toContain('link=');
  });
});

// ─── fetchLinkedInAdminPages ───────────────────────────────────────────────

describe('fetchLinkedInAdminPages', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns parsed pages from a well-formed response', async () => {
    const mockResponse = {
      elements: [
        { 'organizationalTarget~': { id: 12345, localizedName: 'Acme Corp' } },
        { 'organizationalTarget~': { id: 67890, localizedName: 'Beta Inc' } },
      ],
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    }));

    const pages = await fetchLinkedInAdminPages('access-token');
    expect(pages).toHaveLength(2);
    expect(pages[0]).toEqual({ id: '12345', name: 'Acme Corp' });
    expect(pages[1]).toEqual({ id: '67890', name: 'Beta Inc' });
  });

  it('converts numeric id to string', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [{ 'organizationalTarget~': { id: 99999, localizedName: 'Test Org' } }],
      }),
    }));

    const pages = await fetchLinkedInAdminPages('token');
    expect(pages[0].id).toBe('99999');
    expect(typeof pages[0].id).toBe('string');
  });

  it('uses localizedName fallback when localizedName is undefined', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [{ 'organizationalTarget~': { id: 42 } }],
      }),
    }));

    const pages = await fetchLinkedInAdminPages('token');
    expect(pages[0].name).toBe('Organization 42');
  });

  it('skips elements without an id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [
          { 'organizationalTarget~': { localizedName: 'No ID org' } },
          { 'organizationalTarget~': { id: 100, localizedName: 'Valid Org' } },
        ],
      }),
    }));

    const pages = await fetchLinkedInAdminPages('token');
    expect(pages).toHaveLength(1);
    expect(pages[0].id).toBe('100');
  });

  it('skips elements without organizationalTarget~', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [
          {},
          { 'organizationalTarget~': { id: 55, localizedName: 'Good Org' } },
        ],
      }),
    }));

    const pages = await fetchLinkedInAdminPages('token');
    expect(pages).toHaveLength(1);
    expect(pages[0].id).toBe('55');
  });

  it('returns empty array when elements is empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ elements: [] }),
    }));

    const pages = await fetchLinkedInAdminPages('token');
    expect(pages).toEqual([]);
  });

  it('returns empty array when elements key is absent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    }));

    const pages = await fetchLinkedInAdminPages('token');
    expect(pages).toEqual([]);
  });

  it('sends Bearer Authorization header', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ elements: [] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await fetchLinkedInAdminPages('my-access-token');

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers['Authorization']).toBe('Bearer my-access-token');
  });

  it('sends the correct Linkedin-Version header', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ elements: [] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await fetchLinkedInAdminPages('token');

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers['Linkedin-Version']).toBe('202510');
  });

  it('throws when the API returns a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
    }));

    await expect(fetchLinkedInAdminPages('bad-token')).rejects.toThrow(
      'Failed to fetch LinkedIn admin pages: HTTP 403'
    );
  });

  it('requests the correct organizationalEntityAcls endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ elements: [] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await fetchLinkedInAdminPages('token');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('https://api.linkedin.com/v2/organizationalEntityAcls');
    expect(url).toContain('q=roleAssignee');
    expect(url).toContain('role=ADMINISTRATOR');
  });
});
