import { del } from '@vercel/blob';

/**
 * Delete all blob URLs (images and videos) from an array of messages.
 * Failures are swallowed so one failed delete does not block the rest.
 */
export async function deleteBlobsFromMessages(
  messages: Array<{ imageUrls?: unknown; videoUrls?: unknown }>
): Promise<void> {
  const urls: string[] = [];
  for (const m of messages) {
    const imgs = m.imageUrls as string[] | null | undefined;
    const vids = m.videoUrls as string[] | null | undefined;
    if (Array.isArray(imgs)) urls.push(...imgs);
    if (Array.isArray(vids)) urls.push(...vids);
  }
  await Promise.all(urls.map((url) => del(url).catch(() => {})));
}
