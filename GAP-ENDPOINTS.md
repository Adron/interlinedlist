# GAP-ENDPOINTS — Backend gaps blocking iOS parity

Tracks endpoints / API behaviors the **backend** still needs to expose
before the iOS app can ship corresponding features. For the iOS-side
implementation roadmap, see `GAP-NEXT-STEPS.md`.

This file is intentionally **paste-into-backend-Claude friendly**: each
section under "Backend gaps" is a self-contained prompt the backend team
can drop into their own Claude Code session.

Last updated: 2026-06-24 — **backend has now resolved B0, B2, B3, and B5.**
See the "Backend resolution" section immediately below for what shipped and
where the docs live. The remaining gaps (B4, B6, B7, B9) were intentionally
deferred this pass; B8 stays acknowledged-only.

> **2026-06-24 (iOS):** iOS Phases 2 (auth surface) and 3 (profile / account
> management) shipped. The "What backend has now" usage table at the bottom is
> updated to reflect the endpoints iOS now consumes (OAuth, reset/verify,
> identities, orgs, avatar, email change, delete account).

---

## Backend resolution — 2026-06-24

The backend team implemented the high/medium gaps. All four are live in code
and documented.

| § | Gap | Status | Where to find it |
|---|---|---|---|
| **B0** | Schema PUT structured body | ✅ **Resolved (docs)** — the structured `{ properties: [...] }` shape was already live on `PUT /api/lists/[id]/schema` (same route, payload-discriminated; **there is no `/schema/structured` route**). Now fully documented, including merge semantics, `?force=true`, and the allowed type list. | `docs/api-reference.md` → Lists / "Update list schema"; `docs/help/api/lists.md` → "Updating the schema". Impl: `app/api/lists/[id]/schema/route.ts`. |
| **B2** | Message search | ✅ **Resolved (new endpoint)** — `GET /api/messages/search?q=&limit=&offset=&onlyMine=`. Top-level messages, feed-visibility-scoped, same item shape as `GET /api/messages`. | `docs/api-reference.md` → Messages; `docs/help/api/messages.md`. Impl: `app/api/messages/search/route.ts`. |
| **B3** | Notification preferences | ✅ **Resolved (new endpoints, real events only)** — `GET`/`PATCH /api/user/notification-preferences`. Preferences genuinely gate delivery (toggling a channel off suppresses it). **See the divergence note below — the contract differs from this doc's original proposal.** | `docs/api-reference.md` → Notifications; `docs/help/api/notifications.md`. Impl: `app/api/user/notification-preferences/route.ts`, `lib/notifications/preferences.ts`. |
| **B5** | Watcher roles + bodies | ✅ **Resolved (docs)** — roles `watcher`/`collaborator`/`manager` plus the POST/PUT/GET bodies & response shapes were already implemented; now fully documented. | `docs/api-reference.md` → Lists / Watchers; `docs/help/api/lists.md` → "Watchers". Impl: `app/api/lists/[id]/watchers/**`. |

### ⚠️ B3 contract divergence — iOS Settings → Notifications must adapt

The notification-preferences API exposes **only the events the server actually
emits, and only the channels that actually exist**. It does **not** match the
`{ push, inApp, email }`-per-event shape this doc originally proposed:

- **No `email` channel.** Channels are `push` and `inApp` only.
- **Authoritative event catalog:**
  - `dig` — channels: `push`, `inApp`
  - `push` — channels: `push`, `inApp` (covers plain pushes *and* pushes with commentary)
  - `follow` — channels: **`push` only** (new followers + follow requests; there is no in-app row for follows)
- `GET` returns, per event, **only that event's supported channels**. Render the
  Settings toggles from the returned `channels` keys — do not assume a fixed
  3-channel grid.
- There is **no** `reply`, `list_watcher_added`, or `follow_request_approved`
  event; the backend does not emit those today.
- Absent preferences default to **enabled** for every channel.

`GET` → `{ "events": [ { "key", "label", "description", "channels": { <supported>: bool } } ] }`
`PATCH` body `{ "key", "channels": { "push"?: bool, "inApp"?: bool } }` → returns the
updated event object. Unknown key / unsupported channel / non-boolean → `400`.

### Deferred this pass (unchanged, still standing)

