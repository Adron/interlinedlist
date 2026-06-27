# GAP-ENDPOINTS — DOING NOW (execution plan)

Source of work: `GAP-ENDPOINTS-DO-NEXT.md`. This file is the concrete,
ground-truth-verified plan to remedy every gap in that doc. Each gap below
was checked against the **actual route handlers + `lib/**` queries + Prisma
schema** (citations inline), not against the iOS client's assumptions.

**Status:** plan drafted, awaiting go-ahead to start work.
**Last updated:** 2026-06-27.

---

## 0. Scope decisions (confirmed)

| # | Decision |
|---|---|
| 1 | **Under-documented gaps (A, B, C, D, E):** docs truth-pass **+ safe additive contract wins only**. No existing response shape is removed or renamed — iOS keeps working unchanged. Breaking normalizations (C2 pagination, bare PATCH wrapper, D-wrapper unification) are **documented, not changed**. |
| 2 | **Moderation §H / Phase 14:** build the **ship-blocker minimum** now — schema (Block, Report, Mute) + report/block/mute endpoints + **server-side enforcement** in feed/replies/profile/search + a **Community Guidelines page**. **Defer** the web report/block UI and the admin moderation queue to a follow-on (tracked in §Deferred). |
| 3 | **Genuinely-missing endpoints:** implement **B4** (GitHub Bearer), **B6** (tag trending/autocomplete), and **B9** (follow-status fields) this round. **B8** (realtime) stays deferred. |

---

## 1. Ground-truth corrections (myths the DO-NEXT doc carried)

These change the remedy — several gaps are **doc drift**, not contract bugs:

1. **A1** — The `/help/api/public-profiles` *flat* shape (`isPublic, schema, owner, createdAt`) is the **wrong** one. `GET /api/users/{username}/lists/{id}` actually returns **nested** `{ list: { id, title, description, parentId, children }, ancestors: [...] }` and **omits** `isPublic`, `schema`, `properties`, and `owner` (`app/api/users/[username]/lists/[id]/route.ts:29-41`). Remedy = fix the help page to match the handler.
2. **D3** — There is **no field-name mismatch**. The feed object and `POST /api/messages/{id}/metadata` use the **identical** `LinkMetadataItem` shape with `metadata.thumbnail` (not `image`) — verified in `lib/types/index.ts:63-75` and the normalizer in `lib/messages/metadata-fetcher.ts`. Only the *wrapper* differs (`{ message, metadata: { links } }` vs `message.linkMetadata.links`). Remedy = document, dispel the myth; no code change.
3. **D1** — Cross-post result items are **not** `{ platform, success, error }`. They are `{ providerId, instanceName, success, url?, error?, …platform-specific }` and the `crossPostResults` array is **only present when non-empty** (`app/api/messages/route.ts:641-649`; per-platform `lib/<platform>/post-status.ts:8-16`). Remedy = document the real shape.
4. **D2** — `linkedInTargets[].kind` values are `'personal'` | `'orgPage'` (requires `pageId`) | `'personalPage'` (requires `personalPageId`) — **not** `"organization"` (`lib/linkedin/resolve-linkedin-target.ts:14-17`). Remedy = document.
5. **B9** — Self-status returns `{ status: null, isFollowing: false, isPending: false }` (fields are **present**, not omitted), and the real field names are `status` / `isFollowing` / `isPending` — the doc's `following`/`followedBy`/`pendingRequest` **don't exist**, and there's **no reverse `followedBy` at all** (`app/api/follow/[userId]/status/route.ts:36-42`). Remedy = document real fields **and** add a real `followedBy`.
6. **C2** — `GET /api/lists/{id}/watchers/users` is **owner-only** (404 for non-owners; `…/watchers/users/route.ts:29`), not "manager-gated." So C1 (a non-owner cannot discover their own role) is a genuine gap, fixed via `/watchers/me`.
7. **B (PATCH)** — `PATCH /api/messages/{id}` returns the **bare** serialized message object (no `{ data }` wrapper), with a nested `user` (`app/api/messages/[id]/route.ts:204-216`) — inconsistent with `POST` which uses `{ data: message }`. Under decision #1 this is **documented, not changed**.

---

## 2. Workstreams

Six workstreams. Agent routing per `CLAUDE.md` is called out per item. **db-migrations runs before any route work that depends on new schema.**

### WS1 — Documentation truth-pass (docs only)

