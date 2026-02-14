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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/39b03427-0fde-45ae-9ce7-7e7f4ee5aa45',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'oauth-bluesky-stores.ts:stateStore.set',message:'OAuth state stored',data:{key,storeSize:stateStore.size},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
  },
  async get(key: string): Promise<NodeSavedState | undefined> {
    const v = stateStore.get(key);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/39b03427-0fde-45ae-9ce7-7e7f4ee5aa45',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'oauth-bluesky-stores.ts:stateStore.get',message:'OAuth state retrieved',data:{key,found:!!v,storeSize:stateStore.size},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    return v;
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
