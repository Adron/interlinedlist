/**
 * Cross-post a message to Twitter/X via API v2.
 * Supports threaded posts when content exceeds 280 chars, distributes images (4 per tweet),
 * and uploads video separately (Twitter cannot mix images and video).
 */

const TWITTER_CHAR_LIMIT = 280;
const TWITTER_IMAGES_PER_TWEET = 4;
const TWITTER_MEDIA_UPLOAD_URL = 'https://upload.twitter.com/1.1/media/upload.json';
const TWITTER_TWEETS_URL = 'https://api.twitter.com/2/tweets';
const VIDEO_POLL_INTERVAL_MS = 3000;
const VIDEO_POLL_MAX_MS = 30000;

export interface TwitterProviderData {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

interface LinkedIdentityWithData {
  id: string;
  provider: string;
  providerUsername: string | null;
  providerData: TwitterProviderData | null;
}

export interface CrossPostOptions {
  content: string;
  publiclyVisible: boolean;
  imageUrls?: string[];
  videoUrls?: string[];
}

export interface CrossPostResult {
  providerId: string;
  instanceName: string;
  success: boolean;
  url?: string;
  tweetId?: string;
  tweetIds?: string[];
  error?: string;
}

async function uploadImageToTwitter(
  accessToken: string,
  imageUrl: string
): Promise<string | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    const body = new URLSearchParams({ media_data: base64 });
    const uploadRes = await fetch(TWITTER_MEDIA_UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!uploadRes.ok) {
      console.error('Twitter image upload failed:', await uploadRes.text());
      return null;
    }

    const data = (await uploadRes.json()) as { media_id_string?: string };
    return data.media_id_string ?? null;
  } catch (err) {
    console.error('Twitter image upload error:', err);
    return null;
  }
}

