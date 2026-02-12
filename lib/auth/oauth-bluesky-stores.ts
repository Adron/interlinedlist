/**
 * In-memory stores for Bluesky OAuth state and session.
 * For production with multiple instances, replace with Redis or database.
 */

import type { NodeSavedState, NodeSavedSession } from '@atproto/oauth-client-node';

const stateStore = new Map<string, NodeSavedState>();
const sessionStore = new Map<string, NodeSavedSession>();

export const blueskyStateStore = {
  async set(key: string, value: NodeSavedState) {
    stateStore.set(key, value);
  },
  async get(key: string): Promise<NodeSavedState | undefined> {
    return stateStore.get(key);
  },
  async del(key: string) {
    stateStore.delete(key);
  },
};

export const blueskySessionStore = {
  async set(key: string, value: NodeSavedSession) {
    sessionStore.set(key, value);
  },
  async get(key: string): Promise<NodeSavedSession | undefined> {
    return sessionStore.get(key);
  },
  async del(key: string) {
    sessionStore.delete(key);
  },
};
