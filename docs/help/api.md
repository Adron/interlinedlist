---
title: API for Developers
---

# API for Developers

InterlinedList exposes an HTTP API that lets you build integrations, native clients, scripts, and automations on top of the platform. All request and response bodies are JSON unless noted otherwise.

## Base URL

Paths are relative to the InterlinedList deployment you are targeting:

```
https://interlinedlist.com
```

For example: `https://interlinedlist.com/api/messages`

---

## Authentication

Two methods are supported depending on the type of client you are building.

### Session (cookie)

The web app uses HTTP-only session cookies. Log in once and subsequent same-origin requests carry the cookie automatically. Suitable for browser-based clients on the same domain.

**Request:**

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "you@example.com",
  "password": "yourpassword"
}
```

**Response (200):**

```json
{
  "id": "clx7k2m0p0000abc123def456",
  "username": "yourhandle",
  "email": "you@example.com",
  "displayName": "Your Name",
  "bio": null,
  "avatarUrl": null,
  "emailVerified": true,
  "customerStatus": "free",
  "createdAt": "2025-03-12T18:00:00.000Z"
}
```

The server sets an HTTP-only `session` cookie on the response. Include `credentials: 'include'` in any `fetch` call (or `withCredentials: true` in Axios) to carry it on subsequent requests.

**Error (401) — wrong credentials:**

```json
{ "error": "Invalid email or password" }
```

**Error (403) — email not yet verified:**

```json
{ "error": "Email not verified" }
```

---

### Bearer token

Use this for non-browser clients: CLI tools, mobile apps, desktop apps, and server-side scripts.

**Step 1 — obtain a token:**

```http
POST /api/auth/sync-token
Content-Type: application/json

{
  "email": "you@example.com",
  "password": "yourpassword"
}
```

**Response (200):**

```json
{
  "token": "il_tok_a1b2c3d4e5f6g7h8i9j0..."
}
```

Store this token securely (e.g. in a `.env` file or OS keychain). It does not expire automatically.

**Step 2 — include it on every request:**

```http
GET /api/messages
Authorization: Bearer il_tok_a1b2c3d4e5f6g7h8i9j0...
```

Endpoints that accept Bearer tokens are marked **Session or Bearer** in the tables below. All other authenticated endpoints require a session cookie.

---

### Registering a new account

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "new@example.com",
  "password": "strongpassword123",
  "username": "myhandle"
}
```

**Response (201):**

```json
{
  "id": "clx7k2m0p0000abc123def456",
  "username": "myhandle",
  "email": "new@example.com",
  "emailVerified": false,
  "customerStatus": "free",
  "createdAt": "2025-06-01T10:00:00.000Z"
}
```

A verification email is sent automatically. The account is usable immediately but some features require a verified email. To resend the verification email:

```http
POST /api/auth/send-verification-email
Content-Type: application/json

{ "email": "new@example.com" }
```

When the user clicks the link in the email, the token in the URL is exchanged:

```http
POST /api/auth/verify-email
Content-Type: application/json

{ "token": "<token-from-email-link>" }
```

**Response (200):**

```json
{ "message": "Email verified successfully" }
```

---

### Password reset

**Step 1 — request a reset email:**

```http
POST /api/auth/forgot-password
Content-Type: application/json

{ "email": "you@example.com" }
```

**Response (200):**

```json
{ "message": "If that email exists, a reset link has been sent." }
```

**Step 2 — submit the new password using the token from the email link:**

```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "<token-from-email-link>",
  "password": "newstrongpassword456"
}
```

**Response (200):**

```json
{ "message": "Password reset successfully" }
```

---

### OAuth (GitHub, Mastodon, Bluesky, LinkedIn)

OAuth flows are redirect-based. Your client navigates to the authorize URL; on success the server redirects back to the app with a session cookie set.

**Sign in with GitHub:**

```
GET /api/auth/github/authorize
```

**Link GitHub to an existing session** (add the account without signing out):

