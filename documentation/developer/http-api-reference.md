---
title: HTTP API reference
---

# HTTP API reference

**Audience:** Developers building applications, scripts, or integrations against InterlinedList. In-app help for everyday website use lives under **Help** in the product; this file is repository documentation only.

This section describes the HTTP APIs available on top of InterlinedList. All APIs use JSON for request and response bodies unless noted. The base URL is your deployment (e.g. `https://interlinedlist.com` for production); paths are relative to that (e.g. `/api/messages`).

## Authentication

Most endpoints require authentication. There are two supported methods:

### Session (cookies)

Used by the web app. After **login**, the server sets an HTTP-only session cookie. Subsequent requests from the same origin automatically include it. Use this when building browser-based clients that run on the same domain (e.g. the official app).

- **Login**: `POST /api/auth/login` with `{ "email", "password" }` → sets session cookie, returns user info.
- **Logout**: `POST /api/auth/logout` → clears session.
- **Register**: `POST /api/auth/register` with body per route.
- **Current user**: `GET /api/user` → returns the authenticated user (session or Bearer).

### Sync token (Bearer)

Used by the Document Sync CLI and other non-browser clients. You obtain a token once and send it on each request.

- **Obtain a token**: `POST /api/auth/sync-token` with `{ "email", "password" }`. Response includes `{ "token": "..." }`. Store it securely.
- **Use the token**: Send `Authorization: Bearer <your-token>` on requests. Only certain endpoints accept Bearer auth (see below).

Endpoints that support **Bearer** are documented as “Session or Bearer”. All other authenticated endpoints use **session only**.

## Common behavior

- **Errors**: APIs return JSON like `{ "error": "Message" }` with an appropriate HTTP status (400, 401, 403, 404, 500).
- **Pagination**: List endpoints often support `limit`, `offset`, and sometimes `page` as query parameters. Responses may include a `pagination` object with `total`, `limit`, `offset`, `hasMore`.

---

## Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Log in with email and password; sets session cookie. |
| POST | `/api/auth/logout` | Clear session. |
| POST | `/api/auth/register` | Create account (body: email, password, username, etc.). |
| POST | `/api/auth/sync-token` | Exchange email/password for a sync token (no cookie). |
| POST | `/api/auth/send-verification-email` | Resend verification email. |
| POST | `/api/auth/verify-email` | Verify email (e.g. token from link). |
| POST | `/api/auth/forgot-password` | Request password reset email. |
| POST | `/api/auth/reset-password` | Reset password with token. |
| GET  | `/api/auth/github/authorize` | Redirect to GitHub OAuth. |
| GET  | `/api/auth/github/callback` | GitHub OAuth callback. |
| GET  | `/api/auth/mastodon/authorize` | Redirect to Mastodon OAuth. Query: `instance` (Mastodon instance hostname). |
| GET  | `/api/auth/mastodon/callback` | Mastodon OAuth callback. |
| GET  | `/api/auth/bluesky/authorize` | Redirect to Bluesky OAuth. |
| GET  | `/api/auth/bluesky/callback` | Bluesky OAuth callback. |
| GET  | `/api/auth/linkedin/authorize` | Redirect to LinkedIn OAuth. |
| GET  | `/api/auth/linkedin/callback` | LinkedIn OAuth callback. |
| GET  | `/api/auth/linkedin/status` | Check whether LinkedIn OAuth is configured on this instance. Returns `{ configured: boolean, redirectUri?: string }`. |

### Social OAuth — sign-in vs. account linking

All three social providers (Mastodon, Bluesky, LinkedIn) support two modes, controlled by the `?link=true` query parameter on the authorize endpoint:

- **Without `link=true`** (default): sign-in / register flow. On success the server creates or updates a session cookie and redirects to `/dashboard`. If no local account exists for the provider identity, a new account is created automatically.
- **With `link=true`**: account-linking flow. The user must already be logged in. On success the provider identity is attached to the existing account as a `LinkedIdentity` and the server redirects to `/settings`. Use this when a signed-in user wants to connect a social account for cross-posting.

