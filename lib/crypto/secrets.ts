/**
 * Application-layer encryption for secrets stored at rest (e.g. user-provided
 * third-party API keys). AES-256-GCM with a key derived from SECRETS_ENCRYPTION_KEY.
 *
 * Backward compatible & non-breaking:
 *  - encryptSecret() returns ciphertext with an "enc:v1:" prefix.
 *  - If SECRETS_ENCRYPTION_KEY is not configured, encryptSecret() returns the
 *    value unchanged (plaintext) so the app keeps working; set the env var in
 *    production to activate encryption. Values are encrypted on their next write.
 *  - decryptSecret() transparently returns legacy plaintext values (no prefix)
 *    as-is, and decrypts "enc:v1:" values.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const PREFIX = "enc:v1:";
const IV_BYTES = 12; // GCM standard nonce length

function getKey(): Buffer | null {
  const raw = process.env.SECRETS_ENCRYPTION_KEY;
  if (!raw) return null;
  // Accept any-length secret; derive a stable 32-byte key via SHA-256.
  return createHash("sha256").update(raw, "utf8").digest();
}

/** True once a value has been encrypted by this module. */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

/**
 * Encrypt a secret for storage. Returns null/empty unchanged. If no encryption
 * key is configured, returns the plaintext unchanged (logged once by the caller
 * environment via the warning below).
 */
export function encryptSecret(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined || plaintext === "") return null;
  if (isEncrypted(plaintext)) return plaintext; // already encrypted
  const key = getKey();
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "SECRETS_ENCRYPTION_KEY is not set — storing secret WITHOUT encryption."
      );
    }
    return plaintext;
  }
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString("base64");
}

/**
 * Decrypt a stored secret. Legacy plaintext (no prefix) is returned unchanged.
 * Returns null for null/empty input. Throws if a prefixed value cannot be
 * decrypted (tampering or missing/incorrect key).
 */
export function decryptSecret(stored: string | null | undefined): string | null {
  if (stored === null || stored === undefined || stored === "") return null;
  if (!isEncrypted(stored)) return stored; // legacy plaintext
  const key = getKey();
  if (!key) throw new Error("SECRETS_ENCRYPTION_KEY is required to decrypt this value");
  const buf = Buffer.from(stored.slice(PREFIX.length), "base64");
  const iv = buf.subarray(0, IV_BYTES);
  const tag = buf.subarray(IV_BYTES, IV_BYTES + 16);
  const data = buf.subarray(IV_BYTES + 16);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
