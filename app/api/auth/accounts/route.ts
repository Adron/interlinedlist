import { NextResponse } from 'next/server';
import { getCurrentUser, getCachedAccounts } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accounts = await getCachedAccounts();
    return NextResponse.json({
      accounts,
      currentUserId: user.id,
    });
  } catch (error) {
    console.error('Get accounts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
