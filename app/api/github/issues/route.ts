import { NextRequest, NextResponse } from 'next/server';
import { getGitHubIssuesContext, githubFetch } from '@/lib/github/issues';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const repo = searchParams.get('repo');
  const state = searchParams.get('state') || 'open';

  const result = await getGitHubIssuesContext(repo);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { context } = result;
  const path = `/repos/${context.owner}/${context.repoName}/issues?state=${state}`;
  const res = await githubFetch(path, context.accessToken);
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: data.message || 'Failed to list issues' },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { repo, title, body: issueBody, labels, assignees } = body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  const result = await getGitHubIssuesContext(repo);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { context } = result;
  const payload: Record<string, unknown> = {
    title: title.trim(),
    body: typeof issueBody === 'string' ? issueBody : undefined,
  };
  if (Array.isArray(labels) && labels.length > 0) {
    payload.labels = labels.filter((l: unknown) => typeof l === 'string');
  }
  if (Array.isArray(assignees) && assignees.length > 0) {
    payload.assignees = assignees.filter((a: unknown) => typeof a === 'string');
  }

  const path = `/repos/${context.owner}/${context.repoName}/issues`;
  const res = await githubFetch(path, context.accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: data.message || 'Failed to create issue' },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
