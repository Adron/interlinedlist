import { NextRequest, NextResponse } from 'next/server';
import { getGitHubIssuesContext, githubFetch } from '@/lib/github/issues';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string; number: string }> }
) {
  const { owner: ownerParam, repo: repoParam, number } = await params;
  const repo = `${ownerParam}/${repoParam}`;

  const body = await request.json().catch(() => ({}));
  const { labels, assignees } = body;

  const result = await getGitHubIssuesContext(repo);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { context } = result;
  const payload: Record<string, unknown> = {};
  if (Array.isArray(labels)) {
    payload.labels = labels.filter((l: unknown) => typeof l === 'string');
  }
  if (Array.isArray(assignees)) {
    payload.assignees = assignees.filter((a: unknown) => typeof a === 'string');
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: 'labels or assignees required' }, { status: 400 });
  }

  const path = `/repos/${context.owner}/${context.repoName}/issues/${number}`;
  const res = await githubFetch(path, context.accessToken, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: data.message || 'Failed to update issue' },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
