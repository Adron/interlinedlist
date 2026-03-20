import { appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DEBUG_LOG = join(process.cwd(), '.cursor', 'debug-52f370.log');

function debugLog(data: Record<string, unknown>) {
  try {
    mkdirSync(join(process.cwd(), '.cursor'), { recursive: true });
    appendFileSync(
      DEBUG_LOG,
      JSON.stringify({ sessionId: '52f370', timestamp: Date.now(), hypothesisId: 'H-db', ...data }) + '\n'
    );
  } catch {
    /* ignore */
  }
}

export async function GET() {
  const hasDatabaseUrl = !!process.env.DATABASE_URL;
  const urlHint = process.env.DATABASE_URL
    ? (process.env.DATABASE_URL.includes('pooler') ? 'uses-pooler' : 'direct')
    : 'none';

  try {
    const userCount = await prisma.user.count();

    const payload = {
      success: true,
      message: 'Database connection successful',
      userCount,
      diagnostics: { hasDatabaseUrl, connectionType: urlHint },
    };
    // #region agent log
    debugLog({ location: 'test-db:success', message: 'DB connected', data: payload });
    // #endregion
    return NextResponse.json(payload);
  } catch (error) {
    const err = error as Error & { code?: string; meta?: unknown };
    const errorMessage = err?.message ?? 'Unknown error';
    const prismaCode = err?.code ?? errorMessage.match(/P\d{4}/)?.[0];

    const payload = {
      success: false,
      error: errorMessage,
      diagnostics: {
        hasDatabaseUrl,
        connectionType: urlHint,
        prismaCode: prismaCode || undefined,
      },
    };
    // #region agent log
    debugLog({ location: 'test-db:fail', message: 'DB connection failed', data: payload });
    // #endregion
    return NextResponse.json(payload, { status: 500 });
  }
}

