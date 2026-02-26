/**
 * GitHub Issues API helpers
 * Resolves token and repo from current user for issue management
 */

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { hasIssuesScope, GITHUB_PROVIDER } from '@/lib/auth/oauth-github';

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_HEADERS = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

export interface GitHubIssuesContext {
  accessToken: string;
  repo: string;
  owner: string;
  repoName: string;
}

export async function getGitHubIssuesContextForUserId(
  userId: string,
  repo: string
): Promise<{ context: GitHubIssuesContext } | { error: string; status: number }> {
  if (!repo || !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repo)) {
    return { error: 'Invalid repository format', status: 400 };
  }

  const identity = await prisma.linkedIdentity.findFirst({
    where: { userId, provider: GITHUB_PROVIDER },
    select: { providerData: true },
  });

  if (!identity?.providerData || typeof identity.providerData !== 'object') {
    return { error: 'GitHub account not linked', status: 400 };
  }

  const data = identity.providerData as { access_token?: string; scopes?: string };
  const token = data.access_token;
  if (!token) {
    return { error: 'GitHub token not found', status: 400 };
  }

  if (!hasIssuesScope(data.scopes)) {
    return { error: 'GitHub connection does not have Issues scope', status: 403 };
  }

  const [owner, repoName] = repo.split('/');
  return {
    context: {
      accessToken: token,
      repo,
      owner,
      repoName,
    },
  };
}

export async function getGitHubIssuesContext(
  repoParam?: string | null,
  options?: { requireRepo?: boolean }
): Promise<{ context: GitHubIssuesContext } | { error: string; status: number }> {
  const requireRepo = options?.requireRepo !== false;
  const user = await getCurrentUser();
  if (!user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const identity = await prisma.linkedIdentity.findFirst({
    where: { userId: user.id, provider: GITHUB_PROVIDER },
    select: { providerData: true },
  });

  if (!identity?.providerData || typeof identity.providerData !== 'object') {
    return { error: 'GitHub account not linked', status: 400 };
  }

  const data = identity.providerData as { access_token?: string; scopes?: string };
  const token = data.access_token;
  if (!token) {
    return { error: 'GitHub token not found', status: 400 };
  }

  if (!hasIssuesScope(data.scopes)) {
    return { error: 'GitHub connection does not have Issues scope. Reconnect for GitHub Issues in Settings.', status: 403 };
  }

  if (!requireRepo) {
    return {
      context: {
        accessToken: token,
        repo: '',
        owner: '',
        repoName: '',
      },
    };
  }

  const userWithRepo = await prisma.user.findUnique({
    where: { id: user.id },
    select: { githubDefaultRepo: true },
  });
  const repo = repoParam?.trim() || userWithRepo?.githubDefaultRepo?.trim();
  if (!repo || !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repo)) {
    return { error: 'Repository required. Set default repo in Settings or pass repo parameter (owner/repo).', status: 400 };
  }

  const [owner, repoName] = repo.split('/');
  return {
    context: {
      accessToken: token,
      repo,
      owner,
      repoName,
    },
  };
}

export function githubFetch(
  path: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = path.startsWith('http') ? path : `${GITHUB_API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      ...GITHUB_HEADERS,
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers as Record<string, string>),
    },
  });
}
