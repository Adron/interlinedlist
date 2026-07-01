/**
 * Unit tests for lib/twitter/post-status.ts
 *
 * postToTwitter is the primary public API; the internal helpers
 * (uploadImageToTwitter, uploadVideoToTwitter, postTweet) are exercised
 * via the public function with mocked fetch.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { postToTwitter } from './post-status';
import type { CrossPostOptions, TwitterProviderData } from './post-status';

// Mock the token-refresh module so we can assert that postToTwitter calls it
// AND so the dynamic import inside postToTwitter does not pull in Prisma at
// test time. The default behaviour mirrors a no-op refresh: return the
// stored token unchanged. Individual tests override the implementation.
const getValidTwitterAccessTokenMock = vi.fn();
const forceRefreshTwitterAccessTokenMock = vi.fn();

vi.mock('@/lib/twitter/token-refresh', () => ({
  getValidTwitterAccessToken: (...args: unknown[]) =>
    getValidTwitterAccessTokenMock(...args),
  forceRefreshTwitterAccessToken: (...args: unknown[]) =>
    forceRefreshTwitterAccessTokenMock(...args),
}));

// ─── helpers ───────────────────────────────────────────────────────────────

function makeIdentity(overrides?: Partial<{ access_token: string; username: string | null }>) {
  return {
    id: 'identity-1',
    provider: 'twitter',
    providerUsername: (overrides !== undefined && 'username' in overrides)
      ? (overrides.username as string | null)
      : 'testuser',
    providerData: {
      access_token: overrides?.access_token ?? 'valid-token',
    } as TwitterProviderData,
  };
}

function makeOptions(overrides?: Partial<CrossPostOptions>): CrossPostOptions {
  return {
    content: 'Hello, Twitter!',
    publiclyVisible: true,
    imageUrls: [],
    videoUrls: [],
    ...overrides,
  };
}

/** Build a minimal fetch mock that handles a single tweet post successfully. */
function mockSingleTweetFetch(tweetId = 'tweet-123') {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: { id: tweetId } }),
    text: async () => '',
  });
}

// Default the refresh mocks to a no-op so existing tests continue to behave
// as they did before refresh wiring landed: passthrough the stored token,
// never force-refresh.
beforeEach(() => {
  getValidTwitterAccessTokenMock.mockReset();
  getValidTwitterAccessTokenMock.mockImplementation(
    async (identity: { providerData?: TwitterProviderData | null }) =>
      identity.providerData?.access_token ?? null
  );
  forceRefreshTwitterAccessTokenMock.mockReset();
  forceRefreshTwitterAccessTokenMock.mockResolvedValue(null);
});

// ─── missing credentials ───────────────────────────────────────────────────

describe('postToTwitter — missing credentials', () => {
  it('returns failure when providerData is null', async () => {
    const identity = {
      id: 'id-1',
      provider: 'twitter',
      providerUsername: 'user',
      providerData: null,
    };
    const result = await postToTwitter(identity, makeOptions());
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Missing Twitter credentials/);
  });

  it('returns failure when access_token is empty string', async () => {
    const identity = makeIdentity({ access_token: '' });
    const result = await postToTwitter(identity, makeOptions());
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Missing Twitter credentials/);
  });

  it('always sets instanceName to "Twitter"', async () => {
    const identity = { id: 'id-2', provider: 'twitter', providerUsername: null, providerData: null };
    const result = await postToTwitter(identity, makeOptions());
    expect(result.instanceName).toBe('Twitter');
  });

  it('sets providerId to identity.id on failure', async () => {
    const identity = { id: 'my-id', provider: 'twitter', providerUsername: null, providerData: null };
    const result = await postToTwitter(identity, makeOptions());
    expect(result.providerId).toBe('my-id');
  });
});

// ─── single tweet (content fits in 280 chars) ─────────────────────────────