Attempting `?link=true` without an active session redirects to `/login` with an error. Attempting to link a provider identity already linked to a different account returns an error redirect to `/settings`.

After linking, the identity's `id` from `GET /api/user/identities` is the value to supply in `mastodonProviderIds` when cross-posting. Bluesky and LinkedIn use the dedicated `crossPostToBluesky` / `crossPostToLinkedIn` boolean fields instead — the server resolves the linked identity automatically.

---

## User

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | `/api/user` | Session or Bearer | Current authenticated user. |
| POST | `/api/user/update` | Session | Update profile (displayName, bio, settings, etc.). |
| POST | `/api/user/avatar/upload` | Session | Upload avatar (multipart). |
| POST | `/api/user/avatar/from-url` | Session | Set avatar from URL. |
| POST | `/api/user/change-email/request` | Session | Request email change. |
| POST | `/api/user/delete` | Session | Delete account. |
| GET  | `/api/user/identities` | Session | Linked OAuth identities. |
| GET  | `/api/user/organizations` | Session | Organizations the user belongs to. |

---

## Messages

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | `/api/messages` | Session or Bearer | List messages (query: `limit`, `offset`, `onlyMine`, `tag`). |
| POST | `/api/messages` | Session or Bearer | Create a message. See body reference below. |
| GET  | `/api/messages/scheduled` | Session or Bearer | List the current user's upcoming scheduled messages (query: `range` — `today`, `week`, or `month`; default `month`). |
| GET  | `/api/messages/[id]` | Session or Bearer | Get one message by ID. |
| PUT  | `/api/messages/[id]` | Session or Bearer | Update a message (content, publiclyVisible). |
| DELETE | `/api/messages/[id]` | Session or Bearer | Delete a message (own only). |
| GET  | `/api/messages/[id]/replies` | Session | Get replies to a message. |
| POST | `/api/messages/[id]/dig` | Session | Add **I Dig!** (idempotent). Returns `{ digCount, dugByMe }`. |
| DELETE | `/api/messages/[id]/dig` | Session | Remove your dig. Returns `{ digCount, dugByMe }`. |
| POST | `/api/messages/[id]/metadata` | Session | Trigger link metadata fetch for the message. |
| POST | `/api/messages/images/upload` | Session or Bearer | Upload an image (multipart `file` field). Returns `{ url }`. **Subscriber only.** |
| POST | `/api/messages/videos/upload` | Session or Bearer | Upload a video (multipart `file` field). Returns `{ url }`. **Subscriber only.** |

### POST /api/messages — body reference

All fields except `content` are optional.

| Field | Type | Description |
| ----- | ---- | ----------- |
| `content` | string | Message text. Required (unless `pushedMessageId` is set with no comment). Trimmed; max length from the user's `maxMessageLength` setting (default 666). |
| `publiclyVisible` | boolean | Whether the message is public. Defaults to the user's `defaultPubliclyVisible` setting. Push messages are always public. |
| `parentId` | string | ID of the message being replied to. Mutually exclusive with `pushedMessageId`. |
| `pushedMessageId` | string | ID of a public message to push (repost). Mutually exclusive with `parentId`. `content` may be empty for a plain push or non-empty to push with a comment. Scheduled posts and replies cannot be combined with a push. |
| `tags` | string[] | Array of tag strings to attach to the message. |
| `imageUrls` | string[] | Up to 8 image URLs obtained from `POST /api/messages/images/upload`. **Subscriber only.** |
| `videoUrls` | string[] | At most 1 video URL obtained from `POST /api/messages/videos/upload`. **Subscriber only.** |
| `scheduledAt` | string (ISO 8601) | Future datetime to publish the message. Must be in the future. Cannot be combined with `parentId` or `pushedMessageId`. **Subscriber only.** |
| `mastodonProviderIds` | string[] | IDs of linked Mastodon identities (from `GET /api/user/identities`) to cross-post to. Skipped for replies and push messages. **Subscriber only.** |
| `crossPostToBluesky` | boolean | Cross-post to the user's linked Bluesky account. Skipped for replies and push messages. **Subscriber only.** |
| `crossPostToLinkedIn` | boolean | Cross-post to the user's linked LinkedIn account. Skipped for replies and push messages. **Subscriber only.** |

