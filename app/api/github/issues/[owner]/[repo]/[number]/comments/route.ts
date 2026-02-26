import { NextRequest, NextResponse } from 'next/server';
import { getGitHubIssuesContext, githubFetch } from '@/lib/github/issues';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string; number: string }> }
) {
  const { owner: ownerParam, repo: repoParam, number } = await params;
  const repo = `${ownerParam}/${repoParam}`;

  const body = await request.json().catch(() => ({}));
  const { body: commentBody } = body;

  if (!commentBody || typeof commentBody !== 'string' || !commentBody.trim()) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 });
  }

  const result = await getGitHubIssuesContext(repo);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { context } = result;
  const path = `/repos/${context.owner}/${context.repoName}/issues/${number}/comments`;
  const res = await githubFetch(path, context.accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: commentBody.trim() }),
  });
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: data.message || 'Failed to add comment' },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
