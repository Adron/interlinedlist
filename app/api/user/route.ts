import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserOrSyncToken } from '@/lib/auth/sync-token';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserOrSyncToken(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SECURITY: never expose stored secrets to the client. Replace the raw
    // third-party API keys with "is configured" booleans (the UI only needs to
    // know whether a key is set; keys are write-only from the settings page).
    const { openaiApiKey, anthropicApiKey, ...safeUser } = user as typeof user & {
      openaiApiKey?: string | null;
      anthropicApiKey?: string | null;
    };

    return NextResponse.json({
      user: {
        ...safeUser,
        hasOpenaiApiKey: !!openaiApiKey,
        hasAnthropicApiKey: !!anthropicApiKey,
      },
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