### Subscriber-only features

The fields `imageUrls`, `videoUrls`, `scheduledAt`, `mastodonProviderIds`, `crossPostToBluesky`, and `crossPostToLinkedIn` are restricted to paid subscribers. Sending any of these fields as a free user returns **403** with the error `"Subscribe to unlock images, video, cross-posting, and scheduled posts."`.

The user's subscription status is available on `GET /api/user` as `customerStatus`. Active subscribers have a value of `"subscriber"`, `"subscriber:monthly"`, or `"subscriber:annual"`.

### Scheduled posts

When `scheduledAt` is provided, the message is saved but not published immediately. The cron job at `GET /api/cron/publish-scheduled-messages` runs periodically and publishes due messages, executing any configured cross-posting at that time. Use `GET /api/messages/scheduled` to list pending scheduled posts.

### Cross-posting

Cross-posting sends the message to external platforms at post time (or at the scheduled time for deferred posts). The user must have the relevant accounts linked under `GET /api/user/identities`. The response includes a `crossPostResults` array reporting success or failure per platform. Plain push messages (no comment) do not support cross-posting.

> **Coming soon:** Organization-scoped posting will allow publishing a message on behalf of an organization. The button is present in the posting UI but is not yet active.

### Tags

Tags are free-form string labels attached to a message. Any authenticated user can tag their own messages.

#### Setting tags — `POST /api/messages`

Pass a `tags` array in the request body:

```json
{
  "content": "Something interesting",
  "tags": ["music", "jazz"]
}
```

Tags are stored as-is (case-sensitive). No normalisation is applied server-side; lowercase is recommended for consistency.

#### Filtering by tag — `GET /api/messages`

Use the `tag` query parameter to return only messages that include a specific tag:

```http
GET /api/messages?tag=jazz
```

The filter is applied after all other feed filters (authentication, viewing preference, `onlyMine`), so it can be combined freely:

```http
GET /api/messages?tag=jazz&onlyMine=true&limit=20&offset=0
```

The response shape is identical to `GET /api/messages` without a tag filter — messages and pagination object.

#### Reading tags on a message

The `tags` field is present on every message object returned by the API:

```json
{
  "id": "abc123",
  "content": "Something interesting",
  "tags": ["music", "jazz"],
  ...
}
```

When no tags were set the field is either `null` or absent.

### Response

On success the API returns **201** with:

```json
{
  "message": "Message created successfully",
  "data": { ...message object... },
  "scheduledAt": "2025-06-01T10:00:00.000Z",
  "crossPostResults": [
    { "providerId": "...", "instanceName": "mastodon.social", "success": true, "url": "https://..." },
    { "providerId": "", "instanceName": "Bluesky", "success": false, "error": "..." }
  ]
}
```

`scheduledAt` and `crossPostResults` are only present when applicable.

### Uploading images and videos (two-step flow)

Attaching media to a message requires two steps: upload the file first to get a URL, then include that URL when creating the message. Both upload endpoints require an active subscriber account and a verified email. Bearer token auth is supported, so native clients (iOS, CLI) can use the same flow as the web app.

#### Step 1 — upload the file

Send a `multipart/form-data` POST with a single field named `file`.

```http
POST /api/messages/images/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file=<binary image data>
```

Response `200`:

```json
{ "url": "https://your-blob-store.public.blob.vercel-storage.com/messages/…/1234-abc.jpg" }
```