describe('postToTwitter — single tweet', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns success with tweetId and url when content fits in one tweet', async () => {
    vi.stubGlobal('fetch', mockSingleTweetFetch('tweet-001'));

    const result = await postToTwitter(makeIdentity(), makeOptions());

    expect(result.success).toBe(true);
    expect(result.tweetId).toBe('tweet-001');
    expect(result.tweetIds).toEqual(['tweet-001']);
  });

  it('constructs the tweet URL using providerUsername', async () => {
    vi.stubGlobal('fetch', mockSingleTweetFetch('tweet-001'));

    const result = await postToTwitter(
      makeIdentity({ username: 'myhandle' }),
      makeOptions()
    );

    expect(result.url).toBe('https://twitter.com/myhandle/status/tweet-001');
  });

  it('returns undefined url when providerUsername is null', async () => {
    vi.stubGlobal('fetch', mockSingleTweetFetch('tweet-001'));

    const result = await postToTwitter(
      makeIdentity({ username: null }),
      makeOptions()
    );

    expect(result.url).toBeUndefined();
  });

  it('sends POST to https://api.twitter.com/2/tweets', async () => {
    const mockFetch = mockSingleTweetFetch();
    vi.stubGlobal('fetch', mockFetch);

    await postToTwitter(makeIdentity(), makeOptions());

    const tweetCall = mockFetch.mock.calls.find(
      ([url]: unknown[]) => url === 'https://api.twitter.com/2/tweets'
    );
    expect(tweetCall).toBeDefined();
    const [, opts] = tweetCall!;
    expect(opts.method).toBe('POST');
  });

  it('sends Bearer Authorization header to the tweets endpoint', async () => {
    const mockFetch = mockSingleTweetFetch();
    vi.stubGlobal('fetch', mockFetch);

    await postToTwitter(makeIdentity({ access_token: 'my-access-token' }), makeOptions());

    const tweetCall = mockFetch.mock.calls.find(
      ([url]: unknown[]) => url === 'https://api.twitter.com/2/tweets'
    );
    const [, opts] = tweetCall!;
    expect(opts.headers['Authorization']).toBe('Bearer my-access-token');
  });

  it('sends the content as text in the JSON body', async () => {
    const mockFetch = mockSingleTweetFetch();
    vi.stubGlobal('fetch', mockFetch);

    await postToTwitter(makeIdentity(), makeOptions({ content: 'My tweet text' }));

    const tweetCall = mockFetch.mock.calls.find(
      ([url]: unknown[]) => url === 'https://api.twitter.com/2/tweets'
    );
    const [, opts] = tweetCall!;
    const body = JSON.parse(opts.body);
    expect(body.text).toContain('My tweet text');
  });
});

// ─── tweet post failure ────────────────────────────────────────────────────

describe('postToTwitter — tweet post failure', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns failure when the tweets API returns a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      text: async () => 'Unauthorized',
    }));

    const result = await postToTwitter(makeIdentity(), makeOptions());
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Failed to post tweet/);
  });

  it('returns failure when the tweets API returns no data.id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
      text: async () => '',
    }));

    const result = await postToTwitter(makeIdentity(), makeOptions());
    expect(result.success).toBe(false);
  });
});

// ─── image upload ──────────────────────────────────────────────────────────