B4 (GitHub Bearer auth), B6 (tag discovery), B7 (avatar returns user),
B9 (follow-status self shape). B8 (real-time) remains acknowledged-only.

### Re-verification notes (2026-06-23)

- The `/help/api` tree contains 17 sub-pages: authentication,
  users-and-profile, public-profiles, messages, lists, list-folders,
  documents, document-folders, following, organizations, notifications,
  push-notifications, exports, github-integration, linkedin-integration,
  utility-endpoints, administration.
- **`/help/api/subscriptions` returns 404** — no dedicated subscriptions
  docs page exists. (Earlier audit listed it; it may have been removed
  or never published.) This raises B1 priority: the iOS app currently
  has no documented Stripe / billing API surface to call at all.
- **`/help/api/internal-endpoints` no longer in the tree** — prior audit
  listed it; current tree does not. Minor (was internal-only anyway).
- **New endpoint discovered on `/help/api/messages`:**
  `POST /api/messages/:id/metadata` — not in the prior audit and not
  used by iOS yet. Logged in `GAP-NEXT-STEPS.md` as a Phase 4 add-on.
  Not a gap — just an iOS-side TODO.

---

## Part A — Original six gaps: all shipped ✅

The six backend gaps tracked in the prior version of this doc are now
all confirmed live in the published docs.

| # | Endpoint | Docs page | Status |
|---|---|---|---|
| 1 | `GET/POST/PUT/DELETE /api/folders` (list folders) | `/help/api/list-folders` | ✅ Live (POST is subscriber-only) |
| 2 | `PATCH /api/documents/[id]` accepts `folderId` | `/help/api/documents` | ✅ Live |
| 3 | `GET /api/documents/search` | `/help/api/documents` | ✅ Live |
| 4 | `GET /api/lists/search` | `/help/api/lists` | ✅ Live |
| 5 | `PUT /api/lists/[id]` accepts `isPublic` | `/help/api/lists` | ✅ Live |
| 6 | `PUT /api/lists/[id]/schema` | `/help/api/lists` | ✅ Live (body shape inferred — see §B0) |

iOS-side fallout for all six gaps is complete: placeholders removed,
swallows torn out, subscriber-403 paywall plumbed, integration tests
added. No iOS work pending against these.

---

## Part B — Backend gaps still blocking iOS parity

Each item below lists:

1. **Gap** — what's missing.
2. **Why it matters** — which iOS feature is blocked.
3. **Proposed contract** — what the iOS client expects to call.
4. **Prompt** — paste-into-backend-Claude prompt to implement.

Ordered by iOS impact.

### B0. Document `PUT /api/lists/[id]/schema` body shape — ✅ RESOLVED 2026-06-24

> ✅ **Resolved.** The structured `{ properties: [...] }` body is live on the
> **same** `/schema` route (payload-discriminated — there is no
> `/schema/structured` route) and is now fully documented in
> `docs/api-reference.md` (Lists) and `docs/help/api/lists.md`. The original
> gap text is preserved below for context.

**Status:** Endpoint is live but the docs publish no example body.
**Re-verified 2026-06-23:** `/help/api/lists` still shows the endpoint
in the table as "Update list schema" with no body spec, no example, no
structured-properties variant. The iOS client currently sends
`{ "schema": "Name:type, ..." }` (a DSL string) by analogy with the
`POST /api/lists` example, but this is an assumption.

**Why it matters:** Two issues.

1. If the live server expects a different shape, every schema-edit save
   from iOS fails silently.
2. The DSL string format loses `isVisible`, `isRequired`,
   `displayOrder`, `defaultValue`, `helpText`, `placeholder` — fields
   the iOS editor lets users edit but can't round-trip.

**Resolution options (pick one):**

- (a) **Document the DSL shape** explicitly and accept the data loss —
  ship a richer endpoint later if needed.
- (b) **Expose a structured form** as a peer endpoint, e.g.
  `PUT /api/lists/[id]/schema/structured` taking
  `{ "properties": [{ "id": ..., "propertyKey": ..., "propertyName": ...,
  "propertyType": ..., "displayOrder": ..., "isVisible": ...,
  "isRequired": ..., "defaultValue": ..., "helpText": ...,
  "placeholder": ... }] }` and returning the full updated schema. Keep
  DSL as an alternate format on the same `/schema` route.

**Prompt:**

