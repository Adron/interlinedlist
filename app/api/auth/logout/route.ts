import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, deleteAllSessions } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const all = url.searchParams.get('all') === 'true';
    const body = await request.json().catch(() => ({}));
    const logoutAll = all || body.all === true;

    if (logoutAll) {
      await deleteAllSessions();
    } else {
      await deleteSession();
    }

    return NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

