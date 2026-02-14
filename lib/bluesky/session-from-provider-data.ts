/**
 * NodeSavedSessionStore implementation backed by LinkedIdentity.providerData.
 * Used when posting to Bluesky: reads session from providerData, and persists
 * updated session (e.g. after token refresh) back to the database.
 */

import type { NodeSavedSession } from '@atproto/oauth-client-node';
import type { PrismaClient } from '@prisma/client';

export interface BlueskyProviderData {
  did?: string;
  handle?: string;
  tokenSet?: unknown;
  dpopJwk?: unknown;
  authMethod?: string;
}

/**
 * Creates a NodeSavedSessionStore that reads from and writes to the given
 * providerData, persisting updates to the database when set() is called.
 */
export function createProviderDataSessionStore(
  did: string,
  providerData: BlueskyProviderData,
  identityId: string,
  prisma: PrismaClient
): {
  set: (key: string, value: NodeSavedSession) => Promise<void>;
  get: (key: string) => Promise<NodeSavedSession | undefined>;
  del: (key: string) => Promise<void>;
} {
  return {
    async get(key: string): Promise<NodeSavedSession | undefined> {
      if (key !== did) return undefined;
      const { tokenSet, dpopJwk, authMethod } = providerData;
      if (!tokenSet || !dpopJwk) return undefined;
      return {
        tokenSet: tokenSet as NodeSavedSession['tokenSet'],
        dpopJwk: dpopJwk as NodeSavedSession['dpopJwk'],
        authMethod: (authMethod ?? 'legacy') as unknown as NodeSavedSession['authMethod'],
      } as NodeSavedSession;
    },

    async set(key: string, value: NodeSavedSession): Promise<void> {
      if (key !== did) return;
      (providerData as Record<string, unknown>).tokenSet = value.tokenSet;
      (providerData as Record<string, unknown>).dpopJwk = value.dpopJwk;
      (providerData as Record<string, unknown>).authMethod = value.authMethod ?? 'legacy';
      await prisma.linkedIdentity.update({
        where: { id: identityId },
        data: {
          providerData: providerData as object,
        },
      });
    },

    async del(key: string): Promise<void> {
      if (key !== did) return;
      delete (providerData as Record<string, unknown>).tokenSet;
      delete (providerData as Record<string, unknown>).dpopJwk;
      delete (providerData as Record<string, unknown>).authMethod;
      await prisma.linkedIdentity.update({
        where: { id: identityId },
        data: {
          providerData: providerData as object,
        },
      });
    },
  };
}
