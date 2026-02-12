import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export interface PublicIdentity {
  id: string;
  provider: string;
  providerUsername: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
  connectedAt: string;
  lastVerifiedAt: string | null;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const identities = await prisma.linkedIdentity.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      provider: true,
      providerUsername: true,
      profileUrl: true,
      avatarUrl: true,
      connectedAt: true,
      lastVerifiedAt: true,
    },
  });

  const result: PublicIdentity[] = identities.map((i) => ({
    id: i.id,
    provider: i.provider,
    providerUsername: i.providerUsername,
    profileUrl: i.profileUrl,
    avatarUrl: i.avatarUrl,
    connectedAt: i.connectedAt.toISOString(),
    lastVerifiedAt: i.lastVerifiedAt?.toISOString() ?? null,
  }));

  return NextResponse.json({ identities: result });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider');
  if (!provider) {
    return NextResponse.json({ error: 'provider is required' }, { status: 400 });
  }

  const deleted = await prisma.linkedIdentity.deleteMany({
    where: {
      userId: user.id,
      provider,
    },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: 'Identity not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
