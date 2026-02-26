import { NextRequest, NextResponse } from 'next/server';
import { getGitHubIssuesContext, githubFetch } from '@/lib/github/issues';

export const dynamic = 'force-dynamic';

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
  const res = await githubFetch(`/repos/${context.owner}/${context.repoName}/assignees`, context.accessToken);
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: (data as { message?: string }).message || 'Failed to list assignees' },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