Goal: every endpoint below documented with its **actual** shape in
`docs/api-reference.md`, then `docs/openapi.json` regenerated. Help pages
under `docs/help/api/*.md` corrected. **Route: `docs-api` skill/agent** for
`api-reference.md`; help-page markdown edited directly (or via `docs-api`).

| Gap | Action | Canonical shape to publish |
|---|---|---|
| **A1** | Rewrite `docs/help/api/public-profiles.md` single-list example + add to `api-reference.md` | `{ list: { id, title, description, parentId, children: [{id,title}] }, ancestors: [{id,title}] }` — note: no `schema`/`properties`/`isPublic`/`owner`. Public, no auth. |
| **A2** | Document data endpoint | `{ rows: [{ id, listId, rowData, rowNumber, createdAt, updatedAt, deletedAt }], pagination: { total, limit, offset, hasMore } }`. `properties`/schema **not** included (see WS2 note). Params: `limit`(≤1000), `offset`, `page`, `sort`, `order`, plus arbitrary `rowData` key filters. |
| **A3** | Document lists endpoint | `{ lists: [FullList + { parent:{id,title}\|null, children:[{id,title}] }], pagination: {total,limit,offset,hasMore} }`. Per-list fields include `title` (not `name`), `parentId`, `isPublic`, `description`, `source`, `githubRepo`. **No `itemCount`** today. |
| **B (no-body)** | Add response bodies for the OpenAPI "no body" rows | `GET /api/organizations` → `{ organizations:[…], pagination }`; `GET /api/user/organizations` → `{ organizations:[…] }`; `PATCH /api/messages/{id}` → **bare** message object `{ …fields, user:{id,username,displayName,avatar} }` (document the no-wrapper reality). |
| **C2** | Document the non-standard pagination explicitly with a ⚠️ note | `GET /api/lists/{id}/watchers/users` → `{ users:[{id,username,displayName,email,avatar}], total, pagination:{limit,offset,hasMore} }` — `total` is a **top-level sibling**, intentionally. Owner-only. |
| **C3** | Document self-watch path | `POST /api/lists/{id}/watchers` body `{ userId?, role? }`; omit `userId` → self-watch (role **ignored**, always `watcher`); response `{ watching:true }`, 201 new / 200 existing. List must be public. |
| **D1** | Document cross-post result shape | `POST /api/messages` → `{ message, data, scheduledAt?, crossPostResults?: [{ providerId, instanceName, success, url?, error?, …platform-specific }] }` (present only when non-empty). |
| **D2** | Document `linkedInTargets` vocabulary | `[{kind:'personal'}]` \| `[{kind:'orgPage', pageId}]` \| `[{kind:'personalPage', personalPageId}]`. |
| **D3** | Document the single `LinkMetadataItem` shape + the two wrappers | Item: `{ url, platform, metadata?:{ thumbnail?, title?, description?, text?, type }, fetchedAt?, fetchStatus }`. Read wrapper: `message.linkMetadata.links[]`. Refresh wrapper: `{ message:<status string>, metadata:{ links:[…] } }`. Same item both places. |
| **F/B8** | Note as deferred (long-term) | Realtime (WS/SSE) explicitly out of scope; APNs covers push. |

### WS2 — Additive contract wins (non-breaking code) — **Route: `nextjs-developer`**

Each is purely additive (new fields alongside existing ones), then reflected in WS1 docs.