Image constraints:

- Accepted formats: JPEG, PNG, WebP, GIF (any `image/*` MIME type)
- Automatically resized to fit within 1200×1200 pixels (aspect ratio preserved)
- Output size capped at 1.4 MB; JPEG quality is reduced iteratively if needed
- EXIF orientation is corrected automatically
- Output format: JPEG for most inputs; PNG preserved if the PNG output fits within 1.4 MB
- Returns **413** if the image cannot be brought within limits even at minimum JPEG quality

Video constraints:

- Accepted formats: MP4 (`video/mp4`), WebM (`video/webm`), QuickTime (`video/quicktime`), AVI (`video/x-msvideo`)
- Maximum size: 3 MB (raw — no server-side transcoding)
- Returns **400** if the format is unsupported or the file exceeds 3 MB

#### Step 2 — create the message with the URL

Pass the URL(s) returned in step 1 in the `imageUrls` or `videoUrls` fields of `POST /api/messages`:

```json
{
  "content": "Check this out",
  "publiclyVisible": true,
  "imageUrls": [
    "https://your-blob-store.public.blob.vercel-storage.com/messages/…/1234-abc.jpg",
    "https://your-blob-store.public.blob.vercel-storage.com/messages/…/1235-def.jpg"
  ]
}
```

Up to **8 images** and **1 video** may be attached to a single message. Images and video may be combined in the same message.

Error responses for upload endpoints:

| Status | Meaning |
| ------ | ------- |
| 400 | No file provided, unsupported format, or video exceeds 3 MB |
| 401 | Not authenticated |
| 403 | Email not verified, or not a subscriber |
| 413 | Image could not be resized to fit within limits |
| 500 | Upload to blob storage failed |

---

## Lists

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | `/api/lists` | Session | Current user’s lists (query: `limit`, `offset`, `page`). |
| POST | `/api/lists` | Session | Create list (title, description, schema DSL, optional parent). |
| GET  | `/api/lists/[id]` | Session | Get list (metadata, schema). |
| PATCH | `/api/lists/[id]` | Session | Update list. |
| DELETE | `/api/lists/[id]` | Session | Delete list. |
| GET  | `/api/lists/[id]/schema` | Session | Get list schema. |
| PUT  | `/api/lists/[id]/schema` | Session | Update list schema. |
| GET  | `/api/lists/[id]/data` | Session | List rows (query: pagination). |
| POST | `/api/lists/[id]/data` | Session | Add row. |
| GET  | `/api/lists/[id]/data/[rowId]` | Session | Get one row. |
| PATCH | `/api/lists/[id]/data/[rowId]` | Session | Update row. |
| DELETE | `/api/lists/[id]/data/[rowId]` | Session | Delete row. |
| GET  | `/api/lists/[id]/watchers` | Session | List watchers. |
| GET  | `/api/lists/[id]/watchers/users` | Session | Users with access (watchers, collaborators, managers). |
| GET  | `/api/users/[username]/lists` | None | Public lists for a user (by username). |
| GET  | `/api/users/[username]/lists/[id]` | None | Public list by ID (read-only). |
| GET  | `/api/users/[username]/lists/[id]/data` | None | Public list rows (read-only). |

### Exporting a list to a document (List to Doc)

The web app's **List to Doc** button (subscriber-only) converts an entire list into a Markdown document saved to the user's document library. External clients can replicate this flow using two existing API calls.

#### Step 1 — fetch the list rows

```http
GET /api/lists/{id}/data?limit=500&offset=0
Authorization: Bearer <token>
```

Response:

```json
{
  "rows": [
    { "id": "...", "rowData": { "Name": "Alice", "Age": "30", "Role": "Engineer" }, ... },
    { "id": "...", "rowData": { "Name": "Bob",   "Age": "25", "Role": "Designer" }, ... }
  ],
  "pagination": { "total": 2, "limit": 500, "offset": 0, "hasMore": false }
}
```