```
GET /api/auth/github/authorize?link=true
```

**Sign in with Mastodon** (supply the instance hostname as a query param):

```
GET /api/auth/mastodon/authorize?instance=mastodon.social
```

**Sign in with Bluesky:**

```
GET /api/auth/bluesky/authorize
```

**Sign in with LinkedIn:**

```
GET /api/auth/linkedin/authorize
```

All four support `?link=true` to link the identity to an already-authenticated session rather than starting a new one.

---

### Logging out

```http
POST /api/auth/logout
```

**Response (200):**

```json
{ "message": "Logged out successfully" }
```

The session cookie is cleared server-side.

---

## Response conventions

**Errors** always return JSON with an `error` field:

```json
{ "error": "Not authenticated" }
```

Common status codes: `400` bad request, `401` not authenticated, `403` forbidden (e.g. email not verified, subscriber feature), `404` not found, `500` server error.

**Paginated lists** include a `pagination` object alongside the data array:

```json
{
  "data": [ ... ],
  "pagination": {
    "total": 84,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

Use `limit` and `offset` (or `page`) as query parameters to page through results.

---

## Quick start

### 1. Get a Bearer token

```http
POST /api/auth/sync-token
Content-Type: application/json

{ "email": "you@example.com", "password": "yourpassword" }
```

### 2. Verify the token works

```http
GET /api/user
Authorization: Bearer il_tok_...
```

### 3. Fetch your messages

```http
GET /api/messages?onlyMine=true&limit=10&offset=0
Authorization: Bearer il_tok_...
```

### 4. Post a message

```http
POST /api/messages
Authorization: Bearer il_tok_...
Content-Type: application/json

{
  "content": "Hello from the API!",
  "publiclyVisible": true,
  "tags": ["api", "hello"]
}
```

### 5. Fetch your lists

```http
GET /api/lists
Authorization: Bearer il_tok_...
```

### 6. Fetch your documents (delta sync)

```http
GET /api/documents/sync
Authorization: Bearer il_tok_...
```

Pass `?lastSyncAt=2025-01-01T00:00:00Z` to get only changes since a given time.

---

## Endpoints

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Log in with email and password; sets session cookie. |
| POST | `/api/auth/logout` | Clear session. |
| POST | `/api/auth/register` | Create a new account. Body: `email`, `password`, `username`. |
| POST | `/api/auth/sync-token` | Exchange email/password for a Bearer token. |
| POST | `/api/auth/forgot-password` | Send a password reset email. |
| POST | `/api/auth/reset-password` | Complete a password reset using the token from the email. |
| POST | `/api/auth/send-verification-email` | Resend the verification email. |
| POST | `/api/auth/verify-email` | Verify email address using the token from the link. |
| GET | `/api/auth/github/authorize` | Redirect to GitHub OAuth. Add `?link=true` to link to an existing session instead of signing in. |
| GET | `/api/auth/mastodon/authorize` | Redirect to Mastodon OAuth. Query: `instance` (Mastodon hostname). Add `?link=true` to link. |
| GET | `/api/auth/bluesky/authorize` | Redirect to Bluesky OAuth. Add `?link=true` to link. |
| GET | `/api/auth/linkedin/authorize` | Redirect to LinkedIn OAuth. Add `?link=true` to link. |

---

### User

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/user` | Session or Bearer | Current authenticated user. Includes `customerStatus` (see Subscriber features). |
| POST | `/api/user/update` | Session | Update profile fields: `displayName`, `bio`, settings, etc. |
| POST | `/api/user/avatar/upload` | Session | Upload a new avatar image (multipart `file` field). |
| POST | `/api/user/avatar/from-url` | Session | Set avatar from a URL. Body: `{ "url": "..." }`. |
| GET | `/api/user/identities` | Session | Linked OAuth identities (GitHub, Mastodon, Bluesky, LinkedIn). The `id` of each Mastodon identity is the value to pass in `mastodonProviderIds` when cross-posting. |
| GET | `/api/user/organizations` | Session | Organizations the current user belongs to. |
| POST | `/api/user/change-email/request` | Session | Request an email address change. |
| POST | `/api/user/delete` | Session | Permanently delete the account. |