```
The InterlinedList iOS client calls `PUT /api/lists/[id]/schema` to
persist schema edits, but the published API docs don't include a body
example. Today the iOS client sends `{ "schema": "Name:type, ..." }`
by analogy with `POST /api/lists`. Please either:

1. Document the request body for `PUT /api/lists/[id]/schema` explicitly
   on /help/api/lists, including an example, supported types, and
   non-destructive merge semantics (rename / reorder / add / delete and
   how each affects existing row data).

OR

2. Expose a richer structured endpoint at
   `PUT /api/lists/[id]/schema/structured` accepting a JSON array of
   property objects with `id`, `propertyKey`, `propertyName`,
   `propertyType`, `displayOrder`, `isVisible`, `isRequired`,
   `defaultValue`, `helpText`, `placeholder` — semantics:
     - existing `id` → update in place, preserve row data
     - missing `id` → create new property
     - omitted from request → soft-delete, drop key from row blobs
     - reject duplicate `propertyKey` in same list
     - reject unknown `propertyType`
     - reject `propertyKey` change for existing id (rename
       propertyName instead)
   Response 200: `{ "properties": [ ... full updated schema ... ] }`.

Either path unblocks the iOS schema editor's `isVisible` / `isRequired`
toggles.
```

---

### B1. ~~Subscription plans catalog endpoint~~ — WITHDRAWN 2026-06-24

**No longer requested.** The iOS app will not display any subscription
or billing UI per the direction in `subscription-permissions-update.md`.
A plans catalog endpoint is unnecessary because the iOS bundle has no
paywall, no checkout, no plan info, and no "subscribe" CTA. Subscription
management happens entirely on the web. The original gap text is
preserved below for context but should be considered closed.

<details>
<summary>Original gap (preserved for context)</summary>

**Gap:** No endpoint returns the available subscription tiers, their
prices, feature comparisons, or marketing copy.
**Re-verified 2026-06-23:** `/help/api/subscriptions` returns **404** —
there is no dedicated subscriptions docs page at all. The iOS app has
no documented API surface for plans, pricing, checkout, or billing
portal. Earlier mentions of `POST /api/stripe/create-*` endpoints came
from a now-removed page; treat them as unverified until re-published.

</details>

**Why it matters:** Blocks Phase 3 of `GAP-NEXT-STEPS.md`. The iOS
paywall / upgrade screen has to hardcode plan info or punt to a
webview. Even a simple "you'll get cross-posting + scheduled posts +
image uploads + folders for $X/month" pitch needs data.

**Proposed contract:**

```
GET /api/subscriptions/plans
Response 200:
  {
    "plans": [
      {
        "id": "monthly",
        "name": "Monthly",
        "priceCents": 500,
        "currency": "USD",
        "interval": "month",
        "features": ["Cross-posting", "Scheduled posts",
                     "Image uploads", "Video uploads", "Folders"]
      },
      {
        "id": "annual",
        "name": "Annual",
        "priceCents": 5000,
        "currency": "USD",
        "interval": "year",
        "features": [...]
      }
    ]
  }
```

**Prompt:**

```
Add `GET /api/subscriptions/plans` returning the public-facing list of
subscription tiers with price, interval, and a feature list. The
InterlinedList iOS app needs this to render an in-app paywall / upgrade
screen without hardcoding plan info. Match the response shape proposed
in the iOS repo's `GAP-ENDPOINTS.md` §B1, or document any
divergence.

Public endpoint (no auth required). If feature lists are tier-dependent
and you'd rather keep them server-rendered, also return a `marketingUrl`
per plan so the iOS app can fall back to webview.
```

---

### B2. Message search — ✅ RESOLVED 2026-06-24

> ✅ **Resolved.** `GET /api/messages/search` is live
> (`app/api/messages/search/route.ts`), documented in `docs/api-reference.md`
> (Messages) and `docs/help/api/messages.md`. Contract matches the proposal
> below: `q` (1–200), `limit` (≤100), `offset`, `onlyMine`; feed-visibility
> scoped; same message item shape + `pagination` as `GET /api/messages`.

**Gap:** `/api/lists/search` and `/api/documents/search` exist;
`/api/messages/search` does not.
**Re-verified 2026-06-23:** `/help/api/messages` shows no search
endpoint. Tags appear only as an optional field on message creation,
not as a query/filter beyond `?tag=X` on the list endpoint.

