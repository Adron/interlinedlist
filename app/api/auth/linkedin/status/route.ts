import { NextResponse } from 'next/server';
import { getLinkedInRedirectUri, isLinkedInConfigured } from '@/lib/auth/oauth-linkedin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const configured = isLinkedInConfigured();
  const redirectUri = configured ? getLinkedInRedirectUri() : undefined;
  return NextResponse.json({ configured, redirectUri });
}
