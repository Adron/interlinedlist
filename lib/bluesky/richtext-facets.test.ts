import { describe, expect, it } from "vitest";
import { buildBlueskyLinkFacets } from "./richtext-facets";

describe("buildBlueskyLinkFacets", () => {
  it("returns empty array when text contains no URLs", () => {
    expect(buildBlueskyLinkFacets("Hello world, no links here.")).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(buildBlueskyLinkFacets("")).toEqual([]);
  });

  it("detects a single https:// URL", () => {
    const facets = buildBlueskyLinkFacets("Check this out https://example.com today");
    expect(facets).toHaveLength(1);
    expect(facets[0].features[0].uri).toBe("https://example.com");
  });

  it("detects an http:// URL", () => {
    const facets = buildBlueskyLinkFacets("Visit http://example.com for info");
    expect(facets).toHaveLength(1);
  });

  it("prefixes www. URLs with https://", () => {
    const facets = buildBlueskyLinkFacets("Visit www.example.com for more");
    expect(facets).toHaveLength(1);
    expect(facets[0].features[0].uri).toBe("https://www.example.com");
  });

  it("does NOT prefix an already-https www URL", () => {
    const facets = buildBlueskyLinkFacets("Go to https://www.example.com now");
    expect(facets[0].features[0].uri).toBe("https://www.example.com");
    expect(facets[0].features[0].uri).not.toMatch(/^https:\/\/https:/);
  });

  it("detects multiple URLs in one string", () => {
    const facets = buildBlueskyLinkFacets("Go to https://a.com and https://b.com");
    expect(facets).toHaveLength(2);
  });

  it("returns facets with correct $type values", () => {
    const facets = buildBlueskyLinkFacets("https://x.com");
    expect(facets[0].$type).toBe("app.bsky.richtext.facet");
    expect(facets[0].features[0].$type).toBe("app.bsky.richtext.facet#link");
  });

  it("calculates correct byte offsets for ASCII-only text", () => {
    const text = "see https://x.com end";
    const facets = buildBlueskyLinkFacets(text);
    expect(facets).toHaveLength(1);
    const { byteStart, byteEnd } = facets[0].index;
    const enc = new TextEncoder();
    expect(byteStart).toBe(enc.encode("see ").length);
    expect(byteEnd).toBe(enc.encode("see https://x.com").length);
  });

  it("calculates correct byte offsets when a 4-byte emoji precedes the URL", () => {
    // 🎉 is U+1F389 → 4 UTF-8 bytes, but 2 JS code units
    const text = "🎉 https://x.com done";
    const facets = buildBlueskyLinkFacets(text);
    expect(facets).toHaveLength(1);
    // "🎉 " = 4 (emoji) + 1 (space) = 5 bytes
    expect(facets[0].index.byteStart).toBe(5);
  });

  it("byteEnd − byteStart equals the UTF-8 byte length of the URL", () => {
    const url = "https://example.com/path?q=hello";
    const text = `Link: ${url}`;
    const facets = buildBlueskyLinkFacets(text);
    const { byteStart, byteEnd } = facets[0].index;
    const expectedByteLen = new TextEncoder().encode(url).length;
    expect(byteEnd - byteStart).toBe(expectedByteLen);
  });

  it("handles CJK characters before URL with correct byte offsets", () => {
    // Each CJK character is 3 UTF-8 bytes
    const text = "日本 https://example.com";
    const facets = buildBlueskyLinkFacets(text);
    expect(facets).toHaveLength(1);
    // "日本 " = 3 + 3 + 1 = 7 bytes
    expect(facets[0].index.byteStart).toBe(7);
  });
});