#### GET /api/user — example response

```http
GET /api/user
Authorization: Bearer il_tok_...
```

```json
{
  "id": "clx7k2m0p0000abc123def456",
  "username": "yourhandle",
  "email": "you@example.com",
  "displayName": "Your Name",
  "bio": "I build things with APIs.",
  "avatarUrl": "https://cdn.example.com/avatars/yourhandle.webp",
  "emailVerified": true,
  "customerStatus": "subscriber:monthly",
  "defaultVisibility": "public",
  "createdAt": "2025-03-12T18:00:00.000Z"
}
```

#### POST /api/user/update — example

```http
POST /api/user/update
Content-Type: application/json

{
  "displayName": "New Display Name",
  "bio": "Updated bio text.",
  "defaultVisibility": "private"
}
```

**Response (200):** Returns the updated user object (same shape as `GET /api/user`).

#### GET /api/user/identities — example response

```json
[
  {
    "id": "clx9abc000001",
    "provider": "github",
    "providerUsername": "yourghhandle",
    "createdAt": "2025-04-01T09:00:00.000Z"
  },
  {
    "id": "clx9abc000002",
    "provider": "mastodon",
    "providerUsername": "yourhandle@mastodon.social",
    "instanceName": "mastodon.social",
    "createdAt": "2025-04-10T12:00:00.000Z"
  }
]
```

The `id` field on Mastodon entries is the value to use in `mastodonProviderIds` when cross-posting a message.

---

