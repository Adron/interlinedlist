/**
 * Validate post content
 */
export function validatePostContent(content: string): {
  valid: boolean;
  error?: string;
} {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'Post content cannot be empty' };
  }

  if (content.length > 10000) {
    return {
      valid: false,
      error: 'Post content must be less than 10,000 characters',
    };
  }

  return { valid: true };
}

/**
 * Extract @username mentions from content
 */
export function extractMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    const username = match[1];
    if (!mentions.includes(username)) {
      mentions.push(username);
    }
  }

  return mentions;
}

/**
 * Extract #hashtag mentions from content
 */
export function extractHashtags(content: string): string[] {
  const hashtagRegex = /#(\w+)/g;
  const hashtags: string[] = [];
  let match;

  while ((match = hashtagRegex.exec(content)) !== null) {
    const hashtag = match[1].toLowerCase();
    if (!hashtags.includes(hashtag)) {
      hashtags.push(hashtag);
    }
  }

  return hashtags;
}

/**
 * Validate DSL script (placeholder - will be expanded in Phase 5)
 */
export function validateDSLScript(script: string): {
  valid: boolean;
  error?: string;
} {
  if (!script || script.trim().length === 0) {
    return { valid: true }; // DSL script is optional
  }

  if (script.length > 50000) {
    return {
      valid: false,
      error: 'DSL script must be less than 50,000 characters',
    };
  }

  // Basic validation - more will be added in Phase 5
  return { valid: true };
}

