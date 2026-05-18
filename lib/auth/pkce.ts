import { createHash, randomBytes } from "crypto";

/** Generate a cryptographically random code verifier (43–128 chars, base64url). */
export function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

/** Derive the S256 code challenge from a verifier. */
export function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

/** Verify that a received verifier matches the stored challenge. */
export function verifyCodeChallenge(verifier: string, challenge: string): boolean {
  return generateCodeChallenge(verifier) === challenge;
}

/**
 * Return the list of redirect URIs that are allowed for OAuth callbacks.
 * Reads OAUTH_ALLOWED_REDIRECT_URIS env var (comma-separated).
 * Always includes the canonical web callback as a fallback.
 */
export function getAllowedRedirectUris(): string[] {
  const env = process.env.OAUTH_ALLOWED_REDIRECT_URIS ?? "";
  const fromEnv = env.split(",").map((u) => u.trim()).filter(Boolean);
  return fromEnv.length > 0 ? fromEnv : ["https://interlinedlist.com/oauth/callback"];
}

/** Validate that a redirect_uri is in the allowlist. */
export function isAllowedRedirectUri(uri: string): boolean {
  return getAllowedRedirectUris().includes(uri);
}

/** Return true if the redirect_uri uses a custom scheme (mobile app). */
export function isMobileRedirectUri(uri: string): boolean {
  try {
    const url = new URL(uri);
    return url.protocol !== "https:" && url.protocol !== "http:";
  } catch {
    return false;
  }
}