### Messages

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/messages` | Session or Bearer | List messages. Query: `limit`, `offset`, `onlyMine` (bool), `tag` (string). |
| POST | `/api/messages` | Session or Bearer | Create a message (see body reference below). Returns `201`. |
| GET | `/api/messages/[id]` | Session or Bearer | Get one message by ID. |
| PUT | `/api/messages/[id]` | Session or Bearer | Update a message (`content`, `publiclyVisible`). |
| DELETE | `/api/messages/[id]` | Session or Bearer | Delete a message (own messages only). |
| GET | `/api/messages/scheduled` | Session or Bearer | Upcoming scheduled messages. Query: `range` — `today`, `week`, or `month` (default `month`). |
| GET | `/api/messages/[id]/replies` | Session | Replies to a message. |
| POST | `/api/messages/[id]/dig` | Session | Add an **I Dig!** reaction (idempotent). Returns `{ digCount, dugByMe }`. |
| DELETE | `/api/messages/[id]/dig` | Session | Remove your dig. Returns `{ digCount, dugByMe }`. |
| POST | `/api/messages/images/upload` | Session or Bearer | Upload an image for attachment. Returns `{ url }`. **Subscriber only.** |
| POST | `/api/messages/videos/upload` | Session or Bearer | Upload a video for attachment. Returns `{ url }`. **Subscriber only.** |

#### GET /api/messages — example

```http
GET /api/messages?onlyMine=true&limit=2&offset=0
Authorization: Bearer il_tok_...
```

```json
{
  "data": [
    {
      "id": "msg_001",
      "content": "Just shipped a new feature!",
      "publiclyVisible": true,
      "tags": ["dev", "release"],
      "digCount": 4,
      "dugByMe": false,
      "replyCount": 1,
      "createdAt": "2025-06-10T14:22:00.000Z",
      "author": {
        "id": "clx7k2m0p0000abc123def456",
        "username": "yourhandle",
        "displayName": "Your Name",
        "avatarUrl": null
      }
    },
    {
      "id": "msg_002",
      "content": "Thinking about the new list schema design.",
      "publiclyVisible": false,
      "tags": ["design"],
      "digCount": 0,
      "dugByMe": false,
      "replyCount": 0,
      "createdAt": "2025-06-09T09:05:00.000Z",
      "author": {
        "id": "clx7k2m0p0000abc123def456",
        "username": "yourhandle",
        "displayName": "Your Name",
        "avatarUrl": null
      }
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 2,
    "offset": 0,
    "hasMore": true
  }
}
```

#### POST /api/messages body

| Field | Type | Description |
|-------|------|-------------|
| `content` | string | **Required** unless pushing with no comment. Max length from your account setting (default 666 chars). |
| `publiclyVisible` | boolean | Defaults to your account's default visibility. |
| `parentId` | string | Reply to this message ID. Mutually exclusive with `pushedMessageId`. |
| `pushedMessageId` | string | Repost this public message ID. `content` may be empty (plain repost) or non-empty (repost with comment). |
| `tags` | string[] | Free-form string labels. Case-sensitive; lowercase recommended. |
| `imageUrls` | string[] | Up to 8 URLs from `POST /api/messages/images/upload`. **Subscriber only.** |
| `videoUrls` | string[] | 1 URL from `POST /api/messages/videos/upload`. **Subscriber only.** |
| `scheduledAt` | string (ISO 8601) | Future datetime to publish. Cannot combine with `parentId` or `pushedMessageId`. **Subscriber only.** |
| `mastodonProviderIds` | string[] | Linked Mastodon identity IDs (from `GET /api/user/identities`) to cross-post to. **Subscriber only.** |
| `crossPostToBluesky` | boolean | Cross-post to linked Bluesky account. **Subscriber only.** |
| `crossPostToLinkedIn` | boolean | Cross-post to linked LinkedIn account. **Subscriber only.** |

**Example — simple public message:**

```http
POST /api/messages
Authorization: Bearer il_tok_...
Content-Type: application/json

{
  "content": "Hello from the API!",
  "publiclyVisible": true,
  "tags": ["api", "test"]
}
```

**Example — reply to a message:**

```http
POST /api/messages
Authorization: Bearer il_tok_...
Content-Type: application/json

{
  "content": "Great point, totally agree.",
  "publiclyVisible": true,
  "parentId": "msg_001"
}
```

**Example — scheduled cross-post (subscriber):**

```http
POST /api/messages
Authorization: Bearer il_tok_...
Content-Type: application/json

{
  "content": "Launching at 9 AM tomorrow!",
  "publiclyVisible": true,
  "scheduledAt": "2025-09-01T13:00:00.000Z",
  "crossPostToBluesky": true,
  "mastodonProviderIds": ["clx9abc000002"]
}
```

**Successful creation response (201):**

```json
{
  "message": "Message created successfully",
  "data": {
    "id": "msg_003",
    "content": "Hello from the API!",
    "publiclyVisible": true,
    "tags": ["api", "test"],
    "digCount": 0,
    "createdAt": "2025-06-11T08:00:00.000Z"
  }
}
```

When scheduling, `scheduledAt` is echoed back. When cross-posting, `crossPostResults` is included:

```json
{
  "message": "Message created successfully",
  "data": { ... },
  "scheduledAt": "2025-09-01T13:00:00.000Z",
  "crossPostResults": [
    { "provider": "bluesky", "success": true, "url": "https://bsky.app/profile/..." },
    { "instanceName": "mastodon.social", "success": true, "url": "https://mastodon.social/@yourhandle/..." }
  ]
}
```

#### Uploading images and videos (two-step flow)

**Step 1** — upload the file to get a URL:

```http
POST /api/messages/images/upload
Authorization: Bearer il_tok_...
Content-Type: multipart/form-data

file=<binary>
```

Response: `{ "url": "https://cdn.interlinedlist.com/images/abc123.webp" }`

**Step 2** — pass the URL in `imageUrls` when creating the message:

```http
POST /api/messages
Authorization: Bearer il_tok_...
Content-Type: application/json

{
  "content": "Check out this screenshot.",
  "publiclyVisible": true,
  "imageUrls": ["https://cdn.interlinedlist.com/images/abc123.webp"]
}
```

Image constraints: JPEG/PNG/WebP/GIF accepted; auto-resized to 1200 px max side, ≤ 1.4 MB output.
Video constraints: MP4/WebM/QuickTime/AVI; max 3 MB; no server transcoding.

---

### Lists

All list endpoints accept either a session cookie **or** a Bearer token, making them fully accessible from native iOS (and other non-browser) clients.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/lists` | Session or Bearer | Your lists. Query: `limit`, `offset`, `page`. |
| POST | `/api/lists` | Session or Bearer | Create a list. Body: `title`, `description`, `schema` (DSL), optional `parentId`, `isPublic`. |
| GET | `/api/lists/[id]` | Session or Bearer | List metadata and schema. |
| PUT | `/api/lists/[id]` | Session or Bearer | Update list metadata. |
| DELETE | `/api/lists/[id]` | Session or Bearer | Delete a list. |
| GET | `/api/lists/[id]/schema` | Session or Bearer | Get list schema. |
| PUT | `/api/lists/[id]/schema` | Session or Bearer | Update list schema. |
| POST | `/api/lists/[id]/refresh` | Session or Bearer | Refresh a GitHub-backed list from source. |
| GET | `/api/lists/[id]/data` | Session or Bearer | List rows. Query: `limit`, `offset`. |
| POST | `/api/lists/[id]/data` | Session or Bearer | Add a row. Body: `{ "rowData": { "Field": "value", ... } }`. |
| GET | `/api/lists/[id]/data/[rowId]` | Session or Bearer | Get one row. |
| PATCH | `/api/lists/[id]/data/[rowId]` | Session or Bearer | Update a row. |
| DELETE | `/api/lists/[id]/data/[rowId]` | Session or Bearer | Delete a row. |
| GET | `/api/lists/[id]/watchers` | Session or Bearer | Users watching this list. |
| GET | `/api/lists/[id]/watchers/me` | Session or Bearer | Whether the current user is watching this list. |
| GET | `/api/lists/[id]/watchers/users` | Session or Bearer | Users with access (watchers, collaborators, managers). |
| PUT | `/api/lists/[id]/watchers/[userId]` | Session or Bearer | Change a user's watcher role. |
| DELETE | `/api/lists/[id]/watchers/[userId]` | Session or Bearer | Remove a user from list access. |
| GET | `/api/users/[username]/lists` | None | Public lists for any user by username (no auth required). |
| GET | `/api/users/[username]/lists/[id]` | None | A specific public list (no auth required). |
| GET | `/api/users/[username]/lists/[id]/data` | None | Rows from a public list (no auth required). |

#### iOS / native client quick start

```http
GET /api/lists
Authorization: Bearer il_tok_...
```

```json
{
  "data": [
    {
      "id": "lst_abc001",
      "title": "Books to Read",
      "isPublic": true,
      "createdAt": "2025-06-11T08:30:00.000Z"
    }
  ],
  "pagination": { "total": 1, "limit": 50, "offset": 0, "hasMore": false }
}
```

#### Creating a list and adding rows

**Create the list:**

```http
POST /api/lists
Authorization: Bearer il_tok_...
Content-Type: application/json

{
  "title": "Books to Read",
  "description": "My reading backlog.",
  "isPublic": true,
  "schema": "Title:text, Author:text, Year:number, Read:boolean"
}
```

**Response (201):**

```json
{
  "id": "lst_abc001",
  "title": "Books to Read",
  "description": "My reading backlog.",
  "isPublic": true,
  "schema": "Title:text, Author:text, Year:number, Read:boolean",
  "createdAt": "2025-06-11T08:30:00.000Z"
}
```

**Add a row:**

```http
POST /api/lists/lst_abc001/data
Content-Type: application/json

{
  "rowData": {
    "Title": "The Dream Machine",
    "Author": "M. Mitchell Waldrop",
    "Year": 2001,
    "Read": false
  }
}
```

**Response (201):**

```json
{
  "id": "row_xyz001",
  "listId": "lst_abc001",
  "rowData": {
    "Title": "The Dream Machine",
    "Author": "M. Mitchell Waldrop",
    "Year": 2001,
    "Read": false
  },
  "createdAt": "2025-06-11T08:35:00.000Z"
}
```

**Fetch all rows:**

```http
GET /api/lists/lst_abc001/data?limit=50&offset=0
```

### List connections

Connections create labelled, directed relationships between two lists you own — useful for modelling related datasets, parent/child structures, or any graph of linked lists.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/lists/connections` | Session or Bearer | All connections between the current user's lists. Returns `{ connections }`. |
| POST | `/api/lists/connections` | Session or Bearer | Create a connection. Body: `fromListId`, `toListId`, optional `label`. Returns `201`. |
| DELETE | `/api/lists/connections/[id]` | Session or Bearer | Remove a connection. |

#### Connection object

```json
{
  "id": "conn_abc001",
  "fromListId": "lst_abc001",
  "toListId": "lst_abc002",
  "label": "references",
  "createdAt": "2025-06-11T10:00:00.000Z"
}
```

The connection is directional: `fromListId` is the source list and `toListId` is the target. `label` is optional free-form text describing the relationship (e.g. `"related"`, `"references"`, `"parent"`).

#### Creating a connection

```http
POST /api/lists/connections
Content-Type: application/json

{
  "fromListId": "lst_abc001",
  "toListId": "lst_abc002",
  "label": "references"
}
```

**Response (201):** The created connection object.

**Error 400** if `fromListId` or `toListId` is missing, or if both IDs are the same.
**Error 403** if the current user does not own both lists.
**Error 409** if the connection already exists.

#### Fetching all connections

```http
GET /api/lists/connections
```

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

Returns every connection where either the source or target list belongs to the current user. To remove a connection, `DELETE /api/lists/connections/{id}` — the server verifies ownership of both lists before deleting.

---

### Documents and sync

The sync API is the primary interface for document management.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/documents/sync` | Session or Bearer | All folders and documents. Pass `?lastSyncAt=<ISO date>` for delta sync (only changes since that time). |
| POST | `/api/documents/sync` | Session or Bearer | Batch apply operations: create, update, or delete folders and documents in one request. |
| GET | `/api/documents` | Session | List documents (supports folder filter). |
| POST | `/api/documents` | Session | Create a document. Body: `title`, `content` (markdown), optional `folderId`, `relativePath`, `isPublic`. |
| GET | `/api/documents/[id]` | Session | Get a document. |
| PATCH | `/api/documents/[id]` | Session | Update a document's title, content, or visibility. |
| DELETE | `/api/documents/[id]` | Session | Delete a document. |
| POST | `/api/documents/[id]/images/upload` | Session | Upload an image for embedding in a document (multipart). |
| GET | `/api/documents/folders` | Session | List folders. |
| POST | `/api/documents/folders` | Session | Create a folder. Body: `name`, optional `parentId`. |
| GET | `/api/documents/folders/[id]` | Session | Get a folder. |
| PATCH | `/api/documents/folders/[id]` | Session | Rename or reparent a folder. |
| DELETE | `/api/documents/folders/[id]` | Session | Delete a folder. |
| GET | `/api/documents/folders/[id]/documents` | Session | Documents inside a folder. |

#### Creating a document

```http
POST /api/documents
Content-Type: application/json

{
  "title": "API Integration Notes",
  "content": "# Notes\n\nHere are my integration notes...",
  "isPublic": false
}
```

**Response (201):**

```json
{
  "id": "doc_qrs001",
  "title": "API Integration Notes",
  "content": "# Notes\n\nHere are my integration notes...",
  "isPublic": false,
  "folderId": null,
  "relativePath": null,
  "createdAt": "2025-06-11T09:00:00.000Z",
  "updatedAt": "2025-06-11T09:00:00.000Z"
}
```

#### Delta sync

Delta sync is the efficient way to keep a local copy up to date. On first run, omit `lastSyncAt` to fetch everything. On subsequent runs, pass the timestamp returned by the previous sync:

```http
GET /api/documents/sync?lastSyncAt=2025-06-10T00:00:00.000Z
Authorization: Bearer il_tok_...
```

```json
{
  "syncedAt": "2025-06-11T09:15:00.000Z",
  "folders": [ ... ],
  "documents": [
    {
      "id": "doc_qrs001",
      "title": "API Integration Notes",
      "updatedAt": "2025-06-11T09:00:00.000Z",
      "deleted": false
    }
  ]
}
```

Documents with `"deleted": true` should be removed from the local copy.

---

### Follows

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/follow/[userId]` | Session | Follow a user. If their account is private, this creates a follow request. |
| DELETE | `/api/follow/[userId]` | Session | Unfollow a user. |
| GET | `/api/follow/[userId]/status` | Session | Current follow relationship between you and this user. |
| GET | `/api/follow/[userId]/followers` | Session | Followers of this user. |
| GET | `/api/follow/[userId]/following` | Session | Users this user follows. |
| GET | `/api/follow/[userId]/counts` | Session | Follower and following counts. |
| GET | `/api/follow/[userId]/mutual` | Session | Mutual follows between you and this user. |
| POST | `/api/follow/[userId]/approve` | Session | Approve an incoming follow request (private accounts). |
| POST | `/api/follow/[userId]/reject` | Session | Reject an incoming follow request. |
| POST | `/api/follow/[userId]/remove` | Session | Remove this user from your followers. |
| GET | `/api/follow/requests` | Session | Your pending incoming follow requests. |

#### Follow status example

```http
GET /api/follow/clx9user00002/status
```

```json
{
  "following": true,
  "followedBy": false,
  "pendingRequest": false
}
```

For a private account where the follow request is pending:

```json
{
  "following": false,
  "followedBy": false,
  "pendingRequest": true
}
```

---

### Organizations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/organizations` | Session | List organizations. Query: `public=true` for all public orgs, or `userId` to filter by member. |
| POST | `/api/organizations` | Session | Create an organization. Body: `name`, `description`, `isPublic`. |
| GET | `/api/organizations/[id]` | Session | Get an organization. |
| PATCH | `/api/organizations/[id]` | Session | Update an organization. |
| GET | `/api/organizations/[id]/members` | Session | List members and their roles. |
| POST | `/api/organizations/[id]/members` | Session | Add a member. Body: `{ "userId": "...", "role": "member" }`. |
| PUT | `/api/organizations/[id]/members/[userId]` | Session | Update a member's role. Body: `{ "role": "owner" \| "admin" \| "member" }`. Optional: `active` (boolean). |
| DELETE | `/api/organizations/[id]/members/[userId]` | Session | Remove a member. |
| GET | `/api/organizations/[id]/users` | Session | Users in the organization with role details. |

#### Creating an organization and adding a member

```http
POST /api/organizations
Content-Type: application/json

{
  "name": "Acme Dev Team",
  "description": "Internal engineering org.",
  "isPublic": false
}
```

**Response (201):**

```json
{
  "id": "org_001",
  "name": "Acme Dev Team",
  "description": "Internal engineering org.",
  "isPublic": false,
  "createdAt": "2025-06-11T10:00:00.000Z"
}
```

**Add a member:**

```http
POST /api/organizations/org_001/members
Content-Type: application/json

{
  "userId": "clx9user00003",
  "role": "member"
}
```

**Update a member's role:**

Valid roles are `"owner"`, `"admin"`, and `"member"`. You must be an owner or admin of the organization to change roles. The last owner cannot be demoted or removed — the server returns `400`.

```http
PUT /api/organizations/org_001/members/clx9user00003
Content-Type: application/json

{
  "role": "admin"
}
```

**Response (200):**

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

### Exports

All export endpoints return CSV and require a session.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/exports/messages` | Your messages as CSV. |
| GET | `/api/exports/lists` | Your list definitions (title, description, schema) as CSV. |
| GET | `/api/exports/list-data-rows` | Row data from all your lists as CSV. |
| GET | `/api/exports/follows` | Your followers and following relationships as CSV. |

**Example — save messages to a file with curl:**

```bash
curl -s "https://interlinedlist.com/api/exports/messages" \
  -H "Cookie: session=<your-session-cookie>" \
  -o my-messages.csv
```

---

### Notifications

Notifications are generated server-side for events like new followers, incoming replies, and dig reactions. All notification endpoints require a session.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/notifications` | Session | Unread notification tray. Required query: `scope=tray`. Returns `{ unreadCount, items }`. |
| PATCH | `/api/notifications/[id]/read` | Session | Mark one notification read (idempotent). Returns `{ ok: true }`. |
| POST | `/api/notifications/mark-all-read` | Session | Mark all unread notifications read. Returns `{ ok: true, updated: N }`. |

#### Notification object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique notification ID. |
| `title` | string | Short heading (e.g. `"New follower"`). |
| `body` | string | Full notification text. |
| `actionUrl` | string \| null | Relative URL to navigate to when the notification is clicked (e.g. `/profile/someuser`). |
| `type` | string \| null | Category string (e.g. `"follow"`, `"dig"`, `"reply"`). |
| `metadata` | object | Arbitrary structured data attached by the server. |
| `createdAt` | string (ISO 8601) | When the notification was created. |
| `readAt` | string \| null | When it was read; `null` if still unread. |

#### GET /api/notifications — example

```http
GET /api/notifications?scope=tray
```

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

`unreadCount` is the total number of unread notifications. `items` contains up to the user's configured tray limit (default 20, max 40) of the most recent unread items. The `scope=tray` query parameter is required — omitting it returns **400**.

#### Marking notifications read

Mark a single notification read (safe to call multiple times):

```http
PATCH /api/notifications/notif_abc001/read
```

**Response (200):** `{ "ok": true }`

Mark all unread notifications read at once:

```http
POST /api/notifications/mark-all-read
```

**Response (200):** `{ "ok": true, "updated": 3 }` — `updated` is the count of notifications that were changed from unread to read.

---

## Subscriber-only features

Some features require an active paid subscription. Check `GET /api/user` for the `customerStatus` field:

| Value | Meaning |
|-------|---------|
| `"free"` | No subscription |
| `"subscriber"` | Active subscriber (legacy) |
| `"subscriber:monthly"` | Active monthly subscriber |
| `"subscriber:annual"` | Active annual subscriber |

Any non-`"free"` status grants subscriber access. Features gated behind a subscription: image and video attachments on messages, scheduled posts, and cross-posting to Mastodon, Bluesky, and LinkedIn. Sending a subscriber-only field as a free user returns **403 Forbidden**:

```json
{ "error": "This feature requires an active subscription." }
```

---

## Public endpoints (no auth required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users/[username]/lists` | Public lists for a user. |
| GET | `/api/users/[username]/lists/[id]` | A specific public list. |
| GET | `/api/users/[username]/lists/[id]/data` | Rows from a public list. |
| GET | `/api/user/[username]/messages` | Public messages for a user (auth optional; private messages only returned for the owner). |
| GET | `/api/auth/linkedin/status` | Whether LinkedIn OAuth is configured on this instance. Returns `{ configured: boolean }`. |

**Example — fetch a public list without credentials:**

```bash
curl https://interlinedlist.com/api/users/somehandle/lists/lst_abc001/data
```

---

## Further reading

A full developer reference with additional examples, the List to Doc export flow, and cross-posting details lives at `documentation/developer/http-api-reference.md` in the InterlinedList source repository.
