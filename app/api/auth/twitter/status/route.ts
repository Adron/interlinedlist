import { NextResponse } from 'next/server';
import { getTwitterRedirectUri, isTwitterConfigured } from '@/lib/auth/oauth-twitter';

export const dynamic = 'force-dynamic';

export async function GET() {
  const configured = isTwitterConfigured();
  const redirectUri = configured ? getTwitterRedirectUri() : undefined;
  return NextResponse.json({ configured, redirectUri });
}