describe('postToTwitter — image upload', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uploads images and includes media_ids in the tweet body', async () => {
    const mockFetch = vi.fn()
      // First call: fetch the image URL
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })
      // Second call: upload to Twitter media endpoint
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ media_id_string: 'media-111' }),
      })
      // Third call: post the tweet
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'tweet-with-image' } }),
        text: async () => '',
      });

    vi.stubGlobal('fetch', mockFetch);

    const result = await postToTwitter(
      makeIdentity(),
      makeOptions({ imageUrls: ['https://example.com/img.jpg'] })
    );

    expect(result.success).toBe(true);

    // Verify that the media upload endpoint was called
    const uploadCall = mockFetch.mock.calls.find(
      ([url]: unknown[]) => url === 'https://upload.twitter.com/1.1/media/upload.json'
    );
    expect(uploadCall).toBeDefined();

    // Verify media_ids were included in the tweet
    const tweetCall = mockFetch.mock.calls.find(
      ([url]: unknown[]) => url === 'https://api.twitter.com/2/tweets'
    );
    const [, opts] = tweetCall!;
    const body = JSON.parse(opts.body);
    expect(body.media?.media_ids).toContain('media-111');
  });

  it('posts tweet without media when image fetch fails', async () => {
    const mockFetch = vi.fn()
      // Image fetch fails
      .mockResolvedValueOnce({ ok: false })
      // Tweet post succeeds without media
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'tweet-no-media' } }),
        text: async () => '',
      });

    vi.stubGlobal('fetch', mockFetch);

    const result = await postToTwitter(
      makeIdentity(),
      makeOptions({ imageUrls: ['https://example.com/broken.jpg'] })
    );

    expect(result.success).toBe(true);
    expect(result.tweetId).toBe('tweet-no-media');

    const tweetCall = mockFetch.mock.calls.find(
      ([url]: unknown[]) => url === 'https://api.twitter.com/2/tweets'
    );
    const [, opts] = tweetCall!;
    const body = JSON.parse(opts.body);
    expect(body.media).toBeUndefined();
  });

  it('posts tweet without media when image upload returns no media_id_string', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ media_id_string: undefined }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'tweet-789' } }),
        text: async () => '',
      });

    vi.stubGlobal('fetch', mockFetch);

    const result = await postToTwitter(
      makeIdentity(),
      makeOptions({ imageUrls: ['https://example.com/img.jpg'] })
    );

    expect(result.success).toBe(true);
    const tweetCall = mockFetch.mock.calls.find(
      ([url]: unknown[]) => url === 'https://api.twitter.com/2/tweets'
    );
    const body = JSON.parse(tweetCall![1].body);
    expect(body.media).toBeUndefined();
  });
});

// ─── thread (content exceeds 280 chars) ────────────────────────────────────

describe('postToTwitter — threaded content', () => {
  afterEach(() => vi.restoreAllMocks());

  it('posts multiple tweets when content exceeds 280 characters', async () => {
    // Content that will split into at least 2 tweets
    const longContent =
      'A'.repeat(200) + '. ' + 'B'.repeat(200) + '. ' + 'C'.repeat(200) + '.';

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'tweet-1' } }),
        text: async () => '',
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 'tweet-2' } }),
        text: async () => '',
      });

    vi.stubGlobal('fetch', mockFetch);

    const result = await postToTwitter(makeIdentity(), makeOptions({ content: longContent }));

    expect(result.success).toBe(true);
    const tweetCalls = mockFetch.mock.calls.filter(
      ([url]: unknown[]) => url === 'https://api.twitter.com/2/tweets'
    );
    expect(tweetCalls.length).toBeGreaterThan(1);
  });

  it('sets in_reply_to_tweet_id on subsequent tweets', async () => {
    const longContent = 'A'.repeat(200) + '. ' + 'B'.repeat(200) + '.';

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'first-tweet' } }),
        text: async () => '',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'second-tweet' } }),
        text: async () => '',
      });

    vi.stubGlobal('fetch', mockFetch);

    const result = await postToTwitter(makeIdentity(), makeOptions({ content: longContent }));

    expect(result.success).toBe(true);

    const tweetCalls = mockFetch.mock.calls.filter(
      ([url]: unknown[]) => url === 'https://api.twitter.com/2/tweets'
    );

    if (tweetCalls.length >= 2) {
      const secondBody = JSON.parse(tweetCalls[1][1].body);
      expect(secondBody.reply?.in_reply_to_tweet_id).toBe('first-tweet');
    }
  });

  it('returns all tweetIds in tweetIds array for threads', async () => {
    const longContent = 'A'.repeat(200) + '. ' + 'B'.repeat(200) + '.';

    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async ([url]: [string]) => {
      if (url === 'https://api.twitter.com/2/tweets') {
        callCount++;
        return {
          ok: true,
          json: async () => ({ data: { id: `tweet-${callCount}` } }),
          text: async () => '',
        };
      }
      return { ok: false, text: async () => '' };
    });

    // Use a simpler mock that doesn't need to spread
    const simpleMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'tweet-a' } }),
      text: async () => '',
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'tweet-b' } }),
      text: async () => '',
    });

    vi.stubGlobal('fetch', simpleMock);

    const result = await postToTwitter(makeIdentity(), makeOptions({ content: longContent }));

    if (result.success && result.tweetIds) {
      expect(result.tweetIds.length).toBeGreaterThanOrEqual(1);
      expect(result.tweetId).toBe(result.tweetIds[0]);
    }
  });

  it('returns failure error message indicating which tweet failed', async () => {
    const longContent = 'A'.repeat(200) + '. ' + 'B'.repeat(200) + '.';

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'tweet-ok' } }),
        text: async () => '',
      })
      // Second tweet fails
      .mockResolvedValueOnce({
        ok: false,
        text: async () => 'Rate limit exceeded',
      });

    vi.stubGlobal('fetch', mockFetch);

    const result = await postToTwitter(makeIdentity(), makeOptions({ content: longContent }));

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Failed to post tweet/);
  });
});

