/**
 * Extract blob URLs from markdown content for cascade delete.
 * Only returns URLs that match our blob storage domain (e.g. *.blob.vercel-storage.com).
 */

const BLOB_DOMAIN_PATTERN = /blob\.vercel-storage\.com/i;

/**
 * Extract image URLs from markdown content that match our blob domain.
 * Looks for ![alt](url) pattern and filters to blob URLs only.
 */
export function extractBlobUrlsFromMarkdown(content: string): string[] {
  const urls: string[] = [];
  const regex = /!\[[^\]]*\]\((https?:\/\/[^)]+)\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const url = match[1];
    if (BLOB_DOMAIN_PATTERN.test(url)) {
      urls.push(url);
    }
  }
  return [...new Set(urls)];
}
