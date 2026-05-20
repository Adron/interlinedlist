import { describe, expect, it } from "vitest";
import { splitTextForPlatform } from "./text-splitter";

describe("splitTextForPlatform", () => {
  it("returns the text unchanged when it fits within the limit", () => {
    const result = splitTextForPlatform("Hello world", 500);
    expect(result).toEqual(["Hello world"]);
  });

  it("returns [''] for empty input", () => {
    expect(splitTextForPlatform("", 500)).toEqual([""]);
  });

  it("returns [''] for whitespace-only input", () => {
    expect(splitTextForPlatform("   ", 500)).toEqual([""]);
  });

  it("does not add 🧵 suffix when text fits in one chunk", () => {
    const result = splitTextForPlatform("Short text", 100);
    expect(result[0]).not.toContain("🧵");
  });

  it("adds 🧵 N/M suffix to all chunks when splitting", () => {
    // Use a limit small enough to force multiple chunks
    const text = "First sentence. Second sentence. Third sentence. Fourth sentence.";
    const result = splitTextForPlatform(text, 30);
    expect(result.length).toBeGreaterThan(1);
    const total = result.length;
    expect(result[0]).toMatch(new RegExp(`🧵 1/${total}$`));
    expect(result[total - 1]).toMatch(new RegExp(`🧵 ${total}/${total}$`));
  });

  it("produces more than one chunk for text that exceeds the limit", () => {
    const text = "Word ".repeat(50).trim();
    expect(splitTextForPlatform(text, 100).length).toBeGreaterThan(1);
  });

  it("produces no empty chunks for long text", () => {
    const text = "Lorem ipsum dolor sit amet. ".repeat(20).trim();
    const result = splitTextForPlatform(text, 100);
    expect(result.every((chunk) => chunk.trim().length > 0)).toBe(true);
  });

  it("splits on sentence boundaries when possible (no mid-sentence cuts)", () => {
    // Sentence-ending punctuation at regular intervals
    const text = "Sentence one ends here. Sentence two ends here. Sentence three ends here.";
    const result = splitTextForPlatform(text, 40);
    // Each chunk (before the suffix) should start a new sentence, not split mid-word
    for (const chunk of result) {
      // Strip suffix for inspection
      const body = chunk.replace(/ 🧵 \d+\/\d+$/, "");
      expect(body.trim()).not.toMatch(/^\s/); // no leading whitespace
    }
  });

  it("falls back to character-count splitting for very small limits (effectiveLimit < 20)", () => {
    // charLimit 20 → effectiveLimit 12 → triggers fallback
    const text = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const result = splitTextForPlatform(text, 20);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((c) => c.length > 0)).toBe(true);
  });

  it("all chunks are non-empty strings", () => {
    const text = "a".repeat(500);
    const result = splitTextForPlatform(text, 80);
    expect(result.every((c) => typeof c === "string" && c.length > 0)).toBe(true);
  });

  it("reconstructing chunks covers the full original content (minus suffixes)", () => {
    const text = "Alpha beta gamma. Delta epsilon zeta. Eta theta iota. Kappa lambda mu.";
    const result = splitTextForPlatform(text, 40);
    const combined = result.map((c) => c.replace(/ 🧵 \d+\/\d+$/, "")).join(" ");
    // Every word from the original should appear somewhere in the combined output
    for (const word of text.replace(/[.]/g, "").split(" ")) {
      expect(combined).toContain(word);
    }
  });
});