import { describe, expect, it } from 'vitest';
import {
  extractInstagramUrlsFromText,
  normalizeInstagramUrl,
} from './link-detector';

describe('normalizeInstagramUrl', () => {
  it('strips common tracking params', () => {
    const raw =
      'https://www.instagram.com/reel/ABC123/?igsh=abcd&utm_source=copy_link';
    expect(normalizeInstagramUrl(raw)).not.toContain('utm_source');
    expect(normalizeInstagramUrl(raw)).not.toContain('igsh');
  });
});

describe('extractInstagramUrlsFromText', () => {
  it('dedupes and keeps instagram URLs only', () => {
    const text =
      'See https://instagram.com/reel/X1/ and https://instagram.com/reel/X1/?igsh=1 also bluesky https://bsky.app/profile/x/post/y';
    const urls = extractInstagramUrlsFromText(text);
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain('instagram.com/reel/X1');
  });

  it('trims trailing punctuation from pasted URLs', () => {
    const text =
      '(https://instagram.com/p/ZZZ/)';
    const urls = extractInstagramUrlsFromText(text);
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain('/p/ZZZ');
  });
});
