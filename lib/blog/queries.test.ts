import { describe, expect, it } from "vitest";
import { slugify, deriveExcerpt } from "./queries";

describe("slugify", () => {
  it("lowercases and hyphenates a basic title", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("drops punctuation and collapses it to a single hyphen", () => {
    expect(slugify("What Does 'Interlined' Mean?!")).toBe("what-does-interlined-mean");
  });

  it("collapses runs of spaces and underscores into single hyphens", () => {
    expect(slugify("Multiple   spaces_and__underscores")).toBe(
      "multiple-spaces-and-underscores"
    );
  });

  it("does not leave leading or trailing hyphens", () => {
    const result = slugify("  ---Leading & trailing---  ");
    expect(result).toBe("leading-trailing");
    expect(result.startsWith("-")).toBe(false);
    expect(result.endsWith("-")).toBe(false);
  });

  it("is idempotent for an already-slug input", () => {
    expect(slugify("hello-world")).toBe("hello-world");
    expect(slugify(slugify("Hello World"))).toBe("hello-world");
  });

  it("returns an empty string for empty input", () => {
    expect(slugify("")).toBe("");
  });

  it("returns an empty string when the title is all punctuation", () => {
    expect(slugify("!@#$%^&*()")).toBe("");
  });
});

describe("deriveExcerpt", () => {
  it("returns a short single paragraph as-is", () => {
    expect(deriveExcerpt("A short paragraph.")).toBe("A short paragraph.");
  });

  it("strips a leading markdown heading marker from the first block", () => {
    expect(deriveExcerpt("# Heading Title\n\nBody here.")).toBe("Heading Title");
  });

  it("strips multi-level heading markers but preserves inner hashes", () => {
    expect(deriveExcerpt("## Multi ## word heading\n\nnext")).toBe(
      "Multi ## word heading"
    );
  });

  it("skips leading blank lines to the first real paragraph", () => {
    expect(deriveExcerpt("\n\n\n   \n\nReal first paragraph.\n\nsecond.")).toBe(
      "Real first paragraph."
    );
  });

  it("collapses internal whitespace within the first paragraph", () => {
    expect(deriveExcerpt("Lots   of\n  spaces\there.")).toBe("Lots of spaces here.");
  });

  it("truncates a long paragraph to max chars and appends a trailing ellipsis", () => {
    const long = "x".repeat(250);
    const result = deriveExcerpt(long);
    expect(result).toBe(`${long.slice(0, 200)}…`);
    // Ellipsis is appended and NOT counted toward the max budget.
    expect(result.length).toBe(201);
    expect(result.endsWith("…")).toBe(true);
  });

  it("respects a custom max and trims trailing whitespace before the ellipsis", () => {
    const result = deriveExcerpt("word ".repeat(60), 20);
    expect(result).toBe("word word word word…");
    expect(result.endsWith("…")).toBe(true);
  });

  it("does not append an ellipsis when the paragraph is exactly max chars", () => {
    const exact = "y".repeat(20);
    expect(deriveExcerpt(exact, 20)).toBe(exact);
  });

  it("returns an empty string for empty content", () => {
    expect(deriveExcerpt("")).toBe("");
  });
});
