/**
 * Help documentation topic configuration.
 * Defines the ordered list of topics for the Help sidebar.
 *
 * Markdown sources live under docs/help/{slug}.md unless sourceFile is set.
 * Nested children's slugs are full paths (e.g. "api/messages") so they map
 * directly to URL segments and to docs/help/api/messages.md on disk.
 */

export interface HelpTopic {
  /** Full slug path. For children, include the parent prefix (e.g. "api/messages"). */
  slug: string;
  /** Display title shown in the sidebar and as the page header. */
  title: string;
  /** Optional override of the source markdown path, relative to process.cwd(). */
  sourceFile?: string;
  /** Optional ordered children. Parents with children also render their own page (the landing). */
  children?: HelpTopic[];
}

export const HELP_TOPICS: HelpTopic[] = [
  { slug: 'getting-started', title: 'Getting Started' },
  { slug: 'lists', title: 'Lists' },
  { slug: 'messages', title: 'Messages' },
  { slug: 'cross-posting', title: 'Cross-Platform Syndication' },
  { slug: 'people', title: 'People' },
  { slug: 'organizations', title: 'Organizations' },
  { slug: 'documents', title: 'Documents' },
  { slug: 'export', title: 'Exporting Data' },
  { slug: 'settings', title: 'Settings' },
  { slug: 'account', title: 'Account & Security' },
  {
    slug: 'api',
    title: 'API for Developers',
    children: [
      { slug: 'api/authentication', title: 'Authentication & OAuth' },
      { slug: 'api/users-and-profile', title: 'Users and Profile' },
      { slug: 'api/public-profiles', title: 'Public Profiles' },
      { slug: 'api/messages', title: 'Messages' },
      { slug: 'api/lists', title: 'Lists' },
      { slug: 'api/list-folders', title: 'List Folders' },
      { slug: 'api/documents', title: 'Documents' },
      { slug: 'api/document-folders', title: 'Document Folders' },
      { slug: 'api/following', title: 'Following' },
      { slug: 'api/organizations', title: 'Organizations' },
      { slug: 'api/notifications', title: 'Notifications' },
      { slug: 'api/push-notifications', title: 'Push Notifications' },
      { slug: 'api/exports', title: 'Exports' },
      { slug: 'api/subscriptions', title: 'Stripe Subscriptions' },
      { slug: 'api/github-integration', title: 'GitHub Integration' },
      { slug: 'api/linkedin-integration', title: 'LinkedIn Integration' },
      { slug: 'api/utility-endpoints', title: 'Utility Endpoints' },
      { slug: 'api/administration', title: 'Administration' },
      { slug: 'api/internal-endpoints', title: 'Cron & Webhooks (Internal)' },
    ],
  },
  { slug: 'branding', title: 'Branding & Style Guide' },
];

/** Get all help topics (top-level only) for navigation. Safe to use in client components. */
export function getHelpTopics(): HelpTopic[] {
  return HELP_TOPICS;
}

/** Flatten the topic tree into a single ordered list (parents before their children). */
export function getAllHelpTopics(): HelpTopic[] {
  const out: HelpTopic[] = [];
  const walk = (topics: HelpTopic[]) => {
    for (const t of topics) {
      out.push(t);
      if (t.children?.length) walk(t.children);
    }
  };
  walk(HELP_TOPICS);
  return out;
}

/** Find a topic anywhere in the tree by its full slug. */
export function findHelpTopic(slug: string): HelpTopic | undefined {
  return getAllHelpTopics().find((t) => t.slug === slug);
}
