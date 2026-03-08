import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, removeSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    await removeSession(userId);
    return NextResponse.json({ message: 'Account removed' });
  } catch (error) {
    console.error('Remove account error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
