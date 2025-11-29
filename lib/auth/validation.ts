/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate username format
 * - 3-30 characters
 * - Alphanumeric and underscores only
 * - Must start with a letter
 */
export function validateUsername(username: string): {
  valid: boolean;
  error?: string;
} {
  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }

  if (username.length > 30) {
    return { valid: false, error: 'Username must be less than 30 characters' };
  }

  if (!/^[a-zA-Z]/.test(username)) {
    return {
      valid: false,
      error: 'Username must start with a letter',
    };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return {
      valid: false,
      error: 'Username can only contain letters, numbers, and underscores',
    };
  }

  return { valid: true };
}

/**
 * Validate registration input
 */
export function validateRegistrationInput(data: {
  username: string;
  email: string;
  password: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const usernameValidation = validateUsername(data.username);
  if (!usernameValidation.valid) {
    errors.push(usernameValidation.error!);
  }

  if (!validateEmail(data.email)) {
    errors.push('Invalid email format');
  }

  // Password validation will be done separately with strength check

  return {
    valid: errors.length === 0,
    errors,
  };
}