Each row's data lives in `rowData`. The list's field definitions and display order come from `GET /api/lists/{id}` (the `properties` array on the list object).

> **Row cap**: The web app caps the export at 500 rows. If `pagination.total` exceeds 500, include a note in the document so readers know the export is truncated.

#### Step 2 — build the Markdown

Choose a combination of two options:

| Option | Values |
| ------ | ------ |
| `listStyle` | `numbered` — `1.` `2.` `3.` &nbsp;&nbsp; or &nbsp;&nbsp; `bulleted` — `-` |
| `rowDataStyle` | `inline` — comma-delimited on one line &nbsp;&nbsp; or &nbsp;&nbsp; `sub-items` — key: value sub-bullets |

**Numbered + inline** (fields as a bold header row, then one line per row):

```markdown
# My List

**Name, Age, Role**

1. Alice, 30, Engineer
2. Bob, 25, Designer
```

**Bulleted + inline**:

```markdown
# My List

**Name, Age, Role**

- Alice, 30, Engineer
- Bob, 25, Designer
```

**Numbered + sub-items** (first field value is the parent label; remaining fields as sub-enumerated key: value):

```markdown
# My List

1. Alice
   1. Age: 30
   2. Role: Engineer
2. Bob
   1. Age: 25
   2. Role: Designer
```

**Bulleted + sub-items**:

```markdown
# My List

- Alice
  - Age: 30
  - Role: Engineer
- Bob
  - Age: 25
  - Role: Designer
```

When the export is truncated, prepend a blockquote before the list:

```markdown
> ⚠ Showing first 500 of 1243 rows.
```

#### Step 3 — create the document

```http
POST /api/documents
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "My List",
  "content": "<markdown from step 2>",
  "relativePath": "my-list-list-a1b2c3d4.md"
}
```

`relativePath` should be unique per list. A reliable pattern is `{slugified-title}-list-{listId.slice(0,8)}.md`.

Response `201`:

```json
{ "message": "Document created", "document": { "id": "...", "title": "My List", ... } }
```

---

## List connections

Connections create labelled, directed relationships between two lists owned by the same user — useful for modelling related datasets, parent/child structures, or any graph of linked lists.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/lists/connections` | Session | All connections between the current user's lists. Returns `{ connections }`. |
| POST | `/api/lists/connections` | Session | Create a connection. Body: `fromListId`, `toListId`, optional `label`. Returns `201`. |
| DELETE | `/api/lists/connections/[id]` | Session | Remove a connection by ID. |

### Connection object

```json
{
  "id": "conn_abc001",
  "fromListId": "lst_abc001",
  "toListId": "lst_abc002",
  "label": "references",
  "createdAt": "2025-06-11T10:00:00.000Z"
}
```

The connection is directional: `fromListId` is the source, `toListId` is the target. `label` is optional free-form text (e.g. `"related"`, `"references"`, `"parent"`).

### POST /api/lists/connections

```http
POST /api/lists/connections
Content-Type: application/json

