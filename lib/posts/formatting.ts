/**
 * Format mentions in content as links
 */
export function formatMentions(
  content: string,
  mentions: Array<{ mentionedUserId: string; mentionedUser?: { username: string } }>
): string {
  let formatted = content;
  
  mentions.forEach((mention) => {
    const username = mention.mentionedUser?.username || 'unknown';
    const regex = new RegExp(`@${username}\\b`, 'g');
    formatted = formatted.replace(
      regex,
      `<a href="/users/${username}" class="text-indigo-600 hover:text-indigo-500">@${username}</a>`
    );
  });

  return formatted;
}

/**
 * Format hashtags in content as links
 */
export function formatHashtags(
  content: string,
  hashtags: Array<{ hashtag: string }>
): string {
  let formatted = content;
  
  hashtags.forEach((tag) => {
    const regex = new RegExp(`#${tag.hashtag}\\b`, 'gi');
    formatted = formatted.replace(
      regex,
      `<a href="/hashtags/${tag.hashtag}" class="text-indigo-600 hover:text-indigo-500">#${tag.hashtag}</a>`
    );
  });

  return formatted;
}

/**
 * Format timestamp as relative time (e.g., "2 hours ago")
 */
export function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks !== 1 ? 's' : ''} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`;
}

