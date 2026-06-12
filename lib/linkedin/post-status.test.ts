/**
 * Unit tests for lib/linkedin/post-status.ts
 *
 * postToLinkedIn accepts a LinkedInPostTarget — tests verify that all three
 * fields (accessToken, authorUrn, credentialId) are used correctly in the
 * LinkedIn API call, and that the result shape is always well-formed.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { postToLinkedIn } from './post-status';
import type { LinkedInPostTarget, CrossPostOptions } from './post-status';

// ─── helpers ───────────────────────────────────────────────────────────────

function makeTarget(overrides?: Partial<LinkedInPostTarget>): LinkedInPostTarget {
  return {
    accessToken: 'test-access-token',
    authorUrn: 'urn:li:person:user-123',
    credentialId: 'cred-abc',
    ...overrides,
  };
}

function makeOptions(overrides?: Partial<CrossPostOptions>): CrossPostOptions {
  return {
    content: 'Hello LinkedIn!',
    publiclyVisible: true,
    imageUrls: [],
    videoUrls: [],
    ...overrides,
  };
}

/** Minimal fetch mock for a successful post with x-restli-id header. */
function mockSuccessfulPost(postId = 'urn:li:share:987654321') {
  return vi.fn().mockResolvedValue({
    ok: true,
    headers: {
      get: (name: string) => (name === 'x-restli-id' ? postId : null),
    },
    text: async () => '',
  });
}

// ─── LinkedInPostTarget fields are used correctly ─────────────────────────

describe('postToLinkedIn — LinkedInPostTarget field usage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sends the accessToken as Bearer Authorization header', async () => {
    const mockFetch = mockSuccessfulPost();
    vi.stubGlobal('fetch', mockFetch);

    await postToLinkedIn(makeTarget({ accessToken: 'my-special-token' }), makeOptions());

    const postCall = mockFetch.mock.calls.find(
      ([url]) => String(url) === 'https://api.linkedin.com/rest/posts'
    );
    expect(postCall).toBeDefined();
    const [, opts] = postCall!;
    expect(opts.headers['Authorization']).toBe('Bearer my-special-token');
  });

  it('uses authorUrn as the author field in the request body', async () => {
    const mockFetch = mockSuccessfulPost();
    vi.stubGlobal('fetch', mockFetch);

    await postToLinkedIn(
      makeTarget({ authorUrn: 'urn:li:organization:99999' }),
      makeOptions()
    );

    const postCall = mockFetch.mock.calls.find(
      ([url]) => String(url) === 'https://api.linkedin.com/rest/posts'
    );
    const [, opts] = postCall!;
    const body = JSON.parse(opts.body);
    expect(body.author).toBe('urn:li:organization:99999');
  });

  it('uses authorUrn from target, not derived from any other field', async () => {
    const mockFetch = mockSuccessfulPost();
    vi.stubGlobal('fetch', mockFetch);

    // org-style URN — must be sent as-is
    const orgUrn = 'urn:li:organization:12345';
    await postToLinkedIn(makeTarget({ authorUrn: orgUrn }), makeOptions());

    const postCall = mockFetch.mock.calls.find(
      ([url]) => String(url) === 'https://api.linkedin.com/rest/posts'
    );
    const [, opts] = postCall!;
    const body = JSON.parse(opts.body);
    expect(body.author).toBe(orgUrn);
  });

  it('uses credentialId as providerId in the success result', async () => {
    vi.stubGlobal('fetch', mockSuccessfulPost());

    const result = await postToLinkedIn(
      makeTarget({ credentialId: 'cred-xyz-999' }),
      makeOptions()
    );

    expect(result.providerId).toBe('cred-xyz-999');
  });

  it('uses credentialId as providerId in failure results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    }));

    const result = await postToLinkedIn(
      makeTarget({ credentialId: 'cred-fail-id' }),
      makeOptions()
    );

    expect(result.success).toBe(false);
    expect(result.providerId).toBe('cred-fail-id');
  });
});

// ─── success result shape ──────────────────────────────────────────────────

