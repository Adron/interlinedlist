/**
 * Lightweight fixed-window rate limiter for abuse-sensitive endpoints
 * (login, registration, password reset, verification email).
 *
 * NOTE: this is an in-process limiter. On serverless it is per-instance and
 * best-effort — it raises the cost of brute-force / email-bombing but is not a
 * substitute for a shared store. For production-grade limits back this with
 * Vercel KV / Upstash and swap the implementation behind the same interface.
 */

import type { NextRequest } from "next/server";

interface Counter {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Counter>();
let lastSweep = 0;

function sweep(now: number) {
  // Opportunistic cleanup so the map cannot grow unbounded.
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, counter] of buckets) {
    if (counter.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Record a hit for `key` and report whether it is within `limit` per
 * `windowMs`. Pass a Date.now()-style timestamp; defaults to the current time.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): RateLimitResult {
  sweep(now);
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, remaining: limit - existing.count, retryAfterSeconds: 0 };
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function getClientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Test/maintenance helper. */
export function __resetRateLimitStore() {
  buckets.clear();
  lastSweep = 0;
}
