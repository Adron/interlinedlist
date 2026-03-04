import { NextRequest, NextResponse } from 'next/server';
import { getGitHubIssuesContext, githubFetch } from '@/lib/github/issues';

export const dynamic = 'force-dynamic';

/**
 * GET /api/github/repos/[owner]/[repo]/next-issue-number
 * Returns the next issue number for the repository (max existing + 1, or 1 if no issues).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const { owner, repo } = await params;
  const repoFull = `${owner}/${repo}`;

  const result = await getGitHubIssuesContext(repoFull);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { context } = result;
  const res = await githubFetch(
    `/repos/${context.owner}/${context.repoName}/issues?state=all&per_page=1&sort=created&direction=desc`,
    context.accessToken
  );
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: (data as { message?: string }).message || 'Failed to fetch issues' },
      { status: res.status }
    );
  }

  const items = Array.isArray(data) ? data : [];
  const issues = items.filter((i: { pull_request?: unknown }) => !i.pull_request);
  const maxNumber = issues.length > 0 ? Math.max(...issues.map((i: { number: number }) => i.number)) : 0;
  const nextNumber = maxNumber + 1;

  return NextResponse.json({ nextNumber });
}
