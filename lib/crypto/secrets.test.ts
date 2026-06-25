import { describe, it, expect, afterEach } from "vitest";
import { encryptSecret, decryptSecret, isEncrypted } from "./secrets";

const original = process.env.SECRETS_ENCRYPTION_KEY;
afterEach(() => {
  if (original === undefined) delete process.env.SECRETS_ENCRYPTION_KEY;
  else process.env.SECRETS_ENCRYPTION_KEY = original;
});

describe("secrets encryption", () => {
  it("round-trips a value when a key is configured", () => {
    process.env.SECRETS_ENCRYPTION_KEY = "test-encryption-key";
    const enc = encryptSecret("sk-secret-123");
    expect(enc).not.toBeNull();
    expect(isEncrypted(enc!)).toBe(true);
    expect(enc).not.toContain("sk-secret-123");
    expect(decryptSecret(enc)).toBe("sk-secret-123");
  });

  it("produces different ciphertext each time (random IV) but same plaintext", () => {
    process.env.SECRETS_ENCRYPTION_KEY = "test-encryption-key";
    const a = encryptSecret("same");
    const b = encryptSecret("same");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("same");
    expect(decryptSecret(b)).toBe("same");
  });

  it("returns null/empty unchanged", () => {
    process.env.SECRETS_ENCRYPTION_KEY = "k";
    expect(encryptSecret(null)).toBeNull();
    expect(encryptSecret("")).toBeNull();
    expect(decryptSecret(null)).toBeNull();
  });

  it("passes through plaintext when no key is configured (non-breaking)", () => {
    delete process.env.SECRETS_ENCRYPTION_KEY;
    const v = encryptSecret("plain");
    expect(v).toBe("plain");
    expect(isEncrypted(v!)).toBe(false);
  });

  it("decrypts legacy plaintext (no prefix) as-is", () => {
    process.env.SECRETS_ENCRYPTION_KEY = "k";
    expect(decryptSecret("legacy-plaintext-key")).toBe("legacy-plaintext-key");
  });
});