async function uploadVideoToTwitter(
  accessToken: string,
  videoUrl: string
): Promise<string | null> {
  try {
    const res = await fetch(videoUrl);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const totalBytes = arrayBuffer.byteLength;

    // INIT
    const initBody = new URLSearchParams({
      command: 'INIT',
      total_bytes: String(totalBytes),
      media_type: 'video/mp4',
      media_category: 'tweet_video',
    });
    const initRes = await fetch(TWITTER_MEDIA_UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: initBody.toString(),
    });
    if (!initRes.ok) {
      console.error('Twitter video INIT failed:', await initRes.text());
      return null;
    }
    const initData = (await initRes.json()) as { media_id_string?: string };
    const mediaId = initData.media_id_string;
    if (!mediaId) return null;

    // APPEND in 5 MB chunks
    const CHUNK_SIZE = 5 * 1024 * 1024;
    const buffer = Buffer.from(arrayBuffer);
    let segmentIndex = 0;
    for (let offset = 0; offset < totalBytes; offset += CHUNK_SIZE) {
      const chunk = buffer.slice(offset, Math.min(offset + CHUNK_SIZE, totalBytes));
      const appendBody = new URLSearchParams({
        command: 'APPEND',
        media_id: mediaId,
        segment_index: String(segmentIndex),
        media_data: chunk.toString('base64'),
      });
      const appendRes = await fetch(TWITTER_MEDIA_UPLOAD_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: appendBody.toString(),
      });
      if (!appendRes.ok) {
        console.error('Twitter video APPEND failed:', await appendRes.text());
        return null;
      }
      segmentIndex++;
    }

    // FINALIZE
    const finalizeBody = new URLSearchParams({ command: 'FINALIZE', media_id: mediaId });
    const finalizeRes = await fetch(TWITTER_MEDIA_UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: finalizeBody.toString(),
    });
    if (!finalizeRes.ok) {
      console.error('Twitter video FINALIZE failed:', await finalizeRes.text());
      return null;
    }

    interface ProcessingInfo {
      state?: string;
      check_after_secs?: number;
    }
    interface FinalizeData {
      media_id_string?: string;
      processing_info?: ProcessingInfo;
    }
    const finalizeData = (await finalizeRes.json()) as FinalizeData;
    if (!finalizeData.processing_info) {
      return finalizeData.media_id_string ?? null;
    }

    // Poll STATUS until processing complete
    const deadline = Date.now() + VIDEO_POLL_MAX_MS;
    let state = finalizeData.processing_info.state;
    while (state === 'pending' || state === 'in_progress') {
      if (Date.now() >= deadline) {
        console.error('Twitter video processing timeout');
        return null;
      }
      await new Promise((r) => setTimeout(r, VIDEO_POLL_INTERVAL_MS));
      const statusRes = await fetch(
        `${TWITTER_MEDIA_UPLOAD_URL}?command=STATUS&media_id=${mediaId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!statusRes.ok) return null;
      const statusData = (await statusRes.json()) as FinalizeData;
      state = statusData.processing_info?.state;
    }

    return state === 'succeeded' ? mediaId : null;
  } catch (err) {
    console.error('Twitter video upload error:', err);
    return null;
  }
}

async function postTweet(
  accessToken: string,
  text: string,
  mediaIds: string[],
  replyToId?: string
): Promise<{ id: string; url?: string } | null> {
  const body: Record<string, unknown> = { text };
  if (mediaIds.length > 0) {
    body.media = { media_ids: mediaIds };
  }
  if (replyToId) {
    body.reply = { in_reply_to_tweet_id: replyToId };
  }

  const res = await fetch(TWITTER_TWEETS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Twitter post tweet failed:', errText);
    return null;
  }

  const data = (await res.json()) as { data?: { id: string } };
  if (!data.data?.id) return null;
  return { id: data.data.id };
}

export async function postToTwitter(
  identity: LinkedIdentityWithData,
  options: CrossPostOptions
): Promise<CrossPostResult> {
  const providerData = identity.providerData as TwitterProviderData | null;

  if (!providerData?.access_token) {
    return {
      providerId: identity.id,
      instanceName: 'Twitter',
      success: false,
      error: 'Missing Twitter credentials',
    };
  }

  const accessToken = providerData.access_token;
  const handle = identity.providerUsername;

  try {
    const { splitTextForPlatform } = await import('@/lib/crosspost/text-splitter');
    const { distributeMedia } = await import('@/lib/crosspost/media-distributor');
    const { getThreadPostText } = await import('@/lib/crosspost/thread-text');

    const textChunks = splitTextForPlatform(options.content, TWITTER_CHAR_LIMIT);

    // Build media payloads using the same distributor (mastodon path = 4 images/post)
    const rawPayloads = distributeMedia(
      options.imageUrls || [],
      options.videoUrls || [],
      'mastodon'
    );

    // Twitter also allows 4 images per tweet — override IMAGES_PER_POST if needed via rawPayloads
    const mediaPayloads = rawPayloads.map((p) => ({
      images: p.images?.slice(0, TWITTER_IMAGES_PER_TWEET),
      video: p.video,
    }));

    const numPosts = Math.max(textChunks.length, mediaPayloads.length, 1);
    let lastTweetId: string | null = null;
    let firstTweetId: string | undefined;
    const allTweetIds: string[] = [];

    for (let i = 0; i < numPosts; i++) {
      const baseText = (textChunks[i] ?? '').trim() || (mediaPayloads[i] ? '.' : '');
      const text = getThreadPostText(baseText, i, numPosts, TWITTER_CHAR_LIMIT);
      const mediaPayload = mediaPayloads[i];

      const mediaIds: string[] = [];
      if (mediaPayload?.images && mediaPayload.images.length > 0) {
        for (const url of mediaPayload.images) {
          const id = await uploadImageToTwitter(accessToken, url);
          if (id) mediaIds.push(id);
        }
      } else if (mediaPayload?.video) {
        const id = await uploadVideoToTwitter(accessToken, mediaPayload.video);
        if (id) mediaIds.push(id);
      }

      const tweet = await postTweet(
        accessToken,
        text,
        mediaIds,
        lastTweetId ?? undefined
      );

      if (!tweet) {
        return {
          providerId: identity.id,
          instanceName: 'Twitter',
          success: false,
          error: `Failed to post tweet ${i + 1}/${numPosts}`,
        };
      }

      lastTweetId = tweet.id;
      allTweetIds.push(tweet.id);
      if (!firstTweetId) firstTweetId = tweet.id;
    }

    const firstUrl =
      handle && firstTweetId
        ? `https://twitter.com/${handle}/status/${firstTweetId}`
        : undefined;

    return {
      providerId: identity.id,
      instanceName: 'Twitter',
      success: true,
      url: firstUrl,
      tweetId: firstTweetId,
      tweetIds: allTweetIds.length > 0 ? allTweetIds : undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      providerId: identity.id,
      instanceName: 'Twitter',
      success: false,
      error: message,
    };
  }
}
