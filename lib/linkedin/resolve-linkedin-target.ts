import { prisma } from '@/lib/prisma';
import type { LinkedInPostTarget } from './post-status';

/**
 * Per-post LinkedIn destination requested by the client.
 * `pageId` refers to OrgLinkedInPage.id (uuid), not the LinkedIn page ID.
 */
export type RequestedLinkedInTarget =
  | { kind: 'personal' }
  | { kind: 'orgPage'; pageId: string };

/**
 * Validates an untrusted `linkedInTarget` value from a request body or stored
 * Json config. `null`/`undefined` means "no explicit target" and is ok.
 */
export function parseRequestedLinkedInTarget(
  value: unknown
): { ok: true; target: RequestedLinkedInTarget | undefined } | { ok: false } {
  if (value === undefined || value === null) {
    return { ok: true, target: undefined };
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false };
  }
  const { kind, pageId } = value as { kind?: unknown; pageId?: unknown };
  if (kind === 'personal') {
    return { ok: true, target: { kind: 'personal' } };
  }
  if (kind === 'orgPage' && typeof pageId === 'string' && pageId.length > 0) {
    return { ok: true, target: { kind: 'orgPage', pageId } };
  }
  return { ok: false };
}

function isCredentialActive(
  credential: { disconnectedAt: Date | null; expiresAt: Date | null },
  now: Date
): boolean {
  return (
    credential.disconnectedAt === null &&
    (credential.expiresAt === null || credential.expiresAt > now)
  );
}

async function resolvePersonalTarget(userId: string): Promise<LinkedInPostTarget | null> {
  const identity = await prisma.linkedIdentity.findFirst({
    where: { userId, provider: 'linkedin' },
    select: { id: true, providerUserId: true, providerData: true },
  });

  if (!identity) return null;

  const providerData = identity.providerData as { access_token?: string } | null;
  if (!providerData?.access_token) return null;

  return {
    accessToken: providerData.access_token,
    authorUrn: `urn:li:person:${identity.providerUserId}`,
    credentialId: identity.id,
  };
}

/**
 * Resolves which LinkedIn credential and author URN to use for a given user.
 *
 * When `requested` is provided, only that destination is considered:
 * - `personal` — the user's LinkedIdentity; never falls back to an org page.
 * - `orgPage` — the user's assignment to that OrgLinkedInPage with an active
 *   credential; never falls back to the personal identity.
 *
 * Without `requested`, legacy resolution order applies:
 * 1. Active org-level page assignment (org credential + org page URN)
 * 2. User's personal LinkedIdentity for provider="linkedin"
 * 3. null — no LinkedIn credential available
 */
export async function resolveLinkedInTarget(
  userId: string,
  requested?: RequestedLinkedInTarget
): Promise<LinkedInPostTarget | null> {
  const now = new Date();

  if (requested?.kind === 'personal') {
    return resolvePersonalTarget(userId);
  }

  if (requested?.kind === 'orgPage') {
    const assignment = await prisma.orgLinkedInPageAssignment.findFirst({
      where: { userId, pageId: requested.pageId },
      include: {
        page: {
          include: {
            credential: true,
          },
        },
      },
    });

    if (!assignment) return null;

    const { credential } = assignment.page;
    if (!isCredentialActive(credential, now)) return null;

    return {
      accessToken: credential.accessToken,
      authorUrn: `urn:li:organization:${assignment.page.linkedInPageId}`,
      credentialId: credential.id,
    };
  }

  const assignment = await prisma.orgLinkedInPageAssignment.findFirst({
    where: { userId },
    include: {
      page: {
        include: {
          credential: true,
        },
      },
    },
    orderBy: {
      page: {
        credential: {
          connectedAt: 'desc',
        },
      },
    },
  });

  if (assignment) {
    const { credential } = assignment.page;
    if (isCredentialActive(credential, now)) {
      return {
        accessToken: credential.accessToken,
        authorUrn: `urn:li:organization:${assignment.page.linkedInPageId}`,
        credentialId: credential.id,
      };
    }
  }

  return resolvePersonalTarget(userId);
}