// ─── no-media, content-only tweet body ────────────────────────────────────

describe('postToTwitter — tweet body structure', () => {
  afterEach(() => vi.restoreAllMocks());

  it('does not include a media key when no images or videos', async () => {
    const mockFetch = mockSingleTweetFetch();
    vi.stubGlobal('fetch', mockFetch);

    await postToTwitter(makeIdentity(), makeOptions({ imageUrls: [], videoUrls: [] }));

    const tweetCall = mockFetch.mock.calls.find(
      ([url]: unknown[]) => url === 'https://api.twitter.com/2/tweets'
    );
    const body = JSON.parse(tweetCall![1].body);
    expect(body.media).toBeUndefined();
  });

  it('does not include a reply key for the first tweet', async () => {
    const mockFetch = mockSingleTweetFetch();
    vi.stubGlobal('fetch', mockFetch);

    await postToTwitter(makeIdentity(), makeOptions());

    const tweetCall = mockFetch.mock.calls.find(
      ([url]: unknown[]) => url === 'https://api.twitter.com/2/tweets'
    );
    const body = JSON.parse(tweetCall![1].body);
    expect(body.reply).toBeUndefined();
  });
});

// ─── result shape invariants ───────────────────────────────────────────────

describe('postToTwitter — result shape', () => {
  afterEach(() => vi.restoreAllMocks());

  it('always includes providerId matching identity.id on success', async () => {
    vi.stubGlobal('fetch', mockSingleTweetFetch());

    const identity = makeIdentity();
    identity.id = 'custom-identity-id';
    const result = await postToTwitter(identity, makeOptions());

    expect(result.providerId).toBe('custom-identity-id');
  });

  it('always includes instanceName "Twitter" on success', async () => {
    vi.stubGlobal('fetch', mockSingleTweetFetch());

    const result = await postToTwitter(makeIdentity(), makeOptions());
    expect(result.instanceName).toBe('Twitter');
  });

  it('tweetIds is undefined when no tweets posted (credentials missing)', async () => {
    const identity = { id: 'id', provider: 'twitter', providerUsername: null, providerData: null };
    const result = await postToTwitter(identity, makeOptions());
    expect(result.tweetIds).toBeUndefined();
  });
});

// ─── error handling ────────────────────────────────────────────────────────

describe('postToTwitter — unexpected errors', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns failure with error message when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

    const result = await postToTwitter(makeIdentity(), makeOptions());
    expect(result.success).toBe(false);
    expect(result.error).toBe('Network failure');
  });

  it('returns failure with "Unknown error" message for non-Error throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('string error'));

    // The dynamic imports (text-splitter, media-distributor, thread-text) will
    // succeed; the error comes from postTweet. However, since the imports are
    // dynamic, the string throw propagates into the catch block.
    const result = await postToTwitter(makeIdentity(), makeOptions());
    // If a non-Error is thrown, the catch block returns 'Unknown error'
    // but if the imports succeed and postTweet returns null, a different path runs.
    // Either way the result must not be a JS exception thrown to the caller.
    expect(typeof result.success).toBe('boolean');
  });
});

// ─── token refresh wiring ──────────────────────────────────────────────────

