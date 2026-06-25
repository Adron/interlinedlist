import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/test-db
 * Minimal, unauthenticated DB health probe. Intentionally returns no row counts
 * or error details — it only reports whether the database is reachable.
 */
export async function GET() {
  try {
    // Cheap connectivity check; result is not returned to the client.
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok' });
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 503 });
  }
}