{
  "fromListId": "lst_abc001",
  "toListId": "lst_abc002",
  "label": "references"
}
```

Response `201`: the created connection object.

| Status | Meaning |
|--------|---------|
| 400 | `fromListId` or `toListId` missing, or both IDs are identical |
| 403 | Current user does not own both lists |
| 409 | A connection between these two lists already exists |

### GET /api/lists/connections

Returns all connections where either the source or target list belongs to the current user.

```json
{
  "connections": [
    {
      "id": "conn_abc001",
      "fromListId": "lst_abc001",
      "toListId": "lst_abc002",
      "label": "references",
      "createdAt": "2025-06-11T10:00:00.000Z"
    }
  ]
}
```

### DELETE /api/lists/connections/[id]

Removes the connection. The server verifies the current user owns both lists before deleting. Returns `{ "success": true }` on success.

---

## Documents and sync

Document and folder CRUD is available via the **sync API**, which supports both session and Bearer token. This is the same API used by the Document Sync CLI.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | `/api/documents/sync` | Session or Bearer | Sync state: folders and documents. Query: `lastSyncAt` (ISO date) for delta sync. |
| POST | `/api/documents/sync` | Session or Bearer | Apply a batch of operations (create/update/delete folders and documents). |
| GET  | `/api/documents` | Session | List documents (e.g. with folder filter). |
| POST | `/api/documents` | Session | Create document. |
| GET  | `/api/documents/[id]` | Session | Get document. |
| PATCH | `/api/documents/[id]` | Session | Update document. |
| DELETE | `/api/documents/[id]` | Session | Delete document. |
| POST | `/api/documents/[id]/images/upload` | Session | Upload image for document (e.g. paste/drop). |
| GET  | `/api/documents/folders` | Session | List folders. |
| POST | `/api/documents/folders` | Session | Create folder. |
| GET  | `/api/documents/folders/[id]` | Session | Get folder. |
| PATCH | `/api/documents/folders/[id]` | Session | Update folder. |
| DELETE | `/api/documents/folders/[id]` | Session | Delete folder. |
| GET  | `/api/documents/folders/[id]/documents` | Session | Documents in folder. |

---

## Follows

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/follow/[userId]` | Session | Follow a user. |
| DELETE | `/api/follow/[userId]` | Session | Unfollow a user. |
| GET    | `/api/follow/[userId]/status` | Session | Follow relationship status. |
| GET    | `/api/follow/[userId]/followers` | Session | User’s followers. |
| GET    | `/api/follow/[userId]/following` | Session | Users they follow. |
| GET    | `/api/follow/[userId]/counts` | Session | Follower/following counts. |
| GET    | `/api/follow/[userId]/mutual` | Session | Mutual follows. |
| POST   | `/api/follow/[userId]/approve` | Session | Approve follow request (private accounts). |
| POST   | `/api/follow/[userId]/reject` | Session | Reject follow request. |
| POST   | `/api/follow/[userId]/remove` | Session | Remove a follower. |
| GET    | `/api/follow/requests` | Session | Pending follow requests (for current user). |

---

## Organizations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | `/api/organizations` | Session | List organizations (query: `public=true`, or `userId` for my orgs). |
| POST | `/api/organizations` | Session | Create organization. |
| GET  | `/api/organizations/[id]` | Session | Get organization. |
| PATCH | `/api/organizations/[id]` | Session | Update organization. |
| GET  | `/api/organizations/[id]/members` | Session | List members. |
| POST | `/api/organizations/[id]/members` | Session | Add member. Body: `{ "userId": "...", "role": "member" }`. |
| PUT | `/api/organizations/[id]/members/[userId]` | Session | Update member role. Body: `{ "role": "owner" \| "admin" \| "member" }`. Optional: `active` (boolean). |
| DELETE | `/api/organizations/[id]/members/[userId]` | Session | Remove member. |
| GET  | `/api/organizations/[id]/users` | Session | Users in org (with roles). |

### Updating a member's role

Valid roles are `"owner"`, `"admin"`, and `"member"`. Requires the caller to be an owner or admin of the organization. The last owner of an organization cannot be demoted or removed (returns `400`).

```http
PUT /api/organizations/org_001/members/clx9user00003
Content-Type: application/json

{ "role": "admin" }
```

Response `200`:

```json
{
  "message": "Member role updated successfully",
  "membership": {
    "id": "mem_xyz001",
    "userId": "clx9user00003",
    "organizationId": "org_001",
    "role": "admin",
    "active": true,
    "createdAt": "2025-06-11T10:00:00.000Z"
  }
}
```

Pass `"active": false` alongside `role` to suspend a member's access without removing them from the organization.

---

## Exports