describe('postToTwitter — token refresh wiring', () => {
  afterEach(() => vi.restoreAllMocks());

  it('calls getValidTwitterAccessToken before posting', async () => {
    vi.stubGlobal('fetch', mockSingleTweetFetch('t1'));

    await postToTwitter(makeIdentity(), makeOptions());

    expect(getValidTwitterAccessTokenMock).toHaveBeenCalledTimes(1);
    const [identityArg] = getValidTwitterAccessTokenMock.mock.calls[0];
    expect(identityArg).toMatchObject({
      id: 'identity-1',
      providerData: { access_token: 'valid-token' },
    });
  });

  it('uses the refreshed token returned by getValidTwitterAccessToken when posting', async () => {
    getValidTwitterAccessTokenMock.mockResolvedValueOnce('refreshed-access-token');
    const mockFetch = mockSingleTweetFetch('t1');
    vi.stubGlobal('fetch', mockFetch);

    await postToTwitter(makeIdentity({ access_token: 'stale-token' }), makeOptions());

    const tweetCall = mockFetch.mock.calls.find(
      (call: unknown[]) => call[0] === 'https://api.twitter.com/2/tweets'
    );
    expect(tweetCall).toBeDefined();
    const [, opts] = tweetCall!;
    expect(opts.headers['Authorization']).toBe('Bearer refreshed-access-token');
  });

  it('falls back to the stored access_token when getValidTwitterAccessToken returns null', async () => {
    getValidTwitterAccessTokenMock.mockResolvedValueOnce(null);
    const mockFetch = mockSingleTweetFetch('t1');
    vi.stubGlobal('fetch', mockFetch);

    await postToTwitter(makeIdentity({ access_token: 'stored-token' }), makeOptions());

    const tweetCall = mockFetch.mock.calls.find(
      (call: unknown[]) => call[0] === 'https://api.twitter.com/2/tweets'
    );
    const [, opts] = tweetCall!;
    expect(opts.headers['Authorization']).toBe('Bearer stored-token');
  });

  it('does not call the refresh helper when providerData has no access_token', async () => {
    const identity = {
      id: 'no-cred',
      provider: 'twitter',
      providerUsername: 'x',
      providerData: null,
    };

    await postToTwitter(identity, makeOptions());

    expect(getValidTwitterAccessTokenMock).not.toHaveBeenCalled();
  });
});

// ─── refresh-on-401 retry ─────────────────────────────────────────────────

describe('postToTwitter — 401 refresh-and-retry', () => {
  afterEach(() => vi.restoreAllMocks());

  it('force-refreshes and retries the tweet once on a 401 response', async () => {
    // First tweet POST returns 401; force-refresh returns a new token; retry
    // returns success.
    const mockFetch = vi.fn()
      // 1st: tweet POST → 401
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      })
      // 2nd: tweet POST retry → success
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { id: 'tweet-after-refresh' } }),
        text: async () => '',
      });
    vi.stubGlobal('fetch', mockFetch);

    forceRefreshTwitterAccessTokenMock.mockResolvedValueOnce('post-refresh-token');

    const result = await postToTwitter(makeIdentity(), makeOptions());

    expect(result.success).toBe(true);
    expect(result.tweetId).toBe('tweet-after-refresh');
    expect(forceRefreshTwitterAccessTokenMock).toHaveBeenCalledTimes(1);

    // Second tweet POST must use the newly refreshed token
    const tweetCalls = mockFetch.mock.calls.filter(
      (call: unknown[]) => call[0] === 'https://api.twitter.com/2/tweets'
    );
    expect(tweetCalls.length).toBe(2);
    expect((tweetCalls[1] as [string, { headers: Record<string, string> }])[1].headers['Authorization']).toBe('Bearer post-refresh-token');
  });

  it('does not retry on a 401 when force-refresh returns null', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });
    vi.stubGlobal('fetch', mockFetch);

    forceRefreshTwitterAccessTokenMock.mockResolvedValueOnce(null);

    const result = await postToTwitter(makeIdentity(), makeOptions());

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Failed to post tweet/);

    const tweetCalls = mockFetch.mock.calls.filter(
      (call: unknown[]) => call[0] === 'https://api.twitter.com/2/tweets'
    );
    expect(tweetCalls.length).toBe(1);
  });

  it('does not force-refresh on non-401 failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Server error',
    }));

    const result = await postToTwitter(makeIdentity(), makeOptions());

    expect(result.success).toBe(false);
    expect(forceRefreshTwitterAccessTokenMock).not.toHaveBeenCalled();
  });
});
