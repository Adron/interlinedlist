import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { getAvailableLinkedInTargets } from '@/lib/linkedin/targets';
import { parseRequestedLinkedInTargets } from '@/lib/linkedin/resolve-linkedin-target';
import type { LinkedInPostingTargetOption } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Builds the user's available LinkedIn targets, each flagged with whether it
 * is enabled for posting. With zero preference rows every available target is
 * enabled (back-compat default for users who never saved preferences).
 */
async function buildTargetsWithEnabled(userId: string): Promise<LinkedInPostingTargetOption[]> {
  const [targets, preferences] = await Promise.all([
    getAvailableLinkedInTargets(userId),
    prisma.linkedInPostingTargetPreference.findMany({
      where: { userId },
      select: { kind: true, pageId: true, personalPageId: true },
    }),
  ]);

  if (preferences.length === 0) {
    return targets.map((t) => ({ ...t, enabled: true }));
  }

  const personalEnabled = preferences.some((p) => p.kind === 'personal');
  const enabledPageIds = new Set(
    preferences
      .filter((p) => p.kind === 'orgPage' && typeof p.pageId === 'string')
      .map((p) => p.pageId as string)
  );
  const enabledPersonalPageIds = new Set(
    preferences
      .filter((p) => p.kind === 'personalPage' && typeof p.personalPageId === 'string')
      .map((p) => p.personalPageId as string)
  );

  return targets.map((t) => ({
    ...t,
    enabled:
      t.kind === 'personal'
        ? personalEnabled
        : t.kind === 'orgPage'
          ? enabledPageIds.has(t.pageId)
          : enabledPersonalPageIds.has(t.personalPageId),
  }));
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const targets = await buildTargetsWithEnabled(user.id);

  return NextResponse.json({ targets });
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const targetsRaw = (body as { targets?: unknown } | null)?.targets;
  if (!Array.isArray(targetsRaw)) {
    return NextResponse.json({ error: 'targets must be an array' }, { status: 400 });
  }

  const parsed = parseRequestedLinkedInTargets(targetsRaw);
  if (!parsed.ok || parsed.targets === undefined) {
    return NextResponse.json({ error: 'Invalid targets' }, { status: 400 });
  }
  const requested = parsed.targets;

  // Validate the requested targets against what the user can actually post to.
  const available = await getAvailableLinkedInTargets(user.id);
  const hasPersonal = available.some((t) => t.kind === 'personal');
  const availablePageIds = new Set(
    available
      .filter((t): t is Extract<typeof t, { kind: 'orgPage' }> => t.kind === 'orgPage')
      .map((t) => t.pageId)
  );
  const availablePersonalPageIds = new Set(
    available
      .filter((t): t is Extract<typeof t, { kind: 'personalPage' }> => t.kind === 'personalPage')
      .map((t) => t.personalPageId)
  );

  for (const target of requested) {
    if (target.kind === 'personal' && !hasPersonal) {
      return NextResponse.json(
        { error: 'Your personal LinkedIn account is not linked' },
        { status: 400 }
      );
    }
    if (target.kind === 'orgPage' && !availablePageIds.has(target.pageId)) {
      return NextResponse.json(
        { error: 'One or more LinkedIn pages are not assigned to you' },
        { status: 400 }
      );
    }
    if (
      target.kind === 'personalPage' &&
      !availablePersonalPageIds.has(target.personalPageId)
    ) {
      return NextResponse.json(
        { error: 'One or more LinkedIn company pages are not available to you' },
        { status: 400 }
      );
    }
  }

  // Replace-all in a transaction; `requested` is already deduped so the
  // unique index (with NULL pageId treated as distinct) cannot double up.
  await prisma.$transaction([
    prisma.linkedInPostingTargetPreference.deleteMany({ where: { userId: user.id } }),
    ...(requested.length > 0
      ? [
          prisma.linkedInPostingTargetPreference.createMany({
            data: requested.map((t) =>
              t.kind === 'personal'
                ? { userId: user.id, kind: 'personal' as const }
                : t.kind === 'orgPage'
                  ? { userId: user.id, kind: 'orgPage' as const, pageId: t.pageId }
                  : {
                      userId: user.id,
                      kind: 'personalPage' as const,
                      personalPageId: t.personalPageId,
                    }
            ),
          }),
        ]
      : []),
  ]);

  const targets = await buildTargetsWithEnabled(user.id);

  return NextResponse.json({ targets });
}
