import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { HELP_TOPICS } from './help-config';

const HELP_DIR = path.join(process.cwd(), 'documentation', 'help');

export interface HelpContent {
  slug: string;
  title: string;
  content: string;
}

/**
 * Get all valid help slugs from config.
 */
export function getHelpSlugs(): string[] {
  return HELP_TOPICS.map((t) => t.slug);
}

/**
 * Get help content for a given slug.
 * Returns null if slug is invalid or file not found.
 * Topics with sourceFile load from that path (relative to process.cwd()).
 */
export function getHelpContent(slug: string): HelpContent | null {
  const validSlugs = getHelpSlugs();
  if (!validSlugs.includes(slug)) {
    return null;
  }

  const topic = HELP_TOPICS.find((t) => t.slug === slug);
  const sourceFile = (topic as { sourceFile?: string })?.sourceFile;
  const filePath = sourceFile
    ? path.join(process.cwd(), sourceFile)
    : path.join(HELP_DIR, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data: frontmatter, content } = matter(fileContents);

  return {
    slug,
    title: (frontmatter.title as string) || topic?.title || slug,
    content,
  };
}

