/**
 * Adapter for GitHub-backed lists.
 * Transforms GitHub issues to/from list row format and syncs cache.
 */

import { prisma } from '@/lib/prisma';
import { githubFetch, GitHubIssuesContext } from '@/lib/github/issues';

export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: string;
  labels: Array<{ name: string }>;
  assignees: Array<{ login: string }>;
  html_url: string;
  created_at: string;
  updated_at: string;
}

export interface ListDataRowShape {
  id: string;
  rowData: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

function formatIsoDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
}

export function issueToRow(issue: GitHubIssue): ListDataRowShape {
  const labels = (issue.labels || []).map((l) => l.name).join(',');
  const assignees = (issue.assignees || []).map((a) => a.login).join(',');

  return {
    id: String(issue.number),
    rowData: {
      number: issue.number,
      title: issue.title,
      body: issue.body ?? '',
      state: issue.state,
      labels,
      assignees,
      url: issue.html_url,
      created_at: formatIsoDate(issue.created_at),
      updated_at: formatIsoDate(issue.updated_at),
    },
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
  };
}

export function rowDataToIssuePayload(rowData: Record<string, unknown>): {
  title: string;
  body?: string;
  state?: string;
  labels?: string[];
  assignees?: string[];
} {
  const title = typeof rowData.title === 'string' ? rowData.title.trim() : '';
  const body = typeof rowData.body === 'string' ? rowData.body : undefined;
  const state = typeof rowData.state === 'string' ? rowData.state : undefined;

  let labels: string[] | undefined;
  if (Array.isArray(rowData.labels)) {
    labels = rowData.labels.filter((l): l is string => typeof l === 'string');
  } else if (typeof rowData.labels === 'string' && rowData.labels.trim()) {
    labels = rowData.labels.split(',').map((s) => s.trim()).filter(Boolean);
  }

  let assignees: string[] | undefined;
  if (Array.isArray(rowData.assignees)) {
    assignees = rowData.assignees.filter((a): a is string => typeof a === 'string');
  } else if (typeof rowData.assignees === 'string' && rowData.assignees.trim()) {
    assignees = rowData.assignees.split(',').map((s) => s.trim()).filter(Boolean);
  }

  const payload: { title: string; body?: string; state?: string; labels?: string[]; assignees?: string[] } = {
    title: title || 'Untitled',
  };
  if (body !== undefined) payload.body = body;
  if (state) payload.state = state;
  if (labels && labels.length > 0) payload.labels = labels;
  if (assignees && assignees.length > 0) payload.assignees = assignees;

  return payload;
}

export async function syncListCacheFromGitHub(
  listId: string,
  context: GitHubIssuesContext
): Promise<number> {
  if (!context.repo || !context.owner || !context.repoName) {
    return 0;
  }

  const allIssues: GitHubIssue[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const path = `/repos/${context.owner}/${context.repoName}/issues?state=all&per_page=${perPage}&page=${page}`;
    const res = await githubFetch(path, context.accessToken);
    const data = await res.json();

    if (!res.ok) {
      throw new Error((data as { message?: string }).message || 'Failed to fetch issues');
    }

    const issues = Array.isArray(data) ? data : [];
    if (issues.length === 0) break;

    for (const issue of issues) {
      if (issue.pull_request) continue;
      allIssues.push(issue as GitHubIssue);
    }

    if (issues.length < perPage) break;
    page++;
  }

  const now = new Date();

  for (const issue of allIssues) {
    await prisma.listGitHubIssueCache.upsert({
      where: {
        listId_issueNumber: { listId, issueNumber: issue.number },
      },
      create: {
        listId,
        issueNumber: issue.number,
        issueData: issue as object,
        fetchedAt: now,
      },
      update: {
        issueData: issue as object,
        fetchedAt: now,
      },
    });
  }

  return allIssues.length;
}
