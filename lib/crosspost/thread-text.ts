/**
 * Compute post text with thread suffixes for cross-posting.
 * - Post 1: base + 🧵 (when numPosts > 1)
 * - Post 2: "..." + 🧵 (if 3+ posts) or "a few more." (if only 2)
 * - Post 3+: "..." or "...🧵" (if room); final post: "a few more."
 */

const THREAD_EMOJI = ' 🧵';
const ELLIPSIS = '...';
const ELLIPSIS_THREAD = '...🧵';
const A_FEW_MORE = 'a few more.';

/**
 * Returns the text for a single post in a cross-post thread, applying
 * thread suffixes based on position and character limit.
 *
 * @param baseText - The base text (from splitText or '.' for media-only)
 * @param postIndex - 0-based index of this post in the thread
 * @param numPosts - Total number of posts in the thread
 * @param charLimit - Platform character limit (e.g. 300 Bluesky, 500 Mastodon)
 */
export function getThreadPostText(
  baseText: string,
  postIndex: number,
  numPosts: number,
  charLimit: number
): string {
  const trimmed = baseText.trim();
  const isPlaceholder = trimmed === '' || trimmed === '.';
  const isLast = postIndex === numPosts - 1;

  if (numPosts <= 1) {
    return trimmed || '.';
  }

  // Placeholder (media-only): use our suffix as the full text
  if (isPlaceholder) {
    if (postIndex === 0) {
      const withSuffix = '.' + THREAD_EMOJI;
      return withSuffix.length <= charLimit ? withSuffix : '.';
    }
    if (postIndex === 1 && numPosts === 2) {
      return A_FEW_MORE;
    }
    if (postIndex === 1 && numPosts > 2) {
      return ELLIPSIS_THREAD.length <= charLimit ? ELLIPSIS_THREAD : ELLIPSIS;
    }
    if (postIndex >= 2) {
      if (isLast) return A_FEW_MORE;
      return ELLIPSIS_THREAD.length <= charLimit ? ELLIPSIS_THREAD : ELLIPSIS;
    }
  }

  // Has content: post 0 gets 🧵 appended if not present
  if (postIndex === 0) {
    if (trimmed.includes('🧵')) return trimmed;
    const withSuffix = trimmed + THREAD_EMOJI;
    return withSuffix.length <= charLimit ? withSuffix : trimmed;
  }

  // Continuation posts with content: keep as-is (splitText already added " 🧵 N/M")
  return trimmed;
}
