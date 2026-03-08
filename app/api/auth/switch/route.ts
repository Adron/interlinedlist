import { NextRequest, NextResponse } from 'next/server';
import { switchSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const success = await switchSession(userId);
    if (!success) {
      return NextResponse.json(
        { error: 'Cannot switch to that account' },
        { status: 401 }
      );
    }

    return NextResponse.json({ message: 'Switched successfully' });
  } catch (error) {
    console.error('Switch account error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
