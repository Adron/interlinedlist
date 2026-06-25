import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, __resetRateLimitStore } from "./rate-limit";

beforeEach(() => __resetRateLimitStore());

describe("rateLimit", () => {
  it("allows up to the limit then blocks within the window", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit("k", 3, 10_000, t0).allowed).toBe(true);
    }
    const blocked = rateLimit("k", 3, 10_000, t0);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets after the window elapses", () => {
    const t0 = 2_000_000;
    expect(rateLimit("k", 1, 10_000, t0).allowed).toBe(true);
    expect(rateLimit("k", 1, 10_000, t0).allowed).toBe(false);
    // After the window
    expect(rateLimit("k", 1, 10_000, t0 + 10_001).allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    const t0 = 3_000_000;
    expect(rateLimit("a", 1, 10_000, t0).allowed).toBe(true);
    expect(rateLimit("b", 1, 10_000, t0).allowed).toBe(true);
    expect(rateLimit("a", 1, 10_000, t0).allowed).toBe(false);
  });
});