describe('postToLinkedIn — success result shape', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns success: true and instanceName: "LinkedIn"', async () => {
    vi.stubGlobal('fetch', mockSuccessfulPost());

    const result = await postToLinkedIn(makeTarget(), makeOptions());

    expect(result.success).toBe(true);
    expect(result.instanceName).toBe('LinkedIn');
  });

  it('returns a url using the x-restli-id header', async () => {
    vi.stubGlobal('fetch', mockSuccessfulPost('urn:li:share:111222333'));

    const result = await postToLinkedIn(makeTarget(), makeOptions());

    expect(result.url).toBe('https://www.linkedin.com/feed/update/urn:li:share:111222333');
    expect(result.postId).toBe('urn:li:share:111222333');
  });

  it('returns fallback feed url when x-restli-id is absent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      text: async () => '',
    }));

    const result = await postToLinkedIn(makeTarget(), makeOptions());

    expect(result.url).toBe('https://www.linkedin.com/feed/');
    expect(result.postId).toBeUndefined();
  });
});

// ─── request body structure ────────────────────────────────────────────────

describe('postToLinkedIn — request body structure', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sends lifecycleState: PUBLISHED', async () => {
    const mockFetch = mockSuccessfulPost();
    vi.stubGlobal('fetch', mockFetch);

    await postToLinkedIn(makeTarget(), makeOptions());

    const postCall = mockFetch.mock.calls.find(
      ([url]) => String(url) === 'https://api.linkedin.com/rest/posts'
    );
    const body = JSON.parse(postCall![1].body);
    expect(body.lifecycleState).toBe('PUBLISHED');
  });

  it('sends visibility: PUBLIC when publiclyVisible is true', async () => {
    const mockFetch = mockSuccessfulPost();
    vi.stubGlobal('fetch', mockFetch);

    await postToLinkedIn(makeTarget(), makeOptions({ publiclyVisible: true }));

    const postCall = mockFetch.mock.calls.find(
      ([url]) => String(url) === 'https://api.linkedin.com/rest/posts'
    );
    const body = JSON.parse(postCall![1].body);
    expect(body.visibility).toBe('PUBLIC');
  });

  it('sends visibility: CONNECTIONS when publiclyVisible is false', async () => {
    const mockFetch = mockSuccessfulPost();
    vi.stubGlobal('fetch', mockFetch);

    await postToLinkedIn(makeTarget(), makeOptions({ publiclyVisible: false }));

    const postCall = mockFetch.mock.calls.find(
      ([url]) => String(url) === 'https://api.linkedin.com/rest/posts'
    );
    const body = JSON.parse(postCall![1].body);
    expect(body.visibility).toBe('CONNECTIONS');
  });

  it('includes the content text as commentary', async () => {
    const mockFetch = mockSuccessfulPost();
    vi.stubGlobal('fetch', mockFetch);

    await postToLinkedIn(makeTarget(), makeOptions({ content: 'My test post content' }));

    const postCall = mockFetch.mock.calls.find(
      ([url]) => String(url) === 'https://api.linkedin.com/rest/posts'
    );
    const body = JSON.parse(postCall![1].body);
    expect(body.commentary).toContain('My test post content');
  });

  it('sends correct distribution object with MAIN_FEED', async () => {
    const mockFetch = mockSuccessfulPost();
    vi.stubGlobal('fetch', mockFetch);

    await postToLinkedIn(makeTarget(), makeOptions());

    const postCall = mockFetch.mock.calls.find(
      ([url]) => String(url) === 'https://api.linkedin.com/rest/posts'
    );
    const body = JSON.parse(postCall![1].body);
    expect(body.distribution?.feedDistribution).toBe('MAIN_FEED');
  });

  it('sends the request to the correct LinkedIn REST posts endpoint', async () => {
    const mockFetch = mockSuccessfulPost();
    vi.stubGlobal('fetch', mockFetch);

    await postToLinkedIn(makeTarget(), makeOptions());

    const postCall = mockFetch.mock.calls.find(
      ([url]) => String(url) === 'https://api.linkedin.com/rest/posts'
    );
    expect(postCall).toBeDefined();
    expect(postCall![1].method).toBe('POST');
  });
});

// ─── API failure handling ──────────────────────────────────────────────────

describe('postToLinkedIn — API failure handling', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns success: false on non-ok HTTP response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    }));

    const result = await postToLinkedIn(makeTarget(), makeOptions());

    expect(result.success).toBe(false);
    expect(result.instanceName).toBe('LinkedIn');
  });

  it('extracts message from JSON error body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ message: 'Invalid author URN', status: 400 }),
    }));

    const result = await postToLinkedIn(makeTarget(), makeOptions());

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid author URN');
  });

  it('falls back to raw text when error body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    }));

    const result = await postToLinkedIn(makeTarget(), makeOptions());

    expect(result.success).toBe(false);
    expect(result.error).toBe('Internal Server Error');
  });

  it('returns failure with error message when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

    const result = await postToLinkedIn(makeTarget(), makeOptions());

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network failure');
  });

  it('returns failure with "Unknown error" for non-Error throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('some string error'));

    const result = await postToLinkedIn(makeTarget(), makeOptions());

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unknown error');
  });
});

