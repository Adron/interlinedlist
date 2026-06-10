import { describe, expect, it } from "vitest";
import { computeContentHash } from "./queries";

describe("computeContentHash", () => {
  it("returns a 64-character lowercase hex string", () => {
    const hash = computeContentHash("hello");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic — same input yields same hash", () => {
    const a = computeContentHash("some content");
    const b = computeContentHash("some content");
    expect(a).toBe(b);
  });

  it("produces different hashes for different inputs", () => {
    const a = computeContentHash("foo");
    const b = computeContentHash("bar");
    expect(a).not.toBe(b);
  });

  it("handles an empty string", () => {
    const hash = computeContentHash("");
    // SHA-256 of empty string is well-known
    expect(hash).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
  });

  it("handles unicode content", () => {
    const hash = computeContentHash("日本語テスト 🎉");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
