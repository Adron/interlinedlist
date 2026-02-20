/**
 * Help documentation topic configuration.
 * Defines the ordered list of topics for the Help sidebar.
 * Use sourceFile to load from a different path (e.g. documentation/tooling/).
 */
export const HELP_TOPICS = [
  { slug: 'getting-started', title: 'Getting Started' },
  { slug: 'lists', title: 'Lists' },
  { slug: 'messages', title: 'Messages' },
  { slug: 'people', title: 'People' },
  { slug: 'organizations', title: 'Organizations' },
  { slug: 'documents', title: 'Documents' },
  { slug: 'export', title: 'Exporting Data' },
  { slug: 'settings', title: 'Settings' },
  { slug: 'account', title: 'Account & Security' },
  { slug: 'tooling', title: 'Tooling (CLI)', sourceFile: 'documentation/tooling/overview.md' },
  { slug: 'local-testing', title: 'Local Testing (CLI)', sourceFile: 'documentation/tooling/local-testing.md' },
] as const;

export type HelpSlug = (typeof HELP_TOPICS)[number]['slug'];

/** Get all help topics for navigation. Safe to use in client components. */
export function getHelpTopics() {
  return HELP_TOPICS;
}
