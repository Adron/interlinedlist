# Tier 1 — Social Graph Foundation: Implementation Plan

**Goal:** Implement all five Tier 1 features (Connection Tags, Connection Groups, Tag & Group Feed Filters, Follow Request UX Overhaul, Mute) in a way that is internally consistent and leaves clean extension points for every Tier 2 feature.

---

## What Already Exists (Do Not Re-implement)

Reading the codebase before planning:

| Layer | What's there |
|-------|-------------|
| `prisma/schema.prisma` | `Follow` model with `id`, `followerId`, `followingId`, `status` ("pending"/"approved"), `createdAt`, `updatedAt`, plus indexes on `[followerId, status]` and `[followingId, status]` |
| `lib/follows/queries.ts` | `followUser`, `unfollowUser`, `removeFollower`, `approveFollowRequest`, `rejectFollowRequest`, `getFollowers`, `getFollowing`, `getFollowStatus`, `getFollowRequests`, `getMutualConnections`, `getMutualFollows`, `getFollowCounts` |
| `app/api/follow/[userId]/` | `POST`/`DELETE` (follow/unfollow), `approve`, `reject`, `remove`, `status`, `counts`, `followers`, `following`, `mutual` |
| `app/api/follow/requests/` | GET pending requests |
| `components/follows/` | `FollowRequests.tsx`, `FollowersList.tsx`, `FollowingList.tsx`, `FollowNavigation.tsx` |
| `app/people/page.tsx` | Server component: stats cards, pending requests, quick action links |
| `lib/messages/queries.ts` | `buildMessageWhereClause(userId, viewingPreference)` — already handles `following_only` by pulling approved follow IDs |
| `lib/notifications/create-user-notification.ts` | `createUserNotification(input)` — ready to use |
| `UserNotification` model | Has `type`, `metadata: Json`, `actionUrl` — extensible for all new notification types |

---

## Open Questions — Need Answers Before Starting

These decisions affect the schema and cannot be changed without a new migration once data is live. Please answer before implementation begins.

### Q1 — Mute storage: boolean on Follow vs. separate Mute table

