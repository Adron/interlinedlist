import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  verifyCodeChallenge,
  getAllowedRedirectUris,
  isAllowedRedirectUri,
  isMobileRedirectUri,
} from "./pkce";

describe("generateCodeVerifier", () => {
  it("returns a non-empty string", () => {
    expect(generateCodeVerifier().length).toBeGreaterThan(0);
  });

  it("returns only base64url characters", () => {
    expect(generateCodeVerifier()).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("returns different values on successive calls", () => {
    expect(generateCodeVerifier()).not.toBe(generateCodeVerifier());
  });
});

describe("generateCodeChallenge", () => {
  it("is deterministic for the same verifier", () => {
    const v = "fixed-test-verifier";
    expect(generateCodeChallenge(v)).toBe(generateCodeChallenge(v));
  });

  it("returns a non-empty base64url string", () => {
    expect(generateCodeChallenge("any-value")).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("produces different challenges for different verifiers", () => {
    expect(generateCodeChallenge("verifier-a")).not.toBe(generateCodeChallenge("verifier-b"));
  });
});

describe("verifyCodeChallenge", () => {
  it("returns true when verifier matches the stored challenge", () => {
    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);
    expect(verifyCodeChallenge(verifier, challenge)).toBe(true);
  });

  it("returns false when verifier does not match the challenge", () => {
    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);
    expect(verifyCodeChallenge("wrong-verifier", challenge)).toBe(false);
  });

  it("returns false when challenge is empty", () => {
    expect(verifyCodeChallenge("some-verifier", "")).toBe(false);
  });
});

describe("getAllowedRedirectUris", () => {
  const saved = process.env.OAUTH_ALLOWED_REDIRECT_URIS;

  afterEach(() => {
    process.env.OAUTH_ALLOWED_REDIRECT_URIS = saved;
  });

  it("returns the canonical default when env var is not set", () => {
    delete process.env.OAUTH_ALLOWED_REDIRECT_URIS;
    const uris = getAllowedRedirectUris();
    expect(uris).toContain("https://interlinedlist.com/oauth/callback");
  });

  it("returns only the default when env var is empty", () => {
    process.env.OAUTH_ALLOWED_REDIRECT_URIS = "";
    const uris = getAllowedRedirectUris();
    expect(uris).toContain("https://interlinedlist.com/oauth/callback");
  });

  it("parses comma-separated URIs from env var", () => {
    process.env.OAUTH_ALLOWED_REDIRECT_URIS =
      "https://app.example.com/callback,https://staging.example.com/callback";
    const uris = getAllowedRedirectUris();
    expect(uris).toContain("https://app.example.com/callback");
    expect(uris).toContain("https://staging.example.com/callback");
  });

  it("excludes default canonical URI when env var is set", () => {
    process.env.OAUTH_ALLOWED_REDIRECT_URIS = "https://custom.example.com/cb";
    const uris = getAllowedRedirectUris();
    expect(uris).not.toContain("https://interlinedlist.com/oauth/callback");
  });

  it("filters out empty strings from comma-separated env var", () => {
    process.env.OAUTH_ALLOWED_REDIRECT_URIS = "https://example.com/cb,,";
    const uris = getAllowedRedirectUris();
    expect(uris.every((u) => u.length > 0)).toBe(true);
  });
});

describe("isAllowedRedirectUri", () => {
  const saved = process.env.OAUTH_ALLOWED_REDIRECT_URIS;

  beforeEach(() => {
    process.env.OAUTH_ALLOWED_REDIRECT_URIS = "https://myapp.com/callback";
  });

  afterEach(() => {
    process.env.OAUTH_ALLOWED_REDIRECT_URIS = saved;
  });

  it("returns true for an explicitly allowed URI", () => {
    expect(isAllowedRedirectUri("https://myapp.com/callback")).toBe(true);
  });

  it("returns false for a URI not in the allowlist", () => {
    expect(isAllowedRedirectUri("https://evil.com/callback")).toBe(false);
  });

  it("is case-sensitive (different case is rejected)", () => {
    expect(isAllowedRedirectUri("https://MYAPP.com/callback")).toBe(false);
  });
});

describe("isMobileRedirectUri", () => {
  it("returns false for https URIs", () => {
    expect(isMobileRedirectUri("https://example.com/callback")).toBe(false);
  });

  it("returns false for http URIs", () => {
    expect(isMobileRedirectUri("http://localhost/callback")).toBe(false);
  });

  it("returns true for custom-scheme URIs (mobile app)", () => {
    expect(isMobileRedirectUri("myapp://oauth/callback")).toBe(true);
  });

  it("returns true for reverse-domain custom-scheme URIs", () => {
    expect(isMobileRedirectUri("com.example.app:/callback")).toBe(true);
  });

  it("returns false for completely invalid URIs that cannot be parsed", () => {
    expect(isMobileRedirectUri("not a uri at all")).toBe(false);
  });
});