| Gap | File(s) | Change |
|---|---|---|
| **B1** | `lib/organizations/queries.ts` (`getUserOrganizations`, `getPublicOrganizations`); `app/api/organizations/route.ts`, `app/api/user/organizations/route.ts` | Add `userRole` (alias of existing per-membership `role`, matching the detail endpoint's field name) **and** `memberCount` (`_count` on members) to each org **list** item. Keep existing `role`/`joinedAt`. Removes the iOS detail-screen re-fetch of `GET /api/organizations/{id}` just to learn role. |
| **C1** | `app/api/lists/[id]/watchers/me/route.ts` | Add `role` (from the caller's `ListWatcher` row, or `null`) and `permissions` derived from role: `watcher → ['read']`, `collaborator → ['read','editRows']`, `manager → ['read','editRows','editSchema']`. Keep `watching`. |
| **E** | `app/api/user/avatar/upload/route.ts`, `app/api/user/avatar/from-url/route.ts` | Return `{ url, user }` (full updated user, same shape as `GET /api/user`) instead of just `{ url }`. Keep `url` for back-compat. Drops the iOS follow-up `GET /api/user`. |
| **A2 (opt-in)** | `app/api/users/[username]/lists/[id]/data/route.ts` | Add `?include=properties` (default off) → include the list's `properties` array so a read-only client can label columns without a second call. Opt-in keeps the default body unchanged. |

### WS3 — Genuinely-missing endpoints — **Route: `nextjs-developer`**

| Gap | Change |
|---|---|
| **B4** | Switch `/api/github/*` from session-only to Bearer-capable. `lib/github/issues.ts:getGitHubIssuesContext()` calls `getCurrentUser()`; change it to accept the `NextRequest` and use `getCurrentUserOrSyncToken(request)`. Thread `request` from all callers: `app/api/github/repos/route.ts`, `app/api/github/issues/route.ts`, `app/api/github/issues/[owner]/[repo]/[number]/route.ts`. Unblocks iOS Phase 11. Add an e2e Bearer-auth assertion. |
| **B6** | New `app/api/tags/trending/route.ts` and `app/api/tags/autocomplete/route.ts`. Aggregate over `Message.tags` (`jsonb`) with `$queryRaw` + `jsonb_array_elements_text`, filtered to `publiclyVisible=true` (and excluding blocked authors once WS4 lands — see enforcement). Trending: top-N over a recent window (e.g. 7d), `{ tags:[{tag,count}] }`. Autocomplete: `?q=` prefix match, `{ tags:[{tag,count}] }`. Both public/read; rate-limited. **Optional** additive migration: GIN index on `messages.tags` for scale. Put logic in a new `lib/tags/queries.ts`. Unblocks Phase 13. |
| **B9** | `app/api/follow/[userId]/status/route.ts`: add `followedBy` (does the **target** follow the **caller**) via a reverse `getFollowStatus(targetId, callerId)` check, plus `isMutual`. Keep `status`/`isFollowing`/`isPending`. Document real fields (corrects the DO-NEXT field-name guesses). |

### WS4 — Moderation / Phase 14 (ship-blocker minimum)

**Step 4a — Schema (route: `db-migrations` agent FIRST).** Add three models +
their virtual back-relations on `User`/`Message` (no columns added to existing
tables). Hand-write idempotent `prisma/migrations/<ts>_moderation/migration.sql`,
apply to **both** DBs (`npm run db:migrate` + `db:migrate:deploy`).

```prisma
model UserBlock {            // A blocks B: mutual content invisibility
  id        String   @id @default(uuid())
  blockerId String
  blockedId String
  createdAt DateTime @default(now())
  blocker   User @relation("BlocksInitiated", fields:[blockerId], references:[id], onDelete: Cascade)
  blocked   User @relation("BlocksReceived",  fields:[blockedId], references:[id], onDelete: Cascade)
  @@unique([blockerId, blockedId])
  @@index([blockerId]) @@index([blockedId])
  @@map("user_blocks")
}

model UserMute {             // A mutes B: one-directional (A stops seeing B)
  id        String   @id @default(uuid())
  muterId   String
  mutedId   String
  createdAt DateTime @default(now())
  muter     User @relation("MutesInitiated", fields:[muterId], references:[id], onDelete: Cascade)
  muted     User @relation("MutesReceived",  fields:[mutedId], references:[id], onDelete: Cascade)
  @@unique([muterId, mutedId])
  @@index([muterId]) @@index([mutedId])
  @@map("user_mutes")
}

model ContentReport {        // report a message or a user
  id              String   @id @default(uuid())
  reporterId      String
  targetType      String   // "message" | "user"
  targetMessageId String?
  targetUserId    String?
  reason          String   // "spam"|"harassment"|"hate"|"violence"|"sexual"|"self_harm"|"ip"|"other"
  detail          String?
  status          String   @default("open")  // "open"|"reviewing"|"actioned"|"dismissed"
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  reporter        User     @relation("ReportsFiled",   fields:[reporterId],      references:[id], onDelete: Cascade)
  targetMessage   Message? @relation(                  fields:[targetMessageId], references:[id], onDelete: SetNull)
  targetUser      User?    @relation("ReportsAgainst", fields:[targetUserId],    references:[id], onDelete: SetNull)
  @@index([status]) @@index([reporterId]) @@index([targetMessageId]) @@index([targetUserId])
  @@map("content_reports")
}
```

Migration SQL = `CREATE TABLE IF NOT EXISTS` for all three, FKs wrapped in
`DO $$ BEGIN … EXCEPTION WHEN duplicate_object THEN NULL; END $$`, indexes via
`CREATE INDEX IF NOT EXISTS`. No `DROP`/destructive `ALTER`.

**Step 4b — Endpoints (route: `nextjs-developer`).** New `lib/moderation/queries.ts`
holds all logic; routes stay thin and use `getCurrentUserOrSyncToken`.

| Endpoint | Body / behavior | Response |
|---|---|---|
| `POST /api/messages/{id}/report` | `{ reason, detail? }`; dedupe one **open** report per reporter+target | `{ reported: true }` |
| `POST /api/users/{id}/report` | `{ reason, detail? }`; can't report self | `{ reported: true }` |
| `POST /api/users/{id}/block` | idempotent; also removes any `Follow` rows in **both** directions | `{ blocked: true }` |
| `DELETE /api/users/{id}/block` | idempotent | `{ blocked: false }` |
| `GET /api/user/blocks` | paginated | `{ blocks: [{ id, user:{id,username,displayName,avatar}, createdAt }], pagination }` |
| `POST /api/users/{id}/mute` | idempotent (optional but included) | `{ muted: true }` |
| `DELETE /api/users/{id}/mute` | idempotent | `{ muted: false }` |
| `GET /api/user/mutes` | paginated | `{ mutes: [{ id, user:{…}, createdAt }], pagination }` |

**Step 4c — Server-side enforcement (route: `nextjs-developer`).** This is the
part Apple actually checks. Add helpers to `lib/moderation/queries.ts`:
`getBlockedUserIds(userId)` (union of both directions — blocker OR blocked) and
`getMutedUserIds(userId)` (one direction). Weave exclusions into the read paths:

- `lib/messages/queries.ts` — `buildMessageWhereClause()` (feed) and
  `buildWallMessageWhereClause()` (profile walls): exclude messages whose author
  is blocked-either-way; exclude muted authors from the home feed.
- Replies/thread fetch, public profile message lists, and **search**
  (`app/api/messages/route.ts` query path): same block exclusion.
- Notifications (`lib/notifications/`): don't create digs/pushes/reply
  notifications from a user the recipient has blocked.
- Public profile / follow endpoints: a blocked user gets 404/empty rather than
  the target's content.

Semantics: **block = bidirectional invisibility + follow severed**; **mute =
caller stops seeing the muted user, muted user is unaffected**.

**Step 4d — Community Guidelines page (route: `nextjs-developer`).** New
`app/community-guidelines/page.tsx` at a stable URL (`/community-guidelines`),
linked from the footer and `app/terms/page.tsx`. Content must satisfy Apple
Guideline 1.2: zero-tolerance statement for objectionable content/abuse, the
report mechanism, the block mechanism, and a commitment to act on reports
(remove content / eject offenders) within 24h. The iOS terms-gate links here.
Confirm the canonical path with product before publishing (vs `/guidelines` or
`/community`).

### WS5 — Docs regeneration & help-page fixes — **Route: `docs-api`**

- After WS2/WS3/WS4 land, update `docs/api-reference.md` with all new/changed
  endpoints (orgs `memberCount`/`userRole`, `/watchers/me` role, avatar `user`,
  github Bearer note, `/api/tags/*`, follow `followedBy`, full moderation
  surface, Community Guidelines URL).
- Fix `docs/help/api/public-profiles.md` (A1 nested shape; remove the wrong flat
  example). Add a moderation help page if a help slug is warranted
  (`lib/help-config.ts`).
- Run `npm run docs:all` to regenerate `docs/openapi.json` (route-generated) and
  the perspective docs; sanity-check the diff.

### WS6 — Tests — **Route: `unit-testing` + `e2e-testing`**

- **Unit (Vitest):** `getBlockedUserIds`/`getMutedUserIds` union logic; tag
  aggregation query shaping; follow `followedBy`/`isMutual` derivation;
  watcher role→permissions mapping.
- **E2E boundary (`tests/e2e/api/*`, keep them green):** auth + IDOR on every
  new route; **block enforcement** spec (blocked user's messages absent from
  feed/replies/profile/search); report dedupe; self-report/self-block rejected;
  GitHub Bearer now accepted (B4); tags endpoints public-readable; avatar
  returns `user`. Match existing `tests/e2e/api/` patterns + seeded users.

---

## 3. Per-gap disposition (every item in DO-NEXT accounted for)

| Ref | Gap | Disposition | WS |
|---|---|---|---|
| A1 | single-list two shapes | Fix help doc to actual nested shape | WS1, WS5 |
| A2 | data row/pagination shape | Document; add opt-in `?include=properties` | WS1, WS2 |
| A3 | lists no body | Document actual `{lists,pagination}` | WS1 |
| B | "no body" (orgs, PATCH msg) | Document; add `userRole`+`memberCount` to org lists | WS1, WS2 |
| B1 | org items lack userRole | Add `userRole`+`memberCount` (additive) | WS2 |
| C1 | `/watchers/me` no role | Add `role`+`permissions` (additive) | WS2 |
| C2 | non-standard pagination | Document with ⚠️ (no change — would be breaking) | WS1 |
| C3 | self-watch semantics | Document (role ignored on self-watch) | WS1 |
| D1 | crosspost result shape | Document real `{providerId,instanceName,success,…}` | WS1 |
| D2 | linkedInTargets vocab | Document `personal`/`orgPage`/`personalPage` | WS1 |
| D3 | "two link-metadata shapes" | Document — they're the same item; only wrapper differs | WS1 |
| E | avatar returns only `{url}` | Return `{url, user}` (additive) | WS2 |
| F/B4 | GitHub session-only | Implement Bearer via `getCurrentUserOrSyncToken` | WS3 |
| F/B6 | no tag discovery | Implement `/api/tags/trending` + `/autocomplete` | WS3 |
| F/B9 | follow self-status fields | Document real fields; add `followedBy`/`isMutual` | WS1, WS3 |
| F/B8 | no realtime | **Deferred** (documented as long-term) | — |
| F/B10 §H | moderation absent | Build schema+endpoints+enforcement+guidelines | WS4 |

---

## 4. Sequencing & agent routing

1. **WS4a** — `db-migrations` agent: moderation schema + idempotent migration, apply to both DBs. *(Blocks WS4b/c.)*
2. **WS2 + WS3 + WS4b/c/d** — `nextjs-developer`: additive wins, missing endpoints, moderation endpoints + enforcement + guidelines page. *(WS2/WS3 are independent of WS4 and can land in parallel.)*
3. **WS6** — `unit-testing` then `e2e-testing`: cover everything new, keep `tests/e2e/api/*` green.
4. **WS1 + WS5** — `docs-api`: write `api-reference.md`, fix help pages, `npm run docs:all`. *(Docs-only items in WS1 can start immediately and in parallel; the additive-field docs finalize after WS2/WS3/WS4 merge.)*
5. Final gate: `npx tsc --noEmit` clean, `npm run lint`, `npm run test`, e2e boundary specs green, `docs:all` diff reviewed.

---

## 5. Deferred (explicitly out of scope this round)

- **Moderation web UI** — report/block buttons + modals on `MessageCard`/profile,
  a "manage blocked/muted users" settings screen.
- **Admin moderation queue** — review `ContentReport`s, take action, audit trail
  (extends `app/admin/*`).
- **B8 realtime** — WebSocket/SSE for feed/notifications.
- **Breaking normalizations** (would require coordinated iOS release): fold
  `/watchers/users` `total` into `pagination`; wrap `PATCH /api/messages/{id}` in
  `{ data }`; unify the metadata refresh wrapper with the read shape.

---

## 6. Definition of done

- Every DO-NEXT gap is either implemented (additive), implemented as new
  endpoint, or documented with its real shape — per §3.
- `docs/openapi.json` + `docs/api-reference.md` + `docs/help/api/*` match the
  handlers (no remaining OpenAPI-vs-help disagreements).
- Moderation: a user can report content/users, block/unblock + mute/unmute,
  blocked users' content is provably gone from feed/replies/profile/search
  (e2e-asserted), and `/community-guidelines` is live and linked.
- `tsc` clean, lint clean, unit + e2e boundary specs green.
- New endpoints carry auth/IDOR (and subscription-403 where applicable) e2e
  assertions matching `tests/e2e/api/*`.

---

## 7. Open confirmations (non-blocking — defaults chosen)

1. **Community Guidelines URL** — defaulting to `/community-guidelines`. OK, or
   prefer `/guidelines` or `/community`? (iOS needs a stable link.)
2. **Mute** — included as a full sibling of block. Keep, or cut to block-only
   for the minimum?
3. **Block scope** — defaulting to *mutual content invisibility + sever follows
   both ways*. Confirm follows should be auto-removed on block (vs left intact).
4. **Tags privacy** — trending/autocomplete aggregate only `publiclyVisible`
   messages and (post-WS4) exclude blocked authors. Confirm that's the intended
   visibility.
