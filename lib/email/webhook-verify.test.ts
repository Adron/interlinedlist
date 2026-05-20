import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { verifyResendWebhook } from "./webhook-verify";
import type { SvixHeaders } from "./webhook-verify";

// Raw base64-encoded secret (no prefix) and whsec_ variant
const RAW_SECRET = Buffer.from("super-secret-test-bytes").toString("base64");
const WHSEC = `whsec_${RAW_SECRET}`;

/**
 * Build a set of Svix headers with a valid HMAC-SHA256 signature.
 * offsetSeconds shifts the timestamp forward/backward for staleness tests.
 */
function buildHeaders(
  payload: string,
  secret: string,
  msgId = "msg_test_001",
  offsetSeconds = 0
): { headers: SvixHeaders } {
  const ts = String(Math.floor(Date.now() / 1000) + offsetSeconds);
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const toSign = `${msgId}.${ts}.${payload}`;
  const sig = createHmac("sha256", secretBytes).update(toSign).digest("base64");
  return {
    headers: {
      "svix-id": msgId,
      "svix-timestamp": ts,
      "svix-signature": `v1,${sig}`,
    },
  };
}

const PAYLOAD = JSON.stringify({ event: "email.delivered" });

describe("verifyResendWebhook", () => {
  it("accepts a valid request signed with whsec_ prefixed secret", () => {
    const { headers } = buildHeaders(PAYLOAD, WHSEC);
    expect(verifyResendWebhook(PAYLOAD, headers, WHSEC)).toEqual({ valid: true });
  });

  it("accepts a valid request signed with raw base64 secret (no prefix)", () => {
    const { headers } = buildHeaders(PAYLOAD, RAW_SECRET);
    expect(verifyResendWebhook(PAYLOAD, headers, RAW_SECRET)).toEqual({ valid: true });
  });

  it("rejects when svix-id header is missing", () => {
    const { headers } = buildHeaders(PAYLOAD, WHSEC);
    const result = verifyResendWebhook(PAYLOAD, { ...headers, "svix-id": null }, WHSEC);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/Missing/);
  });

  it("rejects when svix-timestamp header is missing", () => {
    const { headers } = buildHeaders(PAYLOAD, WHSEC);
    const result = verifyResendWebhook(PAYLOAD, { ...headers, "svix-timestamp": null }, WHSEC);
    expect(result.valid).toBe(false);
  });

  it("rejects when svix-signature header is missing", () => {
    const { headers } = buildHeaders(PAYLOAD, WHSEC);
    const result = verifyResendWebhook(PAYLOAD, { ...headers, "svix-signature": null }, WHSEC);
    expect(result.valid).toBe(false);
  });

  it("rejects a non-numeric timestamp", () => {
    const { headers } = buildHeaders(PAYLOAD, WHSEC);
    const result = verifyResendWebhook(
      PAYLOAD,
      { ...headers, "svix-timestamp": "not-a-number" },
      WHSEC
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/Invalid/);
  });

  it("rejects a stale timestamp older than 5 minutes", () => {
    // Timestamp is 400 seconds in the past — beyond the 300 s tolerance
    const { headers } = buildHeaders(PAYLOAD, WHSEC, "msg_test_001", -400);
    const result = verifyResendWebhook(PAYLOAD, headers, WHSEC);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/too old/);
  });

  it("accepts a timestamp within the 5-minute tolerance window", () => {
    // Timestamp is 250 seconds in the past — within the 300 s window
    const { headers } = buildHeaders(PAYLOAD, WHSEC, "msg_test_001", -250);
    expect(verifyResendWebhook(PAYLOAD, headers, WHSEC).valid).toBe(true);
  });

  it("rejects when the signature does not match", () => {
    const { headers } = buildHeaders(PAYLOAD, WHSEC);
    const tampered = { ...headers, "svix-signature": "v1,YWJjZGVmZ2g=" };
    expect(verifyResendWebhook(PAYLOAD, tampered, WHSEC).valid).toBe(false);
  });

  it("rejects when the payload has been tampered with", () => {
    const { headers } = buildHeaders(PAYLOAD, WHSEC);
    expect(verifyResendWebhook('{"event":"email.bounced"}', headers, WHSEC).valid).toBe(false);
  });

  it("rejects when the wrong secret is used", () => {
    const wrongSecret = Buffer.from("wrong-secret").toString("base64");
    const { headers } = buildHeaders(PAYLOAD, WHSEC);
    expect(verifyResendWebhook(PAYLOAD, headers, wrongSecret).valid).toBe(false);
  });

  it("accepts request when the valid signature is the second entry (key rotation)", () => {
    const { headers } = buildHeaders(PAYLOAD, WHSEC);
    // Prepend a dummy old signature (different byte length so length check fails for the old one)
    const oldSig = "v1,YWJjZGVmZ2hpamtsbW5vcA=="; // "abcdefghijklmnop" base64 = 16 bytes
    const multiSig = `${oldSig} ${headers["svix-signature"]}`;
    expect(
      verifyResendWebhook(PAYLOAD, { ...headers, "svix-signature": multiSig }, WHSEC).valid
    ).toBe(true);
  });

  it("returns reason string on failure", () => {
    const { headers } = buildHeaders(PAYLOAD, WHSEC);
    const result = verifyResendWebhook(PAYLOAD, { ...headers, "svix-signature": "v1,bad" }, WHSEC);
    expect(result.valid).toBe(false);
    expect(typeof result.reason).toBe("string");
  });
});