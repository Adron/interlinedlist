/**
 * Bluesky rich-text link facets for app.bsky.feed.post.
 * Plain URLs in `text` are not clickable; each link needs a facet with UTF-8 byte ranges.
 * @see https://docs.bsky.app/docs/advanced-guides/posting#mentions-and-links
 */

/** Aligned with `lib/messages/link-detector` URL pattern. */
const URL_IN_TEXT_RE = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

export type BlueskyLinkFacet = {
  $type: 'app.bsky.richtext.facet';
  index: { byteStart: number; byteEnd: number };
  features: Array<{ $type: 'app.bsky.richtext.facet#link'; uri: string }>;
};

function facetUriFromMatch(raw: string): string {
  const t = raw.trimEnd();
  return t.startsWith('www.') ? `https://${t}` : t;
}

/**
 * Build link facets for every URL occurrence in `text` (same URL patterns as link-detector).
 * Indices are UTF-8 byte offsets, as required by AT Protocol.
 */
export function buildBlueskyLinkFacets(text: string): BlueskyLinkFacet[] {
  const enc = new TextEncoder();
  const facets: BlueskyLinkFacet[] = [];
  for (const m of text.matchAll(URL_IN_TEXT_RE)) {
    const raw = m[0];
    const start = m.index ?? 0;
    const end = start + raw.length;
    const byteStart = enc.encode(text.slice(0, start)).length;
    const byteEnd = enc.encode(text.slice(0, end)).length;
    facets.push({
      $type: 'app.bsky.richtext.facet',
      index: { byteStart, byteEnd },
      features: [
        {
          $type: 'app.bsky.richtext.facet#link',
          uri: facetUriFromMatch(raw),
        },
      ],
    });
  }
  return facets;
}
