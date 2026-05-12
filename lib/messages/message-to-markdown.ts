import { Message, LinkMetadataItem } from '@/lib/types';
import { formatDateTime } from '@/lib/utils/relativeTime';

function extractTitle(message: Message): string {
  const content = message.content.trim();
  if (content.length > 0) {
    const firstLine = content.split('\n')[0].replace(/^#+\s*/, '').trim();
    if (firstLine.length > 0) {
      return firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine;
    }
  }
  return `Message by @${message.user.username}`;
}

function linkHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function quoteBlock(text: string): string {
  return text
    .trim()
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
}

function renderLinkPreview(link: LinkMetadataItem): string {
  const lines: string[] = [];
  const hostname = linkHostname(link.url);
  const titleSuffix = link.metadata?.title ? ` — ${link.metadata.title}` : '';
  lines.push(`### ${hostname}${titleSuffix}`);
  lines.push('');
  lines.push(`**URL:** ${link.url}`);
  if (link.metadata) {
    const { type, description, text, thumbnail } = link.metadata;
    if (type) lines.push(`**Type:** ${type}`);
    if (description) lines.push(`**Description:** ${description}`);
    if (text) {
      lines.push('');
      lines.push(quoteBlock(text));
    }
    if (thumbnail) {
      lines.push('');
      lines.push(`**Preview image:** ${thumbnail}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

export function buildMessageMarkdown(message: Message): string {
  const author = message.user.displayName
    ? `${message.user.displayName} (@${message.user.username})`
    : `@${message.user.username}`;

  const lines: string[] = [];

  lines.push(`# Message by ${author}`, '');

  // Metadata block
  lines.push(`**Posted:** ${formatDateTime(message.createdAt)}`);
  lines.push(`**Visibility:** ${message.publiclyVisible ? 'Public' : 'Private'}`);
  if (message.tags && message.tags.length > 0) {
    lines.push(`**Tags:** ${message.tags.join(', ')}`);
  }
  if ((message.digCount ?? 0) > 0) lines.push(`**Digs:** ${message.digCount}`);
  if ((message.pushCount ?? 0) > 0) lines.push(`**Pushes:** ${message.pushCount}`);
  lines.push('', '---', '');

  // Message content
  if (message.content.trim()) {
    lines.push(message.content.trim(), '', '---', '');
  }

  // Embedded pushed message
  if (message.pushedMessage) {
    const pm = message.pushedMessage;
    const pmAuthor = pm.user.displayName
      ? `${pm.user.displayName} (@${pm.user.username})`
      : `@${pm.user.username}`;
    lines.push('## Pushed Message', '');
    lines.push(`_Originally posted by ${pmAuthor} on ${formatDateTime(pm.createdAt)}:_`, '');
    if (pm.content.trim()) {
      lines.push(quoteBlock(pm.content.trim()), '');
    }
    if (pm.imageUrls && pm.imageUrls.length > 0) {
      lines.push('**Images in pushed message:**');
      pm.imageUrls.forEach((url) => lines.push(`- ${url}`));
      lines.push('');
    }
    lines.push('---', '');
  }

  // Attached images
  const images = (message.imageUrls ?? []).filter(Boolean);
  if (images.length > 0) {
    lines.push('## Attached Images', '');
    images.forEach((url, i) => lines.push(`${i + 1}. ${url}`));
    lines.push('');
  }

  // Attached video
  const videos = (message.videoUrls ?? []).filter(Boolean);
  if (videos.length > 0) {
    lines.push('## Attached Video', '');
    videos.forEach((url) => lines.push(`- ${url}`));
    lines.push('');
  }

  // Link previews — successful fetches first
  const allLinks = message.linkMetadata?.links ?? [];
  const successLinks = allLinks.filter((l) => l.fetchStatus === 'success' && l.metadata);
  const failedLinks = allLinks.filter((l) => l.fetchStatus !== 'success');

  if (successLinks.length > 0) {
    lines.push('## Link Previews', '');
    for (const link of successLinks) {
      lines.push(renderLinkPreview(link));
    }
  }

  if (failedLinks.length > 0) {
    lines.push('## Links', '');
    failedLinks.forEach((l) => lines.push(`- ${l.url}`));
    lines.push('');
  }

  // Cross-post syndication
  const crossPosts = message.crossPostUrls ?? [];
  if (crossPosts.length > 0) {
    lines.push('## Cross-posted To', '');
    crossPosts.forEach((cp) => lines.push(`- [${cp.instanceName}](${cp.url})`));
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

export function buildMessageDocumentPaths(message: Message): {
  title: string;
  relativePath: string;
} {
  return {
    title: extractTitle(message),
    relativePath: `message-${message.id.slice(0, 8)}.md`,
  };
}