All export endpoints return CSV (or similar) and require a session.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/exports/messages` | Session | Export current user’s messages as CSV. |
| GET | `/api/exports/lists` | Session | Export list definitions. |
| GET | `/api/exports/list-data-rows` | Session | Export list data rows. |
| GET | `/api/exports/follows` | Session | Export followers and following. |

---

## Notifications

Notifications are generated server-side for events such as new followers, replies, and dig reactions. All notification endpoints require a session cookie.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/notifications` | Session | Unread tray items. Required query: `scope=tray`. Returns `{ unreadCount, items }`. |
| PATCH | `/api/notifications/[id]/read` | Session | Mark one notification read (idempotent). Returns `{ ok: true }`. |
| POST | `/api/notifications/mark-all-read` | Session | Mark all unread notifications read. Returns `{ ok: true, updated: N }`. |

### Notification object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique notification ID. |
| `title` | string | Short heading. |
| `body` | string | Full notification text. |
| `actionUrl` | string \| null | Relative URL to navigate to on click. |
| `type` | string \| null | Category string (e.g. `"follow"`, `"dig"`, `"reply"`). |
| `metadata` | object | Arbitrary structured data attached by the server. |
| `createdAt` | string (ISO 8601) | Creation timestamp. |
| `readAt` | string \| null | Read timestamp; `null` if unread. |

### GET /api/notifications

The `scope=tray` query parameter is required. Returns up to the user's configured tray limit (default 20, clamped 10–40) of the most recent unread items, plus a total `unreadCount`.

```http
GET /api/notifications?scope=tray
```

Response `200`:

```json
{
  "unreadCount": 3,
  "items": [
    {
      "id": "notif_abc001",
      "title": "New follower",
      "body": "someuser started following you.",
      "actionUrl": "/profile/someuser",
      "type": "follow",
      "metadata": {},
      "createdAt": "2025-06-11T10:00:00.000Z",
      "readAt": null
    }
  ]
}
```

Omitting `scope=tray` returns **400**.

### Marking notifications read

```http
PATCH /api/notifications/notif_abc001/read
```

Response `200`: `{ "ok": true }`. Safe to call multiple times; idempotent.

```http
POST /api/notifications/mark-all-read
```

Response `200`: `{ "ok": true, "updated": 3 }`. `updated` is the count of rows changed from unread to read.

---

## Other

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/user/[username]/messages` | Optional | Messages for a user by username (public or own). |
| GET | `/api/location` | Session | User’s profile location (lat/lng). |
| GET | `/api/weather` | Session | Weather (e.g. for profile location). |
| GET | `/api/images/proxy` | Varies | Proxy an image URL (e.g. for CORS or privacy). |
| GET | `/api/oauth/client-metadata` | None | OAuth client metadata for the app. |

---

## Document Sync CLI and Bearer auth

The Document Sync CLI and native clients (e.g. iOS app) use the sync token for API access. End users install the CLI from in-app **Help → Tooling (CLI)** on [interlinedlist.com/help/tooling](https://interlinedlist.com/help/tooling). Contributors testing against a local server: see [cli-against-local-server.md](./cli-against-local-server.md).

Obtain a token via `POST /api/auth/sync-token`, then send `Authorization: Bearer <token>` on requests. Bearer auth is supported for: `GET /api/user`; `GET`, `POST`, and `GET /api/messages/scheduled` under the messages API; `GET`, `PUT`, and `DELETE /api/messages/[id]`; and `GET` and `POST /api/documents/sync`. All subscriber-only restrictions (images, video, cross-posting, scheduled posts) are enforced the same way for Bearer callers as for session callers.

---

## Rate limits and CORS

- Rate limits (if any) are instance-specific; check your deployment configuration.
- The web app is same-origin; CORS is typically configured for the app domain. For third-party browser clients, the instance may need to allow your origin.
- Admin endpoints (e.g. under `/api/admin/`) are not listed here and are restricted to administrators.
