/**
 * Split text for cross-posting to platforms with character limits.
 * Splits by sentence boundaries where possible, adds "🧵 N/M" suffix to each chunk.
 */

const THREAD_SUFFIX_LENGTH = 8; // " 🧵 1/3" to " 🧵 99/99"

const SENTENCE_ENDINGS = /[.!?]\s+/g;

/**
 * Splits content into chunks that fit within charLimit, preferring sentence boundaries.
 * Each chunk (except when only one) gets suffix " 🧵 N/M".
 *
 * @param content - The full text to split
 * @param charLimit - Platform character limit (e.g. 500 for Mastodon, 300 for Bluesky)
 * @returns Array of chunks, each within limit with suffix when threaded
 */
export function splitTextForPlatform(content: string, charLimit: number): string[] {
  const trimmed = content.trim();
  if (!trimmed) return [''];

  const effectiveLimit = charLimit - THREAD_SUFFIX_LENGTH;
  if (effectiveLimit < 20) {
    // Fallback: split by raw character count if limit is very small
    const chunks: string[] = [];
    let remaining = trimmed;
    while (remaining.length > 0) {
      chunks.push(remaining.slice(0, effectiveLimit));
      remaining = remaining.slice(effectiveLimit).trim();
    }
    return addSuffixes(chunks);
  }

  if (trimmed.length <= charLimit) {
    return [trimmed];
  }

  const chunks: string[] = [];
  let remaining = trimmed;

  while (remaining.length > 0) {
    if (remaining.length <= effectiveLimit) {
      chunks.push(remaining.trim());
      break;
    }

    const candidate = remaining.slice(0, effectiveLimit);
    const lastSentenceEnd = findLastSentenceBoundary(candidate);
    const lastSpace = candidate.lastIndexOf(' ');

    let splitIndex: number;
    if (lastSentenceEnd > 0) {
      splitIndex = lastSentenceEnd;
    } else if (lastSpace > 0) {
      splitIndex = lastSpace;
    } else {
      splitIndex = effectiveLimit;
    }

    const chunk = remaining.slice(0, splitIndex).trim();
    if (chunk) chunks.push(chunk);
    remaining = remaining.slice(splitIndex).trim();
  }

  return addSuffixes(chunks);
}

function findLastSentenceBoundary(text: string): number {
  let lastEnd = -1;
  let match: RegExpExecArray | null;
  const re = new RegExp(SENTENCE_ENDINGS.source, 'g');
  while ((match = re.exec(text)) !== null) {
    lastEnd = match.index + match[0].length;
  }
  return lastEnd;
}

function addSuffixes(chunks: string[]): string[] {
  if (chunks.length <= 1) return chunks;
  const total = chunks.length;
  return chunks.map((chunk, i) => `${chunk} 🧵 ${i + 1}/${total}`);
}