**Why it matters:** Blocks Phase 13. The iOS feed has no search box. A
social feed without search is a notable UX gap.

**Proposed contract:**

```
GET /api/messages/search?q={query}&limit={n}&offset={n}&onlyMine={bool}
Response 200:
  {
    "messages": [ ... same shape as GET /api/messages items ... ],
    "pagination": { "total": 42, "limit": 20, "offset": 0, "hasMore": true }
  }
```

Visibility scoping: the user's own messages (public + private) plus
public messages from anyone they can otherwise see (followers/public
profiles). Match the existing visibility rules from `GET /api/messages`.

**Prompt:**

```
Add `GET /api/messages/search` mirroring the existing
`/api/documents/search` and `/api/lists/search` endpoints. Query
parameters: `q` (required, 1–200 chars), `limit` (default 20, max 100),
`offset` (default 0), `onlyMine` (optional boolean, default false).
Response uses the same message object shape as `GET /api/messages`,
wrapped under `messages` + `pagination`. Visibility scoping matches the
existing `/api/messages` rules. The InterlinedList iOS app will add a
search bar to its feed once this lands.
```

---

### B3. Notification preferences enumeration — ✅ RESOLVED 2026-06-24 (real events only)

> ✅ **Resolved, with a contract divergence.** `GET`/`PATCH
> /api/user/notification-preferences` are live
> (`app/api/user/notification-preferences/route.ts`,
> `lib/notifications/preferences.ts`) and preferences genuinely gate delivery.
> **The catalog/channels differ from the proposal below** — there is no
> `email` channel, `follow` is push-only, and only `dig`/`push`/`follow` exist.
> See the "⚠️ B3 contract divergence" callout in the Backend resolution
> section at the top of this doc, and `docs/api-reference.md` (Notifications) /
> `docs/help/api/notifications.md`.

**Gap:** The push-notifications docs note that "per-event delivery
preferences" live on user profile settings, but no endpoint enumerates
which event types exist. iOS can't render a Settings → Notifications
screen without hardcoding event keys.
**Re-verified 2026-06-23:** Both `/help/api/users-and-profile` and
`/help/api/push-notifications` confirm no enumeration endpoint. The
push docs still reference "new follower, reply, dig, etc." as event
types without an authoritative list.

**Why it matters:** Blocks the notification-preferences screen in Phase
9 / Phase 12 of `GAP-NEXT-STEPS.md`. Without this, iOS users have no
way to control what they're notified about beyond going to the web.

**Proposed contract:**

```
GET /api/user/notification-preferences
Response 200:
  {
    "events": [
      {
        "key": "follow",
        "label": "New follower",
        "description": "When someone follows you.",
        "channels": { "push": true, "inApp": true, "email": false }
      },
      {
        "key": "reply",
        "label": "Replies to your messages",
        ...
      },
      { "key": "dig", ... },
      { "key": "follow_request_approved", ... },
      { "key": "list_watcher_added", ... },
      ...
    ]
  }

PATCH /api/user/notification-preferences
Body: { "key": "follow", "channels": { "push": false } }
Response: updated event object
```

**Prompt:**

```
Expose two endpoints so clients (specifically the InterlinedList iOS
app) can render a notifications preferences screen without hardcoding
event types:

GET /api/user/notification-preferences
  Returns every notification event the server can emit, with a
  display-friendly label, a description, and per-channel boolean
  settings (push, in-app, email) for the current user.

PATCH /api/user/notification-preferences
  Body: { "key": "<event-key>", "channels": { "push": bool, ... } }
  Updates the per-channel preference for one event.

The current `POST /api/user/update` endpoint can stay as the persistence
layer; these two endpoints are just the enumeration + targeted-update
surface that the docs already imply exists.
```

---

### B4. Bearer-token support on `/api/github/*` endpoints

**Gap:** GitHub integration endpoints (`/api/github/repos`,
`/api/github/issues`, etc.) require a session cookie and explicitly
reject Bearer tokens. The iOS app is Bearer-only.
**Re-verified 2026-06-23:** `/help/api/github-integration` still states
verbatim: *"All endpoints require a session cookie (Bearer tokens are
not accepted), and require an active linked GitHub identity."* No
session-from-Bearer exchange endpoint documented either.

