import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { HELP_TOPICS, findHelpTopic, getAllHelpTopics, type HelpTopic } from './help-config';

const HELP_DIR = path.join(process.cwd(), 'docs', 'help');

export interface HelpContent {
  slug: string;
  title: string;
  content: string;
}

export interface HelpSearchEntry {
  slug: string;
  title: string;
  /** Markdown stripped to plain text for search matching */
  plain: string;
}

/**
 * Get all valid help slugs from config, including nested children.
 * Nested slugs are returned as path-form strings (e.g. "api/messages").
 */
export function getHelpSlugs(): string[] {
  return getAllHelpTopics().map((t) => t.slug);
}

/**
 * Get help content for a given slug.
 * Returns null if slug is invalid or file not found.
 * Slugs may be nested (e.g. "api/messages" → docs/help/api/messages.md).
 * Topics with sourceFile load from that path (relative to process.cwd()).
 */
export function getHelpContent(slug: string): HelpContent | null {
  const topic = findHelpTopic(slug);
  if (!topic) return null;

  const filePath = topic.sourceFile
    ? path.join(process.cwd(), topic.sourceFile)
    : path.join(HELP_DIR, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data: frontmatter, content } = matter(fileContents);

  return {
    slug,
    title: (frontmatter.title as string) || topic.title || slug,
    content,
  };
}

/** Strip markdown syntax to produce plain searchable text. */
function stripMarkdown(md: string): string {
  return md
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) → text
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')     // images → nothing
    .replace(/`{1,3}[^`]*`{1,3}/g, '')        // inline code / fenced code
    .replace(/^```[\s\S]*?^```/gm, '')         // fenced code blocks
    .replace(/#{1,6}\s/g, '')                  // headings
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1') // bold / italic
    .replace(/^[-*+]\s/gm, '')                 // list bullets
    .replace(/^\d+\.\s/gm, '')                 // ordered list numbers
    .replace(/^>\s/gm, '')                     // blockquotes
    .replace(/\n{2,}/g, '\n')                  // collapse blank lines
    .trim();
}

/**
 * Get plain-text search entries for all help topics (including nested children).
 * Safe to call at server render time only (uses fs).
 */
export function getAllHelpSearchEntries(): HelpSearchEntry[] {
  return getAllHelpTopics().flatMap((topic: HelpTopic) => {
    const content = getHelpContent(topic.slug);
    if (!content) return [];
    return [{ slug: topic.slug, title: content.title, plain: stripMarkdown(content.content) }];
  });
}

// Re-export so consumers can use a single import surface.
export { HELP_TOPICS };
