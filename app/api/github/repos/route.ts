import { NextRequest, NextResponse } from 'next/server';
import { getGitHubIssuesContext, githubFetch } from '@/lib/github/issues';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const result = await getGitHubIssuesContext(null, { requireRepo: false });
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { context } = result;
  const res = await githubFetch('/user/repos?sort=updated&per_page=100', context.accessToken);
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: (data as { message?: string }).message || 'Failed to list repos' },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