**Option A — `isMuted Boolean @default(false)` on the existing `Follow` row**
- Simpler: one table, one query.
- Constraint: you can only mute someone you already follow. Muting a non-follower is not possible.
- The Tier 2 Block feature would still need its own table (block doesn't require a follow relationship).

**Option B — Separate `Mute` table (`muterId`, `mutedId`, `createdAt`)**
- Allows muting accounts you do not follow (e.g., someone who follows you is noisy in replies).
- Slightly more complex feed query (join or subquery against a second table).
- Cleaner separation from Block when that is built.

**My recommendation:** Option A for now. The feature spec says "mute a followed account," so the constraint is intentional, and Option A avoids an extra migration for Tier 2. But this is a product call.

> **Decision needed:** Option A or Option B?

---

### Q2 — Connection Tag storage: join table vs. array column

**Option A — `FollowTag` join table (`id`, `followId`, `tag`, `createdAt`)**
- Feed filter becomes a clean `WHERE followerId IN (SELECT followId FROM follow_tags WHERE tag = ?)`.
- Easy to query distinct tags per user.
- One extra migration, one extra table.

**Option B — `tags String[]` on the `Follow` row (PostgreSQL array)**
- No extra table.
- Feed filter requires `WHERE ... ANY(tags) = ?` — valid in Postgres but Prisma handles this with `hasSome` / `has` — slightly less straightforward.
- Cannot store `createdAt` per tag, so tag-level history is lost.

**My recommendation:** Option A (join table). The feed filter query is cleaner, and we'll want the `(followerId, tag)` index for autocomplete queries. But if schema simplicity is preferred, Option B works fine.

> **Decision needed:** Option A or Option B?

---

### Q3 — People page architecture: tabbed client component vs. sub-routes

The current `/people/page.tsx` is a minimal server component (stats + pending requests). The Tier 1 work adds: a following tab (with tags and mute controls), a followers tab, an outgoing requests tab, a muted tab, and a groups sidebar. That is five distinct views.

**Option A — Client-side tabbed layout at `/people`**
- Single URL, tabs switch content in the client.
- State does not survive a page refresh (no deep link to "muted" tab).
- Simpler routing: one page, one server component shell.

**Option B — Sub-routes**
- `/people` — overview (current stats)
- `/people/following` — following list with tags/mute
- `/people/followers` — followers list
- `/people/requests` — outgoing + incoming (overhaul of existing flow)
- `/people/muted` — muted accounts
- `/people/groups` — group management

Each is a server component + lightweight client island. Deep-linkable. Consistent with the app's existing routing pattern (lists, documents, etc. all have sub-routes).

**My recommendation:** Option B (sub-routes). The app already routes followers/following to `/user/[username]/followers` and `/user/[username]/following`. The People page becoming a hub with sub-routes matches that pattern. Groups management especially needs its own page.

> **Decision needed:** Option A or Option B?

---

### Q4 — "Block" button on follow request approval

The Tier 1.4 spec includes a "Block" action on incoming follow requests ("Approve / Decline / Block"). But Block is a Tier 2 feature with its own schema requirements.

**Option A — Omit Block from the request UI for now**
- Simpler Tier 1. Block slots in cleanly as Tier 2 without UI rework.
- "Decline" is sufficient to reject a request.

**Option B — Add a "Block" button on the request card that is wired in Tier 2**
- Placeholder button exists now; it shows a toast "Block is coming soon."
- Cosmetically complete but slightly misleading.

**My recommendation:** Option A. Don't build UI for features that don't work yet. The Tier 1 request card gets: Approve / Decline / (later: Block).

> **Decision needed:** Option A or Option B?

---

### Q5 — Email notification for new follow requests

The Tier 1.4 spec says "email notification for new follow request (opt-in in settings)." The platform uses Resend for email. There is an `EmailLog` model and existing email utilities.

**Option A — Include email notification in Tier 1**
- Adds a new settings toggle ("Notify me by email for new follow requests").
- Sends an email via the existing Resend integration when a follow request is received.
- Requires a new settings field and at least one new email template.

**Option B — Defer email to Tier 2**
- In-app notification (via `createUserNotification`) is sufficient for Tier 1.
- Email is added when the broader notification preferences system is built in Tier 3.

**My recommendation:** Option B. In-app notifications are already wired. Adding email requires a settings field, a new email template, and Resend integration work that is disproportionate to Tier 1. The in-app bell is good enough for launch.

> **Decision needed:** Option A or Option B?

---

## Schema Changes Required

> Note: all migrations must go through `npm run db:migrate` per project convention. No `prisma db push` or raw DDL.

### Migration 1 — Connection Tags

```prisma
model FollowTag {
  id        String   @id @default(uuid())
  followId  String
  tag       String
  createdAt DateTime @default(now())

  follow Follow @relation(fields: [followId], references: [id], onDelete: Cascade)

  @@unique([followId, tag])
  @@index([followId])
  @@map("follow_tags")
}
```

Also add to `Follow`:
```prisma
tags FollowTag[]
```

New index needed on a separate query shape (for autocomplete across all tags a user has applied):
```prisma
// Not a Prisma index — this is a DB-level covering index:
// CREATE INDEX follow_tags_owner_tag ON follow_tags(follow_tags.followId, follow_tags.tag)
// This is handled by the @@unique([followId, tag]) index already.
```

For autocomplete ("all distinct tags this user has used"), the query is:
```ts
SELECT DISTINCT tag FROM follow_tags
WHERE followId IN (
  SELECT id FROM follows WHERE followerId = $userId
)
```
No extra index needed beyond the existing `@@unique([followId, tag])`.

---

### Migration 2 — Connection Groups

```prisma
model ConnectionGroup {
  id          String   @id @default(uuid())
  ownerId     String
  name        String
  description String?  @db.Text
  isPublic    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  owner   User                    @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  members ConnectionGroupMember[]

  @@index([ownerId])
  @@map("connection_groups")
}

model ConnectionGroupMember {
  id      String   @id @default(uuid())
  groupId String
  userId  String   // the followed user who is a member of this group
  addedAt DateTime @default(now())

  group ConnectionGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user  User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([groupId, userId])
  @@index([groupId])
  @@map("connection_group_members")
}
```

Add to `User`:
```prisma
connectionGroups        ConnectionGroup[]
connectionGroupMemberships ConnectionGroupMember[]
```

**Tier 2 prep:** `isPublic` and `description` are already in the schema so Tier 2's public groups feature does not require a migration — only a UI and API change to expose them.

---

### Migration 3 — Mute (if Q1 = Option A)

Add to `Follow`:
```prisma
isMuted   Boolean  @default(false)
mutedAt   DateTime?
```

No new table. The feed query adds `AND isMuted = false` to filter muted follows out of the `followingIds` set.

**Tier 2 prep:** When Block (Tier 2) is implemented, it needs its own `Block` table because blocking does not require a follow relationship. Mute and Block remain independent.

---

## Implementation Sequence

The five features have dependencies. Build in this order:

```
1. Schema migrations (1, 2, 3) → all at once, or sequentially
2. Feature 1.1 — Connection Tags (API + People UI)
3. Feature 1.4 — Follow Request UX Overhaul (depends on tags for "tag at approval")
4. Feature 1.5 — Mute (API + People UI)
5. Feature 1.2 — Connection Groups (API + People UI)
6. Feature 1.3 — Tag & Group Feed Filters (depends on 1.1 and 1.2)
```

Feed filters are last because they need tags and groups to exist and have data.

---

## Feature 1.1 — Connection Tags

### New API routes

```
POST   /api/follow/[userId]/tags          body: { tag: string }   → adds a tag
DELETE /api/follow/[userId]/tags/[tag]                            → removes a tag
GET    /api/follow/[userId]/tags                                   → returns tags for this follow
GET    /api/people/tags                                            → returns all distinct tags the current user has used (for autocomplete)
```

All routes check that `currentUser.id` is the `followerId` of the follow relationship before mutating. Tags are never returned in responses unless `currentUser` is the follower.

### lib changes

Add to `lib/follows/queries.ts`:
```ts
addFollowTag(followerId, followingId, tag): Promise<FollowTag>
removeFollowTag(followerId, followingId, tag): Promise<void>
getFollowTags(followerId, followingId): Promise<string[]>
getDistinctTagsForUser(userId): Promise<string[]>   // for autocomplete
```

`addFollowTag` enforces the max-10-tags-per-follow limit and max-30-chars-per-tag limit server-side.

### UI changes

**People → Following list** (`/people/following` or wherever `FollowingList.tsx` renders):
- Each row gains a tag area below the display name.
- Tags render as small chips (Bootstrap badges, `badge bg-secondary`).
- An "Add tag" `+` button opens an inline `<input>` with datalist autocomplete populated from `GET /api/people/tags`.
- Clicking an existing chip shows a `×` to remove it.
- No modal needed — all inline.

**User profile page** (when the viewer follows the profile owner):
- A collapsible "My connection notes" section in the right sidebar, visible only to the viewer.
- Shows current tags with add/remove controls (same chip pattern).

**Follow confirmation flow:**
- After `POST /api/follow/[userId]` returns `status: approved`, a small dismissible prompt appears below the "Following" button: "Add a tag? (optional)" with a single tag input.
- This is cosmetically similar to the Stripe post-payment confirmation pattern — lightweight, optional, dismissible.
- For pending follows (private accounts), the prompt appears when the request is approved, not when it is sent.

### Tier 2 prep from this feature

- `getDistinctTagsForUser` is also needed by the Tier 2 "Group-scoped post visibility" audience selector when suggesting groups based on tag affinity.
- The tag chip component should be extracted as a reusable `<TagChip>` component so it can be used on the groups management page and the feed filter sidebar.

---

## Feature 1.4 — Follow Request UX Overhaul

This feature is currently gated to private accounts only. The overhaul keeps that gate but enriches the UI.

### Current state

- Incoming requests shown on `/people/page.tsx` (server-rendered) via `FollowRequests.tsx`.
- `FollowRequests.tsx` is a client component with Approve/Reject buttons.
- No outgoing requests view exists anywhere.
- No notification badge on the People nav link.

### Changes

**Incoming requests card redesign** (`FollowRequests.tsx` or a new `FollowRequestCard.tsx`):
- Show: avatar, display name (`displayName` or `username`), bio snippet (need to add `bio` to the `getFollowRequests` query's `select`), and the timestamp.
- Actions: "Approve" (green) / "Decline" (outline danger).
- On "Approve": trigger the existing `POST /api/follow/[userId]/approve` then immediately show the tag prompt (Feature 1.1 flow) inline below the card before it dismisses.
- On "Decline": trigger `POST /api/follow/[userId]/reject` and remove the card.
- Add a "Select all" checkbox and batch "Approve selected" / "Decline selected" buttons at the top when more than 3 requests are shown.

**Outgoing requests view** (new, at `/people/requests` or as a tab):
- Fetches `GET /api/follow/requests/outgoing` (new route — currently only incoming exists).
- New API: `GET /api/follow/requests/outgoing` — queries `Follow` where `followerId = currentUser.id AND status = 'pending'`.
- Shows: avatar, display name, date sent, "Cancel request" button.
- "Cancel request" calls `DELETE /api/follow/[userId]` (existing unfollow route — works because deleting a pending follow is the same as cancelling it).

**Notification badge on People nav link:**
- The nav already renders somewhere (find the nav component). Add a badge showing `pendingRequestsCount` pulled from the server.
- This requires the nav component to either fetch the count server-side (preferred, avoids a client fetch on every page) or accept it as a prop from the layout.

**In-app notification on new follow request:**
- In `followUser()` in `lib/follows/queries.ts`, after creating the pending follow, call `createUserNotification` for the `followingId` user:
  ```ts
  await createUserNotification({
    userId: followingId,
    title: 'New follow request',
    body: `${follower.username} wants to follow you.`,
    actionUrl: '/people/requests',
    type: 'follow_request',
  });
  ```
- The `follower.username` requires fetching the follower's username in `followUser()` — currently the function only looks up the `followingUser`. Add a select for `followerUser` as well.

### Tier 2 prep from this feature

- The request card's "Block" action is omitted (per Q4 recommendation). The card layout should have a `...` overflow menu placeholder so Block can be added as a menu item in Tier 2 without redesigning the card.
- The `type: 'follow_request'` notification type string should be added to `lib/notifications/constants.ts` so all notification types live in one place.

---

## Feature 1.5 — Mute

### Schema (if Q1 = Option A)

Add `isMuted Boolean @default(false)` and `mutedAt DateTime?` to `Follow`.

### New API routes

```
POST   /api/follow/[userId]/mute      → sets isMuted=true, mutedAt=now()
DELETE /api/follow/[userId]/mute      → sets isMuted=false, mutedAt=null
```

Both routes verify the follow relationship exists (`followerId = currentUser.id`).

### lib changes

Add to `lib/follows/queries.ts`:
```ts
muteUser(followerId, followingId): Promise<Follow>
unmuteUser(followerId, followingId): Promise<Follow>
getMutedUsers(userId): Promise<MutedUser[]>
```

### Feed query change

In `buildMessageWhereClause`, when processing `following_only`, filter out muted follows:

```ts
const following = await prisma.follow.findMany({
  where: {
    followerId: userId,
    status: 'approved',
    isMuted: false,   // ← add this
  },
  ...
});
```

This is a one-line addition to the existing query. No structural change to `buildMessageWhereClause` needed.

### UI changes

**People → Following list** — each row gains a "Mute" / "Unmute" toggle in a `...` overflow menu (same menu where "Unfollow" lives). Shows current mute state.

**People → Muted tab** (new sub-route `/people/muted`):
- Lists all follows where `isMuted = true`.
- Each row: avatar, display name, "Unmute" button.
- Empty state: "You haven't muted anyone."

**User profile page:**
- The follow action button area (`FollowButton` or equivalent) gains a `...` menu with: "Unfollow", "Mute / Unmute". This menu should also be the future home of "Block" (Tier 2).

### Mute notification invariant

No notification is sent when a user is muted. This must be enforced: `muteUser()` must not call `createUserNotification`. Add a comment in the function to make this explicit.

### Tier 2 prep from this feature

- The `...` overflow menu on the profile page and on the following list rows is the exact same UI surface where "Block" will live in Tier 2. Design the menu component to accept an array of action items so Block can be inserted without restructuring.
- The `/people/muted` page layout should be designed so that `/people/blocked` (Tier 2) can be added as a sibling tab with zero changes to the muted page.

---

## Feature 1.2 — Connection Groups

### New API routes

```
GET    /api/people/groups                         → list all groups for current user
POST   /api/people/groups                         body: { name, description? } → create group
PATCH  /api/people/groups/[groupId]               body: { name?, description?, isPublic? } → update
DELETE /api/people/groups/[groupId]               → delete group + all memberships
GET    /api/people/groups/[groupId]/members        → list members
POST   /api/people/groups/[groupId]/members        body: { userId } → add member
DELETE /api/people/groups/[groupId]/members/[userId] → remove member
```

Server-side invariants:
- Only the group owner can read or mutate the group (unless `isPublic = true`, in which case anyone can read the group and member list via a public URL — but public groups are Tier 2 surfacing, not Tier 1).
- `POST /api/people/groups/[groupId]/members` must verify that `currentUser` follows `userId` before adding them as a member.
- Max 50 groups per user and 500 members per group are enforced server-side, not just client-side.

### lib changes

New file `lib/follows/groups.ts`:
```ts
createConnectionGroup(ownerId, name, description?): Promise<ConnectionGroup>
updateConnectionGroup(ownerId, groupId, data): Promise<ConnectionGroup>
deleteConnectionGroup(ownerId, groupId): Promise<void>
listConnectionGroups(ownerId): Promise<ConnectionGroup[]>
addGroupMember(ownerId, groupId, userId): Promise<ConnectionGroupMember>
removeGroupMember(ownerId, groupId, userId): Promise<void>
getGroupMembers(ownerId, groupId): Promise<User[]>
```

### UI changes

**Groups sidebar on `/people`:**
- Left sidebar (or top of page on mobile) lists the user's groups.
- Each group: name, member count, edit icon (inline rename), delete icon (with confirmation).
- "New group" button opens an inline form: name input, optional description, Create.
- Clicking a group name filters the following list to members of that group (same mechanism as tag filter).

**Group management page `/people/groups`:**
- Full CRUD for groups.
- Each group card: name, description, member count, edit, delete.
- Clicking a group opens its member list: avatar, display name, "Remove" button.
- "Add member" search input (searches the user's following list, not all users).

**"Add to group" action on following list rows:**
- In the `...` overflow menu on each followed user's row: "Add to group" → opens a dropdown of existing groups (checkboxes) + "New group" option.
- This is additive: a person can be in multiple groups simultaneously.

### Tier 2 prep from this feature

- `isPublic` and `description` are already in the `ConnectionGroup` schema. Tier 2 public groups only need: a public page route (`/@[username]/lists/[group-slug]`), a slug field on the model, and a "Follow this list" mechanism. No schema migration needed.
- The group member list component should be designed to also work as a read-only public view (just conditionally hide the "Remove" and "Add" controls based on ownership).

---

## Feature 1.3 — Tag & Group Feed Filters

This feature modifies the existing `buildMessageWhereClause` function and the feed API.

### Changes to `buildMessageWhereClause`

New signature:
```ts
buildMessageWhereClause(
  userId: string | null,
  viewingPreference: string | null,
  connectionFilter?: { type: 'tag'; value: string } | { type: 'group'; groupId: string } | null
): Promise<Prisma.MessageWhereInput>
```

When `connectionFilter` is present and `viewingPreference` is `following_only` (or `all_messages` while logged in):

**Tag filter logic:**
```ts
// Get followIds where the follow has the given tag
const taggedFollows = await prisma.followTag.findMany({
  where: {
    follow: { followerId: userId },
    tag: connectionFilter.value,
  },
  select: { follow: { select: { followingId: true } } },
});
const taggedIds = taggedFollows.map(f => f.follow.followingId);
// Intersect with the existing followingIds set
const filteredIds = followingIds.filter(id => taggedIds.includes(id));
```

**Group filter logic:**
```ts
// Get userIds who are members of this group (and verify group ownership)
const members = await prisma.connectionGroupMember.findMany({
  where: { groupId: connectionFilter.groupId, group: { ownerId: userId } },
  select: { userId: true },
});
const memberIds = members.map(m => m.userId);
const filteredIds = followingIds.filter(id => memberIds.includes(id));
```

In both cases, `filteredIds` replaces `followingIds` in the rest of the existing `following_only` logic. The mute filter (`isMuted: false`) still applies.

### Changes to the messages API route

`GET /api/messages` gains new optional query params:
- `filterType`: `tag` | `group`
- `filterValue`: tag string or group UUID

Parsed and passed into `buildMessageWhereClause` as `connectionFilter`.

### Feed UI changes

**Home page left sidebar** (wherever the current viewing preference toggle lives):
- Below the existing "All / Following / Both" toggle, add a secondary filter section: "Filter by tag" and "Filter by group."
- "Filter by tag" is a dropdown populated from `GET /api/people/tags` (the distinct tags the user has used).
- "Filter by group" is a dropdown populated from `GET /api/people/groups`.
- Selecting a filter adds `?filterType=tag&filterValue=work` (or `group`) to the URL. The feed then re-fetches with that filter.
- "Clear filter" link removes the params.
- The filter is visually secondary to the main toggle — smaller font, collapsible section.

**URL persistence:**
- The filter params are in the URL, so the browser back button and bookmarks work correctly.
- The filter params survive page refresh.
- Sharing the URL with a filter applied should gracefully handle the case where the viewer is not the filter owner — they just see the unfiltered feed (the filter is silently ignored for non-owners).

### Performance note

The tag/group filter adds one extra Prisma query before the main message query. At Tier 1 scale this is acceptable. If performance becomes an issue later, denormalize `followingIds` per tag into a Redis set. Do not optimize prematurely.

---

## Component Architecture Decisions

### Reusable components to create (used across multiple features)

| Component | Used by |
|-----------|---------|
| `<TagChip tag onRemove? />` | Following list (1.1), user profile (1.1), tag filter sidebar (1.3) |
| `<TagInput value onChange onAdd placeholder />` | Follow approval flow (1.4), following list (1.1), profile page (1.1) |
| `<OverflowMenu actions />` | Following list rows (1.5 mute, future: 2.3 block), profile page follow area |
| `<PersonCard user actions? tags? />` | Follow requests (1.4), following list, group member list (1.2) |
| `<GroupChip group onRemove? />` | Group sidebar (1.2), group filter selector (1.3) |

Build these as small, dumb presentational components with no data fetching. Data fetching stays in server components or dedicated hooks.

### Where NOT to put logic

- Do not put tag or group state in `FollowersList.tsx` or `FollowingList.tsx`. Those components currently just list people. Extend them via composition: render `<PersonCard>` inside each list item, and `<PersonCard>` receives pre-fetched tags/groups as props.
- Do not fetch tags in the people page server component for every row. Use a client-side fetch per row on demand (when the user clicks "Add tag") to avoid N+1 on page load.

---

## Privacy Invariants Checklist

Each API route must enforce these. Write a test or add an assertion comment at the top of each handler.

- [ ] `GET /api/follow/[userId]/tags` — only returns tags if `currentUser.id === followerId`
- [ ] `POST /api/follow/[userId]/tags` — only allowed if `currentUser.id === followerId` and follow exists
- [ ] `DELETE /api/follow/[userId]/tags/[tag]` — only allowed if `currentUser.id === followerId`
- [ ] `GET /api/people/tags` — returns only tags belonging to `currentUser`
- [ ] `GET /api/people/groups` — returns only groups owned by `currentUser`
- [ ] `GET /api/people/groups/[groupId]/members` — only if `currentUser` owns the group
- [ ] `POST /api/people/groups/[groupId]/members` — only if `currentUser` owns the group AND follows the target user
- [ ] `POST /api/follow/[userId]/mute` — only if `currentUser.id === followerId` and follow exists
- [ ] Feed filter by tag — silently ignored if the `filterValue` tag is not in `currentUser`'s tag set
- [ ] Feed filter by group — silently ignored if the `groupId` group is not owned by `currentUser`
- [ ] Mute status — never returned in any API response except `getMutedUsers(currentUser.id)`
- [ ] No notification is sent when a user is muted

---

## Extension Points for Tier 2 (Do Not Over-build Now; Just Leave Room)

| Tier 2 Feature | What Tier 1 Must Not Close Off |
|----------------|-------------------------------|
| 2.1 Group-scoped post visibility | `ConnectionGroup.isPublic` already in schema. Message model will need `audienceGroupId String?` — leave `Message` model untouched for now, no premature field. |
| 2.2 Direct Share | `UserNotification.type` and `metadata: Json` are already flexible enough to carry share payloads. No model changes needed. |
| 2.3 Block | The `...` overflow menu on person rows and profile pages must have a slot for "Block." Design `<OverflowMenu>` to accept an `actions` array so "Block" is inserted without redesign. |
| 2.4 Connection Notes | `note String?` added to `Follow` table in a Tier 2 migration — no impact on Tier 1 schema. |
| 2.5 Mutual Connections | `getMutualFollows()` already exists in `lib/follows/queries.ts`. Tier 2 just needs a UI surface. |
| 2.6 People Discovery | No Tier 1 changes needed; Tier 2 adds search and suggestions to the People page. |

---

## Deliverable Checklist (in implementation order)

### Schema (db-migrations agent)
- [ ] Migration: add `FollowTag` model + relation on `Follow`
- [ ] Migration: add `ConnectionGroup` + `ConnectionGroupMember` models + relations on `User`
- [ ] Migration: add `isMuted Boolean @default(false)` + `mutedAt DateTime?` to `Follow`
- [ ] Add notification type constants to `lib/notifications/constants.ts`: `follow_request`, `follow_approved`

### Feature 1.1 — Connection Tags
- [ ] `lib/follows/queries.ts`: add `addFollowTag`, `removeFollowTag`, `getFollowTags`, `getDistinctTagsForUser`
- [ ] `app/api/follow/[userId]/tags/route.ts` (GET, POST)
- [ ] `app/api/follow/[userId]/tags/[tag]/route.ts` (DELETE)
- [ ] `app/api/people/tags/route.ts` (GET — autocomplete)
- [ ] Component: `<TagChip>`
- [ ] Component: `<TagInput>`
- [ ] Following list: add tag chips + add-tag flow per row
- [ ] User profile page: add tag editor in sidebar (visible only to viewer when following)
- [ ] Follow confirmation: add optional tag prompt after successful follow

### Feature 1.4 — Follow Request UX Overhaul
- [ ] Update `getFollowRequests` to include `bio` in the select
- [ ] `app/api/follow/requests/outgoing/route.ts` (GET — new)
- [ ] `app/api/follow/requests/route.ts` (POST batch approve/decline — new or extend existing)
- [ ] Component: `<FollowRequestCard>` with avatar, bio, approve/decline, tag-at-approval
- [ ] Batch select + batch action controls
- [ ] `followUser()`: add `createUserNotification` call for new pending follows
- [ ] `approveFollowRequest()`: add `createUserNotification` call for approved follows
- [ ] Nav: pending requests badge on People nav link (server-rendered count)
- [ ] Outgoing requests view (new sub-route or tab)

### Feature 1.5 — Mute
- [ ] `lib/follows/queries.ts`: add `muteUser`, `unmuteUser`, `getMutedUsers`
- [ ] `app/api/follow/[userId]/mute/route.ts` (POST, DELETE)
- [ ] `buildMessageWhereClause`: add `isMuted: false` to the follow query in `following_only`
- [ ] Component: `<OverflowMenu>` (generic, accepts `actions` array)
- [ ] Following list: mute/unmute in overflow menu
- [ ] User profile page: mute/unmute in follow-area overflow menu
- [ ] `/people/muted` page (new sub-route)

### Feature 1.2 — Connection Groups
- [ ] `lib/follows/groups.ts` (new file): CRUD functions
- [ ] `app/api/people/groups/route.ts` (GET, POST)
- [ ] `app/api/people/groups/[groupId]/route.ts` (PATCH, DELETE)
- [ ] `app/api/people/groups/[groupId]/members/route.ts` (GET, POST)
- [ ] `app/api/people/groups/[groupId]/members/[userId]/route.ts` (DELETE)
- [ ] Component: `<GroupChip>`
- [ ] Component: `<PersonCard>` (generalized person row used in group member list, follow request list, following list)
- [ ] Groups sidebar on People page
- [ ] `/people/groups` management page
- [ ] "Add to group" in following list overflow menu

### Feature 1.3 — Tag & Group Feed Filters
- [ ] `buildMessageWhereClause`: add `connectionFilter` parameter
- [ ] `app/api/messages/route.ts`: parse `filterType` + `filterValue` query params and pass to `buildMessageWhereClause`
- [ ] Feed sidebar: tag filter dropdown (populated from `/api/people/tags`)
- [ ] Feed sidebar: group filter dropdown (populated from `/api/people/groups`)
- [ ] URL param persistence for filters

---

## Risk Notes

- **`buildMessageWhereClause` complexity**: this function is already moderately complex (handles four viewing modes). Adding the connection filter increases complexity. Consider extracting it into a query builder class in Tier 2 if it grows further. For Tier 1, keep it as a function with a clear `connectionFilter` branch.
- **Following list N+1**: fetching tags for every row in the following list could be N+1. Solve by fetching all tags for all of the current user's follows in one query and passing them as a map to the list component.
- **Group membership enforcement**: `addGroupMember` must verify that the current user actually follows the target user. This is not enforceable by a DB constraint — it must be enforced in the lib function.
- **Mute + group filter interaction**: if a user has person A muted, and person A is in their "Work" group, does the group feed filter show A's posts? Per the spec: mute suppresses posts from the home feed, but the group feed filter is a deliberate query. Recommendation: **mute applies even in group filters** (muted people's posts never appear, regardless of filter). This must be consistent in the implementation.
