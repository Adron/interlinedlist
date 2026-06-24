---
title: HTTP API reference
---

# HTTP API reference

**Audience:** Developers building applications, scripts, or integrations against InterlinedList. This file is repository documentation only.

> **Where the full endpoint reference lives.** The canonical, exhaustive HTTP API reference is [`docs/api-reference.md`](../api-reference.md). The in-app rendered version of that reference (split per category) lives at `/help/api/*` in any running deployment. This file is a focused integrator overview — it covers the things you'll trip on while building against the API and points you at the canonical source for everything else.

The base URL is your deployment (e.g. `https://interlinedlist.com` for production); paths are relative to that (e.g. `/api/messages`). All request and response bodies are JSON unless noted.

## Authentication: session vs Bearer

Most endpoints require authentication. Two methods are supported and they are **not interchangeable on every endpoint** — check the canonical reference for each.

### Session cookies

Used by the web app. After `POST /api/auth/login` the server sets an HTTP-only `interlinedlist-session` cookie; subsequent same-origin requests carry it automatically. Use this when building browser clients that run on the deployment's own domain.

The cookie holds a comma-separated list of up to **5 session IDs** to support multi-account sign-in. See `/api/auth/accounts` and `/api/auth/switch` for managing the active account.

### Bearer (sync) tokens

For native, mobile, desktop, and CLI clients. Exchange credentials for a token once:

```http
POST /api/auth/sync-token
Content-Type: application/json

{ "email": "you@example.com", "password": "yourpassword" }
```

Response: `{ "token": "il_tok_..." }`. The token is stored hashed in the database, does not expire automatically, and carries the same permissions as a session for that user. Send it as:

```
Authorization: Bearer il_tok_...
```

### Where Bearer auth works

Endpoints use one of two auth helpers internally:

- `getCurrentUserOrSyncToken(...)` → **Session or Bearer** (most of `/api/messages/*`, `/api/lists/*`, `/api/documents/*`, `/api/follow/*`, `/api/notifications/*`, `/api/user`, `/api/user/avatar/*`, `/api/user/change-email/request`, `/api/push/*`).
- `getCurrentUser(...)` → **Session only**. Notably this covers `/api/auth/*`, `/api/exports/*`, `/api/user/identities/*`, `/api/user/organizations`, all of `/api/linkedin/*` and `/api/organizations/*`, `/api/messages/:id/dig`, the GitHub integration helpers, and the architecture-aggregates dashboard.

Free users see `403 Forbidden` for subscriber-only features (image/video uploads, scheduling, cross-posting, document creation). Subscriber gating is enforced identically for Bearer callers and session callers.

## Common behaviour

- **Errors** return JSON in the shape `{ "error": "Message" }` with an appropriate HTTP status (400, 401, 403, 404, 409, 413, 429, 500). Validation errors on list rows include an additional `details` map.
- **Pagination** uses `limit`, `offset`, and sometimes `page` query parameters. Responses include a `pagination` object with `total`, `limit`, `offset`, `hasMore`.
- **Public endpoints** (e.g. `/api/users/:username/lists*`, `/api/users/:username/documents`) require no authentication and exclude private content.

## Integration patterns

These are derived recipes that go beyond what's documented per-endpoint in the canonical reference.

### Cross-posting

`POST /api/messages` accepts several subscriber-only fields that fan a message out to linked external accounts at post time (or at scheduled-publish time, for messages with `scheduledAt`):

| Field | Target |
|-------|--------|
| `mastodonProviderIds: string[]` | One or more linked Mastodon identity IDs (from `GET /api/user/identities`). |
| `crossPostToBluesky: boolean` | The user's linked Bluesky account. |
| `crossPostToLinkedIn: boolean` | The user's linked LinkedIn account (personal). |
| `linkedInTargets: object[]` | Explicit LinkedIn target list (personal/orgPage/personalPage). Overrides `crossPostToLinkedIn`. |
| `crossPostToTwitter: boolean` | The user's linked X (Twitter) account. |

Cross-posting is **skipped automatically** for replies (`parentId` set) and plain pushes (`pushedMessageId` with empty content). For scheduled messages, the cross-post config is stored in `scheduledCrossPostConfig` and executed by the scheduled publisher at publish time.

The `201` response includes a `crossPostResults` array reporting per-target success or failure:

```json
{
  "crossPostResults": [
    { "providerId": "...", "instanceName": "mastodon.social", "success": true, "url": "https://..." },
    { "providerId": "", "instanceName": "Bluesky", "success": false, "error": "..." },
    { "providerId": "identity-uuid", "instanceName": "Twitter", "success": true, "url": "...", "tweetId": "...", "tweetIds": ["..."] }
  ]
}
```

