---
title: Notifications
---

# Notifications

Notifications are generated server-side for events like new followers, incoming replies, and **I Dig!** reactions. The notification tray is the main consumer.

## Endpoint table

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/notifications` | Session or Bearer | Notification tray. Required query: `scope=tray`. Returns `{ unreadCount, items }`. |
| GET | `/api/notifications/:id` | Session or Bearer | Get a single notification by ID. |
| DELETE | `/api/notifications/:id` | Session or Bearer | Delete a notification. |
| PATCH | `/api/notifications/:id/read` | Session or Bearer | Mark one notification read (idempotent). Returns `{ ok: true }`. |
| POST | `/api/notifications/mark-all-read` | Session or Bearer | Mark all unread notifications read. Returns `{ ok: true, updated: N }`. |

## Notification object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique notification ID. |
| `title` | string | Short heading (e.g. `"New follower"`). |
| `body` | string | Full notification text. |
| `actionUrl` | string \| null | Relative URL to navigate to when clicked (e.g. `/profile/someuser`). |
| `type` | string \| null | Category string (e.g. `"follow"`, `"dig"`, `"reply"`). |
| `metadata` | object | Arbitrary structured data attached by the server. |
| `createdAt` | string (ISO 8601) | When the notification was created. |
| `readAt` | string \| null | When it was read; `null` if still unread. |

## Fetching the tray

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

`unreadCount` is the total count across all unread notifications. `items` contains up to the user's configured tray limit (default 20, max 40) of the most recent unread items. The `scope=tray` query parameter is required — omitting it returns **400**.

## Marking notifications read

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

## Deletion

```http
DELETE /api/notifications/notif_abc001
```

Deletes the notification entirely (rather than just marking it read). The action is irreversible.