**Why it matters:** Blocks Phase 11 (GitHub integration) on iOS without
forcing the client to implement a fragile cookie-jar flow that
bypasses our Bearer-token security model.

**Resolution options:**

- (a) Accept Bearer tokens on `/api/github/*` — preferred. The Bearer
  token already maps to a user identity; GitHub OAuth identity is
  attached to that user.
- (b) Document a documented session-cookie-via-Bearer-exchange
  endpoint (e.g. `POST /api/auth/session-from-bearer` returns a
  short-lived session cookie) — fallback if direct Bearer support is
  hard.

**Prompt:**

```
The InterlinedList iOS app authenticates with Bearer tokens
(`/api/auth/sync-token`) and cannot use session cookies cleanly. Today
`/api/github/*` endpoints require session-cookie auth and reject
Bearer tokens, locking iOS out of GitHub-backed lists and "create
issue from message" flows.

Please either (a) accept Bearer tokens on the `/api/github/*` family —
the Bearer token already identifies a user, and that user's linked
GitHub identity provides the GitHub access token server-side — or
(b) expose `POST /api/auth/session-from-bearer` that returns a short-
lived session cookie usable for these endpoints. (a) is strongly
preferred; (b) is a workaround.
```

---

### B5. Document list-watcher role values — ✅ RESOLVED 2026-06-24

> ✅ **Resolved.** Confirmed role values are `watcher` / `collaborator` /
> `manager`. The `POST`/`PUT`/`GET .../watchers` and `.../watchers/users`
> bodies and response shapes are documented in `docs/api-reference.md` (Lists →
> Watchers) and `docs/help/api/lists.md`. `POST` body is `{ userId?, role? }`;
> `GET .../watchers` returns `{ watchers: [{ id, userId, role, createdAt, user:
> { id, username, displayName, avatar } }] }`.

**Gap:** `/help/api/lists` lists watcher endpoints but doesn't
enumerate the role values that `PUT /api/lists/:id/watchers/:userId`
accepts in its body. `/help/lists` mentions "Watcher", "Collaborator",
"Manager" as user-facing terms but the wire values aren't documented.
**Re-verified 2026-06-23:** Still no role enumeration. No body example
for `POST /api/lists/:id/watchers` either.

**Why it matters:** Blocks Phase 6 (list collaboration) on iOS — the
role picker can't be built without knowing the canonical strings.

**Proposed contract:** Document the role values explicitly on
`/help/api/lists`. Likely candidates: `"watcher" | "collaborator" |
"manager"` (lowercase, snake-case if multi-word). Also document the
`POST /api/lists/:id/watchers` request body — it's not shown today.

**Prompt:**

```
The /help/api/lists page lists watcher endpoints but doesn't enumerate
the valid role strings or document the `POST /api/lists/:id/watchers`
request body. Please add:

1. The exact role string values that `PUT /api/lists/:id/watchers/:userId`
   accepts in its `{ "role": "..." }` body. (Presumably "watcher" /
   "collaborator" / "manager" to match /help/lists wording — confirm.)
2. The `POST /api/lists/:id/watchers` request body shape — is it
   `{ "userId": "..." }`, `{ "role": "watcher" }`, or both?
3. The shape of the `users` field returned from
   `GET /api/lists/:id/watchers/users` — at minimum each item should
   have `userId`, `username`, `displayName?`, `role`.

The InterlinedList iOS app's Phase 6 collaboration UI is gated on this.
```

---

### B6. Tag / hashtag discovery

**Gap:** `GET /api/messages?tag=X` filters by tag, but there's no
endpoint to list trending or recent tags. Users can only follow tags
they already know about.
**Re-verified 2026-06-23:** Not documented on `/help/api/messages` or
`/help/api/utility-endpoints` (the natural homes).

**Why it matters:** Blocks the tag-explorer half of Phase 13. Also
needed for tag autocomplete in `ComposeView`.

**Proposed contract:**

```
GET /api/tags/trending?limit=20
Response 200: { "tags": [{ "tag": "swift", "count": 42, "lastUsedAt": "..." }] }

GET /api/tags/autocomplete?q=swi
Response 200: { "tags": [{ "tag": "swift", "count": 42 }, { "tag": "swiftui", ... }] }
```

**Prompt:**

```
Add two tag-discovery endpoints:

GET /api/tags/trending?limit={n}&window={day|week|month}
  Returns the top tags by message count over the window. Default
  limit 20, default window week.

GET /api/tags/autocomplete?q={prefix}&limit={n}
  Returns tags matching the prefix, ordered by usage. Used by the
  InterlinedList iOS compose UI for `#...` autocomplete.

Both endpoints scoped to public messages only.
```

---

### B7. Avatar response includes updated user

**Gap:** `POST /api/user/avatar/upload` returns `{ url }`. Per the docs
no other user state is returned — clients have to re-fetch
`GET /api/user` to see the new avatar reflected on the user object.
**Re-verified 2026-06-23:** `/help/api/users-and-profile` still publishes
no response shape for either avatar endpoint. Likely unchanged.

**Why it matters:** Minor — costs one extra round-trip on Phase 3
avatar upload. Worth noting but not blocking.

**iOS status (2026-06-24):** Phase 3 shipped with the workaround in
place — `APIClient.uploadAvatar` / `setAvatarFromURL` issue a follow-up
`GET /api/user` and return the refreshed `User`. Resolving this gap
would let us drop that extra round-trip; until then it's handled
client-side.

**Proposed contract:** Return the full updated user object from both
`POST /api/user/avatar/upload` and `POST /api/user/avatar/from-url`,
e.g. `{ "user": { ... }, "url": "..." }`.

**Prompt (low priority, can wait for a wider profile-endpoint pass):**

```
Have `POST /api/user/avatar/upload` and `POST /api/user/avatar/from-url`
return the full updated user object alongside the new URL, so clients
don't have to re-fetch `GET /api/user` to see the avatar change reflect
across the app.
```

---

### B9. `GET /api/follow/:userId/status` returns inconsistent shape for self

**Gap:** When the authenticated user queries follow-status for **their own**
user ID, the response is 200 but the body omits the documented
`following` / `followedBy` / `pendingRequest` fields, breaking the
documented `FollowStatus` decode contract.

**Discovered:** 2026-06-23 via E2E test
`E2EReadOnlyTests.test_e2e_followStatus_forSelf_respondsWithoutCrashing`.

**Why it matters:** Low — the iOS app never queries self-follow-status in
production (the UI doesn't render a follow button on the current user's
own profile). But the behavior is undocumented and any client code that
*does* hit the endpoint with self ID will crash on decode.

**Resolution options:**

- (a) Return 400 with `{ "error": "Cannot query follow status for self" }`
  so clients get a clear contract violation.
- (b) Return the documented shape with `following: false`,
  `followedBy: false`, `pendingRequest: false` for self.
- (c) Document the divergent shape on `/help/api/following`.

**Priority:** Low. The iOS test tolerates the current behavior; this
exists primarily to flag it for the backend team.

---

### B8. Real-time / push for feed updates

**Gap:** No WebSocket, SSE, or long-poll endpoint for live feed /
notification updates. Everything is pull-only.

**Why it matters:** Not a blocker for any current iOS phase, but a
social feed without real-time updates feels stale on mobile. Worth
acknowledging as a long-term gap.

**Resolution:** Not requesting implementation here — this is a major
backend effort. iOS Phase 9 (APNs push) covers the highest-value real-
time signal (notification tap → deep link to message). Live feed scroll
can stay pull-to-refresh for v1.

No prompt — this is a placeholder for "we acknowledge this exists and
will revisit."

---

## Summary

### What backend has now (we use ~all of it)

The iOS client now calls every endpoint family the docs publish, except
for the gaps below:

| Endpoint family | iOS uses? | Notes |
|---|---|---|
| Auth (email/password, sync-token) | ✅ | + OAuth ×5, reset, verify shipped (Phase 2) |
| User core | ✅ | `customerStatus` now decoded |
| Avatar upload | ✅ | Phase 3 — upload + from-URL (re-fetches user; see §B7) |
| Identities / orgs (user-level) | ✅ | Phase 2 (identities) + Phase 3 (orgs strip) |
| Email change | ✅ | Phase 2 — `ChangeEmailView` (presented from `EditProfileView`) + API + `verify-email-change` deep link |
| Delete account | ✅ | Phase 3 — double-confirm → forced logout |
| Messages CRUD | ✅ | cross-post fields + repost pending (Phase 4) |
| Scheduled messages PATCH | ❌ | Phase 4 |
| Image / video upload | ✅ | |
| Lists CRUD + schema | ✅ | schema PUT body shape inferred (§B0) |
| List folders | ✅ | subscriber-403 paywall plumbed |
| List watchers | ✅ (API ready) | Roles + bodies now documented — §B5 resolved 2026-06-24 |
| List connections | ✅ | |
| Documents CRUD + folders + search | ✅ | |
| Document sync | ❌ | Phase 10 |
| Document image upload | ❌ | Phase 10 |
| Following (basic) | ✅ | followers/following/mutuals/remove pending (Phase 5) |
| Notifications tray | ✅ | per-notification GET/DELETE pending |
| Push notifications | ❌ | Phase 9 |
| Notification preferences | ✅ (API ready) | §B3 resolved 2026-06-24 — real events only (dig/push/follow), no email channel |
| Message search | ✅ (API ready) | §B2 resolved 2026-06-24 — `GET /api/messages/search` |
| Organizations | ❌ | Phase 8 |
| Exports | ✅ | |
| Subscriptions (Stripe) | ❌ | **Intentionally not used by iOS** — subscription UI lives only on the web |
| GitHub integration | ❌ | Phase 11 (blocked on §B4) |
| LinkedIn integration | ❌ | deferred |
| Utility endpoints (location, weather, image proxy) | ❌ | out of scope for v1 iOS |

### Backend gap priority (all re-verified 2026-06-23)

| § | Gap | iOS phase blocked | Priority | Re-check |
|---|---|---|---|---|
| B0 | Document/structure schema PUT body | Phase 1 (fidelity) | High | ✅ Resolved 2026-06-24 |
| B5 | Document watcher role values + POST body | Phase 6 | High | ✅ Resolved 2026-06-24 |
| B1 | ~~Subscription plans catalog~~ | n/a — withdrawn | **Withdrawn 2026-06-24** | iOS has no billing UI; see `subscription-permissions-update.md` |
| B2 | Message search | Phase 13 | Medium | ✅ Resolved 2026-06-24 |
| B3 | Notification preferences enumeration | Phase 9 / 12 | Medium | ✅ Resolved 2026-06-24 (real events only — see divergence note) |
| B4 | Bearer auth on `/api/github/*` | Phase 11 | Low (deferred) | Still standing |
| B6 | Tag discovery / autocomplete | Phase 13 | Low | Still standing |
| B7 | Avatar response includes user | Phase 3 (UX nicety) | Low | Still standing — iOS ships a re-fetch workaround (2026-06-24) |
| B9 | `follow/:userId/status` shape inconsistent for self | n/a (edge case) | Low | New 2026-06-23 (via E2E test) |
| B8 | Real-time feed updates | n/a (long-term) | Acknowledged | n/a |

### What is NOT available via API (cannot ship on iOS until backend lands it)

Pulled from the table above, sorted by what they enable:

1. ✅ ~~**Richer schema editing**~~ — UNBLOCKED 2026-06-24. The structured
   `{ properties }` body on `PUT /api/lists/[id]/schema` round-trips
   `isVisible` / `isRequired` etc. (§B0 resolved).
2. ✅ ~~**List collaboration UI**~~ — UNBLOCKED 2026-06-24. Role wire values
   (`watcher`/`collaborator`/`manager`) + watcher bodies documented (§B5
   resolved).
3. ~~**In-app subscription paywall**~~ — withdrawn 2026-06-24. iOS
   will not have a subscription paywall. Subscriber-only features are
   hidden for free users; subscription happens on the web.
4. ✅ ~~**Feed search**~~ — UNBLOCKED 2026-06-24. `GET /api/messages/search`
   is live (§B2 resolved).
5. ✅ ~~**Notification preferences screen**~~ — UNBLOCKED 2026-06-24.
   `GET`/`PATCH /api/user/notification-preferences` are live (§B3 resolved) —
   build the screen against the **real** catalog (dig/push/follow, push/inApp
   only, no email; see the §B3 divergence note).
6. **GitHub features (Bearer)** — Phase 11 needs §B4 unless we accept
   building a cookie-jar workaround. *(Deferred this pass.)*
7. **Tag explorer / `#` autocomplete** — Phase 13 needs §B6.
8. **Live feed updates** — §B8, long-term.