For LinkedIn organization posting, an active `OrgLinkedInPage` assignment for the author overrides the personal LinkedIn identity. See [LinkedIn Organization Integration](../api-reference.md#linkedin-organization-integration) in the canonical reference.

#### X (Twitter) threading and media

The Twitter client handles a few platform-specific behaviours automatically:

- Content longer than **280 characters** is split into a thread of reply-chained tweets with `(1/N)` counters when there's more than one chunk.
- Up to **4 images** per tweet; more are distributed across the thread.
- **Video** uses Twitter's chunked upload (INIT/APPEND/FINALIZE/STATUS poll). Processing is polled for up to 30 seconds.
- Images and video can't be combined in the same tweet — video goes in its own tweet in the thread.

### Document sync (delta)

Native clients keep a local copy of the user's documents using delta sync. Initial load:

```http
GET /api/documents/sync
Authorization: Bearer il_tok_...
```

Subsequent loads pass the prior `syncedAt`:

```http
GET /api/documents/sync?lastSyncAt=2025-06-10T00:00:00.000Z
```

The response reports `syncedAt`, the full folder list, and documents that changed since `lastSyncAt`. Items with `"deleted": true` should be removed locally. Pushing local edits back uses `POST /api/documents/sync` with a batch of operations.

### List-to-document export

The web app's **List to Doc** button is subscriber-only. External clients can replicate it with two API calls.

**1. Fetch the rows (cap at 500 per the web app behaviour):**

```http
GET /api/lists/{id}/data?limit=500&offset=0
Authorization: Bearer il_tok_...
```

Field definitions come from `GET /api/lists/{id}` (the `properties` array).

**2. Build the Markdown.** Choose a list style and a row style:

| Option | Values |
|--------|--------|
| `listStyle` | `numbered` (`1.` `2.` `3.`) or `bulleted` (`-`) |
| `rowDataStyle` | `inline` (comma-delimited on one line) or `sub-items` (key: value sub-bullets) |

**Numbered + inline:**

```markdown
# My List

**Name, Age, Role**

1. Alice, 30, Engineer
2. Bob, 25, Designer
```

**Bulleted + sub-items:**

```markdown
# My List

- Alice
  - Age: 30
  - Role: Engineer
```

When `pagination.total > 500`, prepend a blockquote so the reader knows the export was truncated:

```markdown
> ⚠ Showing first 500 of 1243 rows.
```

**3. Create the document:**

```http
POST /api/documents
Authorization: Bearer il_tok_...
Content-Type: application/json

{
  "title": "My List",
  "content": "<markdown from step 2>",
  "relativePath": "my-list-list-a1b2c3d4.md"
}
```

`relativePath` should be unique. A reliable pattern is `{slugified-title}-list-{listId.slice(0,8)}.md`.

### Two-step media upload

Images and videos attached to a message are uploaded first, then referenced by URL:

```http
POST /api/messages/images/upload
Authorization: Bearer il_tok_...
Content-Type: multipart/form-data

file=<binary>
```

Response: `{ "url": "https://..." }`. Pass the URL(s) in `imageUrls` or `videoUrls` on the subsequent `POST /api/messages`.

Constraints: images ≤ 1.4 MB after server-side resize (max 1200 px side); video ≤ 3 MB, no server transcoding; up to 8 images and 1 video per message. Both endpoints require a subscription and a verified email.

## OAuth providers

All OAuth flows are redirect-based — see the canonical reference for the per-provider details. Two universal patterns:

- Add `?link=true` to any authorize URL to attach the identity to the current session instead of starting a sign-in.
- Native clients can pass `?redirect_uri=<scheme>://callback` (must be on the server allowlist) so the callback returns a `?token=...` instead of setting a cookie. Useful when the OAuth flow happens in a web view inside a native app.

For LinkedIn account-linking, the `?link=true` flow requests the extended scopes `rw_organization_admin w_organization_social` so the user's administered company pages can be discovered as personal posting targets. The discovery happens automatically in the callback; afterwards re-discover with `POST /api/linkedin/sync-pages`.

## Rate limits, CORS, and security

- Rate limits are instance-specific. Check your deployment configuration.
- The web app is same-origin. For third-party browser clients, the deployment must allow your origin in CORS.
- Admin endpoints under `/api/admin/*` and the architecture-aggregates routes are gated by **both** the `Administrator` table and ownership of the `The Public` system organization. They're not part of the public API contract.

## Full endpoint reference

For every endpoint — method, path, auth mode, subscriber gate, request body, response shape, and per-status error conditions — see:

- [`docs/api-reference.md`](../api-reference.md) — canonical, single-file
- `/help/api` in a running deployment — same content rendered per category

When endpoints change, update the canonical file first.
