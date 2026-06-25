---
title: Messages
---

# Messages

Post, list, reply to, react to, and cross-post messages. The feed combines public messages, your own messages, and messages from people you follow.

## Endpoint table

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/messages` | Session or Bearer | List messages. Query: `limit`, `offset`, `onlyMine` (bool), `tag` (string). |
| GET | `/api/messages/search` | Session or Bearer | Search top-level messages by content (case-insensitive substring), scoped to your feed visibility. Query: `q` (required, 1–200 chars), `limit` (default 20, max 100), `offset` (default 0), `onlyMine` (bool, default false). |
| POST | `/api/messages` | Session or Bearer | Create a message (see body reference below). Returns `201`. |
| GET | `/api/messages/:id` | Session or Bearer | Get one message by ID. |
| PATCH | `/api/messages/:id` | Session | Update a future-scheduled message (`scheduledAt`, `scheduledCrossPostConfig`). |
| DELETE | `/api/messages/:id` | Session or Bearer | Delete a message (own messages only). Cascades replies and blob media. |
| GET | `/api/messages/scheduled` | Session or Bearer | Upcoming scheduled messages. Query: `range` — `today`, `week`, or `month` (default `month`). |
| GET | `/api/messages/:id/replies` | Session | Replies to a message. |
| POST | `/api/messages/:id/dig` | Session | Add an **I Dig!** reaction (idempotent). Returns `{ digCount, dugByMe }`. |
| DELETE | `/api/messages/:id/dig` | Session | Remove your dig. |
| POST | `/api/messages/:id/metadata` | Public | Triggers async link-metadata fetch for a message (used internally after creation). |
| POST | `/api/messages/images/upload` | Session or Bearer | Upload an image for attachment. **Subscriber only.** |
| POST | `/api/messages/videos/upload` | Session or Bearer | Upload a video for attachment. **Subscriber only.** |

## Listing messages

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
      "author": { "id": "...", "username": "yourhandle", "displayName": "Your Name", "avatarUrl": null }
    }
  ],
  "pagination": { "total": 42, "limit": 2, "offset": 0, "hasMore": true }
}
```

## Searching messages

```http
GET /api/messages/search?q=feature&limit=20&onlyMine=false
Authorization: Bearer il_tok_...
```

Matching is a case-insensitive substring over message `content`, restricted to top-level messages (replies excluded) and scoped to your feed visibility (honors your `viewingPreference`). Each item uses the same message shape as `GET /api/messages`. The response wraps results in `{ "messages": [ ... ], "pagination": { "total", "limit", "offset", "hasMore" } }`. An empty or over-200-character `q`, or a `limit` above 100, returns `400`.

## Creating a message

### Body fields

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
| `crossPostToTwitter` | boolean | Cross-post to linked X (Twitter) account. **Subscriber only.** |

### Simple public message

```http
POST /api/messages
Authorization: Bearer il_tok_...
Content-Type: application/json

{ "content": "Hello from the API!", "publiclyVisible": true, "tags": ["api"] }
```

### Reply

```http
POST /api/messages
Content-Type: application/json

{ "content": "Great point.", "publiclyVisible": true, "parentId": "msg_001" }
```

### Scheduled cross-post (subscriber)

```http
POST /api/messages
Content-Type: application/json

{
  "content": "Launching at 9 AM tomorrow!",
  "publiclyVisible": true,
  "scheduledAt": "2025-09-01T13:00:00.000Z",
  "crossPostToBluesky": true,
  "crossPostToTwitter": true,
  "mastodonProviderIds": ["clx9abc000002"]
}
```

### Creation response

```json
{
  "message": "Message created successfully",
  "data": { "id": "msg_003", "content": "...", "publiclyVisible": true, "createdAt": "..." }
}
```

For scheduled posts, `scheduledAt` is echoed back. For immediate cross-posts, a `crossPostResults` array is included with one entry per platform.

## Uploading images and videos

Two-step flow — upload first, then reference the URL in `imageUrls` / `videoUrls`.

```http
POST /api/messages/images/upload
Content-Type: multipart/form-data

file=<binary>
```

Response: `{ "url": "https://cdn.interlinedlist.com/images/abc123.webp" }`

Image constraints: JPEG/PNG/WebP/GIF; auto-resized to 1200 px max side; ≤ 1.4 MB output.  
Video constraints: MP4/WebM/QuickTime/AVI; max 3 MB; no server transcoding.

## Cross-posting details

Cross-posting only works when the corresponding provider identity is linked to your account. See [Authentication & OAuth](./authentication) for linking flows. For Mastodon, use the `id` of the identity from `GET /api/user/identities` (not the handle). LinkedIn additionally supports posting to organization pages — see [LinkedIn Integration](./linkedin-integration) and [Organizations](./organizations).

## Reactions and replies

```http
POST /api/messages/msg_001/dig          # → { "digCount": 5, "dugByMe": true }
DELETE /api/messages/msg_001/dig        # → { "digCount": 4, "dugByMe": false }
GET /api/messages/msg_001/replies       # → array of reply messages
```
