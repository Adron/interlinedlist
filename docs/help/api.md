---
title: API for Developers
---

# API for Developers

InterlinedList exposes an HTTP API that lets you build integrations, native clients, scripts, and automations on top of the platform. All request and response bodies are JSON unless noted otherwise.

This page is an index. Pick the section you need from the sidebar (or the list below) for full request/response details.

## Base URL

Paths are relative to the InterlinedList deployment you are targeting:

```
https://interlinedlist.com
```

For example: `https://interlinedlist.com/api/messages`

## Authentication at a glance

Two methods are supported. See **[Authentication & OAuth](./api/authentication)** for details.

- **Session cookie** — set by `POST /api/auth/login`; used by the web app and any browser client on the same origin.
- **Bearer token** — obtained from `POST /api/auth/sync-token`; used by native, mobile, and CLI clients. Send as `Authorization: Bearer <token>`.

Endpoints documented as **Session or Bearer** accept either. Endpoints documented as **Session only** require the cookie.

## Response conventions

Errors always return JSON with an `error` field:

```json
{ "error": "Not authenticated" }
```

Common status codes: `400` bad request, `401` not authenticated, `403` forbidden (e.g. email not verified, subscriber feature), `404` not found, `409` conflict, `413` payload too large, `429` rate limited, `500` server error.

Paginated lists include a `pagination` object alongside the data array:

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

## Subscriber-only features

Some features require an active paid subscription. Check `GET /api/user` for the `customerStatus` field:

| Value | Meaning |
|-------|---------|
| `"free"` | No subscription |
| `"subscriber"` | Active subscriber (legacy) |
| `"subscriber:monthly"` | Active monthly subscriber |
| `"subscriber:annual"` | Active annual subscriber |

Any non-`"free"` status grants subscriber access. Features gated behind a subscription include image and video attachments on messages, scheduled posts, cross-posting to Mastodon/Bluesky/LinkedIn/X (Twitter), and document creation. Sending a subscriber-only field as a free user returns **403 Forbidden**:

```json
{ "error": "This feature requires an active subscription." }
```

## Quick start

```http
POST /api/auth/sync-token
Content-Type: application/json

{ "email": "you@example.com", "password": "yourpassword" }
```

Then:

```http
GET /api/user
Authorization: Bearer il_tok_...
```

```http
POST /api/messages
Authorization: Bearer il_tok_...
Content-Type: application/json

{ "content": "Hello from the API!", "publiclyVisible": true }
```

See **[Messages](./api/messages)** for the full message body reference.

## Reference by category

| Section | What's covered |
|---------|----------------|
| [Authentication & OAuth](./api/authentication) | Login, register, sync tokens, password reset, OAuth providers, account linking, logout, multi-account |
| [Users and Profile](./api/users-and-profile) | Current user, profile updates, avatars, linked identities, email change, account deletion |
| [Public Profiles](./api/public-profiles) | No-auth endpoints for viewing public user content |
| [Messages](./api/messages) | Posting, replies, dig reactions, scheduled posts, media uploads, cross-posting |
| [Lists](./api/lists) | List CRUD, schema, data rows, watchers, connections, search |
| [List Folders](./api/list-folders) | Top-level folder hierarchy for organising lists |
| [Documents](./api/documents) | Document CRUD, delta sync, templates, search, image uploads |
| [Document Folders](./api/document-folders) | Folder hierarchy for organising documents |
| [Following](./api/following) | Follow/unfollow, follow requests, follower & following lists |
| [Organizations](./api/organizations) | Org CRUD, members, LinkedIn page integration |
| [Notifications](./api/notifications) | Notification tray, mark read, single & bulk operations |
| [Push Notifications](./api/push-notifications) | Register and unregister device tokens |
| [Exports](./api/exports) | CSV exports of messages, lists, list rows, and follows |
| [GitHub Integration](./api/github-integration) | Connected-account GitHub issue and repo helpers |
| [LinkedIn Integration](./api/linkedin-integration) | Personal LinkedIn posting targets |
| [Utility Endpoints](./api/utility-endpoints) | Image proxy, geolocation, weather, OAuth client metadata, status probes |
| [Administration](./api/administration) | Admin-only user and email log management |

## Looking for the full single-file reference?

The canonical comprehensive reference lives at `docs/api-reference.md` in the source repository. The pages linked above are the in-app rendered version of that reference, split by category for easier reading.
