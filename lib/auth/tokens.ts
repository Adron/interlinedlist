import crypto from 'crypto';

/**
 * Generate a cryptographically secure random token for password reset
 * @returns A URL-safe base64 encoded token
 */
export function generatePasswordResetToken(): string {
  // Generate 32 random bytes (256 bits) and convert to base64url
  const token = crypto.randomBytes(32).toString('base64url');
  return token;
}

/**
 * Check if a token has expired
 * @param expiresAt The expiration date/time
 * @returns true if expired, false otherwise
 */
export function isTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) {
    return true;
  }
  return new Date() > expiresAt;
}

/**
 * Get expiration date for a password reset token (1 hour from now)
 * @returns Date object representing expiration time
 */
export function getTokenExpiration(): Date {
  const expiration = new Date();
  expiration.setHours(expiration.getHours() + 1); // 1 hour from now
  return expiration;
}

/**
 * Generate a cryptographically secure random token for email verification
 * @returns A URL-safe base64 encoded token
 */
export function generateEmailVerificationToken(): string {
  // Generate 32 random bytes (256 bits) and convert to base64url
  const token = crypto.randomBytes(32).toString('base64url');
  return token;
}

/**
 * Get expiration date for an email verification token (24 hours from now)
 * @returns Date object representing expiration time
 */
export function getEmailVerificationExpiration(): Date {
  const expiration = new Date();
  expiration.setHours(expiration.getHours() + 24); // 24 hours from now
  return expiration;
}