// ─── image upload integration ──────────────────────────────────────────────

describe('postToLinkedIn — image upload', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uses authorUrn from target when initializing image upload', async () => {
    const mockFetch = vi.fn()
      // 1. fetch the image bytes
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
        headers: { get: () => 'image/jpeg' },
      })
      // 2. initializeUpload request
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: { uploadUrl: 'https://upload.example.com/img', image: 'urn:li:image:abc' },
        }),
      })
      // 3. PUT to upload URL
      .mockResolvedValueOnce({ ok: true })
      // 4. final post
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: (n: string) => n === 'x-restli-id' ? 'urn:li:share:555' : null },
        text: async () => '',
      });

    vi.stubGlobal('fetch', mockFetch);

    const target = makeTarget({ authorUrn: 'urn:li:organization:77777', accessToken: 'img-token' });
    await postToLinkedIn(target, makeOptions({ imageUrls: ['https://example.com/photo.jpg'] }));

    // The initializeUpload call should use the org URN as owner
    const initCall = mockFetch.mock.calls.find(
      ([url]) => String(url) === 'https://api.linkedin.com/rest/images?action=initializeUpload'
    );
    expect(initCall).toBeDefined();
    const initBody = JSON.parse(initCall![1].body);
    expect(initBody.initializeUploadRequest.owner).toBe('urn:li:organization:77777');
  });

  it('returns failure when image upload initialization fails', async () => {
    vi.stubGlobal('fetch', vi.fn()
      // Fetch image bytes succeeds
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
        headers: { get: () => null },
      })
      // initializeUpload fails
      .mockResolvedValueOnce({ ok: false })
    );

    const result = await postToLinkedIn(
      makeTarget(),
      makeOptions({ imageUrls: ['https://example.com/photo.jpg'] })
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to upload image');
  });
});

// ─── linkAsFirstComment mode ───────────────────────────────────────────────

describe('postToLinkedIn — linkAsFirstComment', () => {
  afterEach(() => vi.restoreAllMocks());

  it('strips URLs from commentary when linkAsFirstComment is true', async () => {
    const mockFetch = vi.fn()
      // Post succeeds
      .mockResolvedValue({
        ok: true,
        headers: { get: (n: string) => n === 'x-restli-id' ? 'urn:li:share:111' : null },
        text: async () => '',
      });

    vi.stubGlobal('fetch', mockFetch);

    await postToLinkedIn(
      makeTarget(),
      makeOptions({
        content: 'Check this out https://example.com/article',
        linkAsFirstComment: true,
      })
    );

    const postCall = mockFetch.mock.calls.find(
      ([url]) => String(url) === 'https://api.linkedin.com/rest/posts'
    );
    const body = JSON.parse(postCall![1].body);
    // The URL should be stripped from the commentary
    expect(body.commentary).not.toContain('https://example.com/article');
    expect(body.commentary).toContain('Check this out');
  });

  it('posts a first comment with the detected URL', async () => {
    const mockFetch = vi.fn()
      // Post itself
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: (n: string) => n === 'x-restli-id' ? 'urn:li:share:222' : null },
        text: async () => '',
      })
      // Comment
      .mockResolvedValueOnce({ ok: true });

    vi.stubGlobal('fetch', mockFetch);

    const result = await postToLinkedIn(
      makeTarget(),
      makeOptions({
        content: 'Check this out https://example.com/article',
        linkAsFirstComment: true,
      })
    );

    expect(result.success).toBe(true);

    const commentCall = mockFetch.mock.calls.find(
      ([url]) => String(url).includes('/socialActions/')
    );
    expect(commentCall).toBeDefined();
    const commentBody = JSON.parse(commentCall![1].body);
    expect(commentBody.message.text).toContain('https://example.com/article');
  });

  it('returns a warning when first comment post fails', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: (n: string) => n === 'x-restli-id' ? 'urn:li:share:333' : null },
        text: async () => '',
      })
      // Comment fails
      .mockResolvedValueOnce({ ok: false })
    );

    const result = await postToLinkedIn(
      makeTarget(),
      makeOptions({
        content: 'See https://example.com/link',
        linkAsFirstComment: true,
      })
    );

    expect(result.success).toBe(true);
    expect(result.warning).toMatch(/link comment/);
  });
});
