/**
 * Centralized password policy for registration and password reset.
 *
 * Length-first (NIST-style) rather than forced character classes: a longer
 * minimum, an upper bound to keep bcrypt cost bounded (bcrypt only considers the
 * first 72 bytes, so very long inputs add no strength), and a small blocklist of
 * the most common weak passwords.
 */

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 200;

const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwertyuiop",
  "qwerty123",
  "letmein123",
  "iloveyou1",
  "admin1234",
  "welcome123",
  "changeme123",
]);

export interface PasswordValidation {
  valid: boolean;
  error?: string;
}

export function validatePassword(password: unknown): PasswordValidation {
  if (typeof password !== "string" || password.length === 0) {
    return { valid: false, error: "Password is required" };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { valid: false, error: `Password must be at most ${MAX_PASSWORD_LENGTH} characters` };
  }
  if (/^(.)\1+$/.test(password)) {
    return { valid: false, error: "Password must not be a single repeated character" };
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { valid: false, error: "Password is too common; choose a stronger one" };
  }
  return { valid: true };
}
