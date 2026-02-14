/**
 * Distribute images and video across multiple post payloads for cross-posting.
 * Mastodon/Bluesky: 4 images per post, 1 video per post, cannot mix.
 */

const IMAGES_PER_POST = 4;

export interface MediaPayload {
  images?: string[];
  video?: string;
}

/**
 * Distributes image and video URLs into separate post payloads.
 * - Images: batched into groups of 4 (platform limit)
 * - Video: gets its own post (cannot mix with images on Mastodon/Bluesky)
 * - Order: image batches first, then video
 *
 * @param imageUrls - Image URLs from InterlinedList (up to 6)
 * @param videoUrls - Video URLs (up to 1)
 * @param _platform - Reserved for future platform-specific behavior
 * @returns Array of payloads, each suitable for one platform post
 */
export function distributeMedia(
  imageUrls: string[],
  videoUrls: string[],
  _platform: 'mastodon' | 'bluesky'
): MediaPayload[] {
  const payloads: MediaPayload[] = [];

  const images = imageUrls || [];
  const video = videoUrls?.[0];

  for (let i = 0; i < images.length; i += IMAGES_PER_POST) {
    payloads.push({ images: images.slice(i, i + IMAGES_PER_POST) });
  }

  if (video) {
    payloads.push({ video });
  }

  return payloads;
}
