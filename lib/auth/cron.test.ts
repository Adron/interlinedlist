/**
 * Tests for cron request authorization (H1).
 *
 * Locks in fail-closed behavior: when CRON_SECRET is unset, NO request is
 * authorized — previously the cron routes executed with no auth at all.
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isAuthorizedCronRequest } from "./cron";

const SECRET = "s3cr3t-cron-value";

function req(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/cron/publish-scheduled-messages", {
    headers,
  });
}

const original = process.env.CRON_SECRET;
afterEach(() => {
  process.env.CRON_SECRET = original;
});

describe("isAuthorizedCronRequest", () => {
  describe("CRON_SECRET unset (fail closed)", () => {
    beforeEach(() => {
      delete process.env.CRON_SECRET;
    });

    it("denies even when a bearer token is supplied", () => {
      expect(isAuthorizedCronRequest(req({ authorization: "Bearer anything" }))).toBe(false);
    });

    it("denies a request with no headers", () => {
      expect(isAuthorizedCronRequest(req())).toBe(false);
    });
  });

  describe("CRON_SECRET set", () => {
    beforeEach(() => {
      process.env.CRON_SECRET = SECRET;
    });

    it("authorizes a correct Bearer token", () => {
      expect(isAuthorizedCronRequest(req({ authorization: `Bearer ${SECRET}` }))).toBe(true);
    });

    it("is case-insensitive on the Bearer scheme", () => {
      expect(isAuthorizedCronRequest(req({ authorization: `bearer ${SECRET}` }))).toBe(true);
    });

    it("denies a wrong token", () => {
      expect(isAuthorizedCronRequest(req({ authorization: "Bearer wrong" }))).toBe(false);
    });

    it("denies a missing Authorization header", () => {
      expect(isAuthorizedCronRequest(req())).toBe(false);
    });

    it("denies when the secret is passed via a spoofed x-vercel-cron header only", () => {
      expect(isAuthorizedCronRequest(req({ "x-vercel-cron": SECRET }))).toBe(false);
    });
  });
});
