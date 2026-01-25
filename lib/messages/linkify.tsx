/**
 * URL linkification utility for React components
 * Converts plain text URLs to clickable links
 */

import React from 'react';

/**
 * URL regex pattern to match URLs in text
 */
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

/**
 * Converts plain text with URLs into React elements with clickable links
 */
export function linkifyText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  
  // Reset regex lastIndex
  URL_REGEX.lastIndex = 0;
  
  while ((match = URL_REGEX.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // Normalize URL
    let url = match[0];
    if (url.startsWith('www.')) {
      url = `https://${url}`;
    }
    
    // Add clickable link
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary text-decoration-none"
        style={{ wordBreak: 'break-all' }}
      >
        {match[0]}
      </a>
    );
    
    lastIndex = URL_REGEX.lastIndex;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : [text];
}
