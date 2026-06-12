import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getAvailableLinkedInTargets } from '@/lib/linkedin/targets';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const targets = await getAvailableLinkedInTargets(user.id);

  return NextResponse.json({ targets });
}
