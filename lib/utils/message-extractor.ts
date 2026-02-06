/**
 * Message Text Extraction Utility
 * Extracts subject and verb from message content for use as list names
 */

import nlp from 'compromise';

const MAX_NAME_LENGTH = 50;

/**
 * Extracts a list name from message content using NLP
 * Attempts to extract subject and verb, falls back to first few words
 */
export function extractListNameFromMessage(messageContent: string): string {
  if (!messageContent || typeof messageContent !== 'string') {
    return '';
  }

  // Clean the message content
  const cleaned = messageContent.trim();
  
  if (cleaned.length === 0) {
    return '';
  }

  // Remove URLs and links (basic pattern)
  const withoutUrls = cleaned.replace(/https?:\/\/[^\s]+/g, '').trim();
  
  if (withoutUrls.length === 0) {
    return '';
  }

  try {
    // Parse with compromise
    const doc = nlp(withoutUrls);
    
    // Try to extract subject and verb
    const subjects = doc.match('#Noun+').out('array');
    const verbs = doc.match('#Verb+').out('array');
    
    // Get the first sentence for better extraction
    const firstSentence = doc.sentences().first();
    if (firstSentence) {
      const sentenceDoc = nlp(firstSentence.text());
      const sentenceSubjects = sentenceDoc.match('#Noun+').out('array');
      const sentenceVerbs = sentenceDoc.match('#Verb+').out('array');
      
      // Prefer sentence-level extraction
      if (sentenceSubjects.length > 0 && sentenceVerbs.length > 0) {
        const subject = sentenceSubjects[0];
        const verb = sentenceVerbs[0];
        
        // Format as "Subject Verb"
        const name = `${subject} ${verb}`;
        return truncateAndCapitalize(name);
      }
    }
    
    // Fallback: use first subject and verb from entire message
    if (subjects.length > 0 && verbs.length > 0) {
      const subject = subjects[0];
      const verb = verbs[0];
      const name = `${subject} ${verb}`;
      return truncateAndCapitalize(name);
    }
    
    // Fallback: use first few words
    const words = withoutUrls.split(/\s+/).filter(w => w.length > 0);
    if (words.length > 0) {
      // Take first 2-4 words, depending on length
      const wordCount = Math.min(words.length, words.length <= 2 ? 2 : 4);
      const name = words.slice(0, wordCount).join(' ');
      return truncateAndCapitalize(name);
    }
  } catch (error) {
    // If NLP parsing fails, fall back to first few words
    console.warn('Failed to extract subject/verb from message:', error);
    const words = withoutUrls.split(/\s+/).filter(w => w.length > 0);
    if (words.length > 0) {
      const wordCount = Math.min(words.length, 4);
      const name = words.slice(0, wordCount).join(' ');
      return truncateAndCapitalize(name);
    }
  }
  
  // Ultimate fallback: return empty string (will use default generated name)
  return '';
}

/**
 * Truncates and capitalizes a name string
 */
function truncateAndCapitalize(name: string): string {
  if (!name) return '';
  
  // Capitalize first letter of each word
  const capitalized = name
    .split(/\s+/)
    .map(word => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
  
  // Truncate if too long
  if (capitalized.length > MAX_NAME_LENGTH) {
    // Try to truncate at word boundary
    const truncated = capitalized.substring(0, MAX_NAME_LENGTH);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > MAX_NAME_LENGTH * 0.7) {
      // If we can truncate at a word boundary without losing too much
      return truncated.substring(0, lastSpace) + '...';
    }
    return truncated + '...';
  }
  
  return capitalized;
}
