import { describe, expect, it } from "vitest";

// Inlined copy of extractBlueskyError (not exported from post-status.ts).
// Must be kept in sync with the source implementation.
async function extractBlueskyError(
  response: Response
): Promise<{ message: string; errorCode?: string }> {
  const status = response.status;
  const statusText = response.statusText || String(status);
  try {
    const errText = await response.text();
    try {
      const errJson = JSON.parse(errText) as { error?: string; message?: string };
      const errorCode = errJson.error;
      const detail = errJson.message || errText;
      const message = errorCode
        ? `HTTP ${status} (${errorCode})${detail ? `: ${detail}` : ""}`
        : `HTTP ${status} ${statusText}${detail ? `: ${detail}` : ""}`;
      return { message, errorCode };
    } catch {
      const message = errText
        ? `HTTP ${status} ${statusText}: ${errText}`
        : `HTTP ${status} ${statusText}`;
      return { message };
    }
  } catch {
    return { message: `HTTP ${status} ${statusText}` };
  }
}

// Inlined copy of the re-link hint logic from the catch block in postToBluesky.
function buildErrorWithHint(message: string): string {
  const hint =
    message.includes("TokenInvalidError") || message.includes("TokenRevoked")
      ? " — please re-link your Bluesky account in Settings"
      : message.includes("TokenRefreshError")
        ? " — token refresh failed; please re-link your Bluesky account in Settings"
        : "";
  return `${message}${hint}`;
}

function makeResponse(status: number, statusText: string, body: string): Response {
  return new Response(body, { status, statusText });
}

describe("extractBlueskyError", () => {
  it("parses JSON body with both error and message fields", async () => {
    const res = makeResponse(
      401,
      "Unauthorized",
      JSON.stringify({ error: "ExpiredToken", message: "session expired" })
    );
    const result = await extractBlueskyError(res);
    expect(result.errorCode).toBe("ExpiredToken");
    expect(result.message).toBe("HTTP 401 (ExpiredToken): session expired");
  });

  it("parses JSON body with only the error field", async () => {
    const res = makeResponse(
      401,
      "Unauthorized",
      JSON.stringify({ error: "InvalidToken" })
    );
    const result = await extractBlueskyError(res);
    expect(result.errorCode).toBe("InvalidToken");
    expect(result.message).toContain("InvalidToken");
  });

  it("falls back to plain text when body is not JSON", async () => {
    const res = makeResponse(500, "Internal Server Error", "something went wrong");
    const result = await extractBlueskyError(res);
    expect(result.errorCode).toBeUndefined();
    expect(result.message).toBe("HTTP 500 Internal Server Error: something went wrong");
  });

  it("returns bare status line when body is empty", async () => {
    const res = makeResponse(503, "Service Unavailable", "");
    const result = await extractBlueskyError(res);
    expect(result.errorCode).toBeUndefined();
    expect(result.message).toBe("HTTP 503 Service Unavailable");
  });

  it("includes rate-limit error code without hint", async () => {
    const res = makeResponse(
      429,
      "Too Many Requests",
      JSON.stringify({ error: "RateLimitExceeded", message: "slow down" })
    );
    const result = await extractBlueskyError(res);
    expect(result.errorCode).toBe("RateLimitExceeded");
    expect(result.message).toBe("HTTP 429 (RateLimitExceeded): slow down");
  });
});

describe("buildErrorWithHint (re-link hint logic)", () => {
  it("appends re-link hint for TokenInvalidError", () => {
    const out = buildErrorWithHint("TokenInvalidError: bad token");
    expect(out).toContain("please re-link your Bluesky account in Settings");
  });

  it("appends re-link hint for TokenRevoked", () => {
    const out = buildErrorWithHint("TokenRevoked");
    expect(out).toContain("please re-link your Bluesky account in Settings");
  });

  it("appends refresh-failed hint for TokenRefreshError", () => {
    const out = buildErrorWithHint("TokenRefreshError: refresh failed");
    expect(out).toContain("token refresh failed");
    expect(out).toContain("please re-link your Bluesky account in Settings");
  });

  it("appends no hint for generic errors", () => {
    const msg = "Network timeout";
    const out = buildErrorWithHint(msg);
    expect(out).toBe(msg);
  });
});