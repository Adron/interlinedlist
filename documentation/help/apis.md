---
title: Developer APIs
---

# Developer APIs

This section describes the HTTP APIs available for building applications (clients, scripts, or integrations) on top of InterlinedList. All APIs use JSON for request and response bodies unless noted. The base URL is your instance (e.g. `https://your-app.example.com`); paths are relative to that (e.g. `/api/messages`).

## Authentication

Most endpoints require authentication. There are two supported methods:

### Session (cookies)

Used by the web app. After **login**, the server sets an HTTP-only session cookie. Subsequent requests from the same origin automatically include it. Use this when building browser-based clients that run on the same domain (e.g. the official app).

- **Login**: `POST /api/auth/login` with `{ "email", "password" }` → sets session cookie, returns user info.
- **Logout**: `POST /api/auth/logout` → clears session.
- **Register**: `POST /api/auth/register` with body per route.
- **Current user**: `GET /api/user` → returns the authenticated user (requires session).

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
| GET  | `/api/auth/mastodon/authorize` | Redirect to Mastodon OAuth. |
| GET  | `/api/auth/mastodon/callback` | Mastodon OAuth callback. |
| GET  | `/api/auth/bluesky/authorize` | Redirect to Bluesky OAuth. |
| GET  | `/api/auth/bluesky/callback` | Bluesky OAuth callback. |

---

## User

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | `/api/user` | Session | Current authenticated user. |
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
| GET  | `/api/messages` | Session | List messages (query: `limit`, `offset`, `onlyMine`). |
| POST | `/api/messages` | Session | Create message. Body: `content`, `publiclyVisible`, optional `imageUrls`, `videoUrls`, `parentId`, cross-post options. |
| GET  | `/api/messages/[id]` | Session | Get one message by ID. |
| DELETE | `/api/messages/[id]` | Session | Delete a message (own only). |
| GET  | `/api/messages/[id]/replies` | Session | Get replies to a message. |
| POST | `/api/messages/[id]/metadata` | Session | Trigger link metadata fetch for the message. |
| POST | `/api/messages/images/upload` | Session | Upload an image (FormData `file`). Returns `{ url }`. Images resized to max 1200×1200, 1.4 MB. |
| POST | `/api/messages/videos/upload` | Session | Upload a video (FormData `file`). Returns `{ url }`. Max 3 MB; formats: MP4, WebM, QuickTime, AVI. |

Creating a message requires a verified email. Optional body fields include `imageUrls` (array of URLs from the upload endpoints, max 6) and `videoUrls` (array of URLs, max 1).

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
| POST | `/api/organizations/[id]/members` | Session | Add member. |
| DELETE | `/api/organizations/[id]/members/[userId]` | Session | Remove member. |
| GET  | `/api/organizations/[id]/users` | Session | Users in org (with roles). |

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

## Other

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/user/[username]/messages` | Optional | Messages for a user by username (public or own). |
| GET | `/api/location` | Session | User’s profile location (lat/lng). |
| GET | `/api/weather` | Session | Weather (e.g. for profile location). |
| GET | `/api/images/proxy` | Varies | Proxy an image URL (e.g. for CORS or privacy). |
| GET | `/api/oauth/client-metadata` | None | OAuth client metadata for the app. |

---

## Tooling (CLI)

The Document Sync CLI uses the sync token and the documents/sync API. See **Tooling (CLI)** and **Local Testing (CLI)** in the Help sidebar for setup and usage. The CLI obtains a token via `POST /api/auth/sync-token` and sends it as `Authorization: Bearer <token>` on `GET` and `POST /api/documents/sync`.

---

## Rate limits and CORS

- Rate limits (if any) are instance-specific; check your deployment configuration.
- The web app is same-origin; CORS is typically configured for the app domain. For third-party browser clients, the instance may need to allow your origin.
- Admin endpoints (e.g. under `/api/admin/`) are not listed here and are restricted to administrators.
