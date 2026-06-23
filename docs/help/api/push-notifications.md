---
title: Push Notifications
---

# Push Notifications

Register device tokens so the server can deliver push notifications via APNs (iOS) or other push providers. These endpoints support session cookies for the web app and Bearer tokens for native clients.

## Endpoint table

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/push/register` | Session or Bearer | Register or update a device token for the current user. |
| DELETE | `/api/push/unregister` | Session or Bearer | Unregister a device token. |

## Registering a device

```http
POST /api/push/register
Authorization: Bearer il_tok_...
Content-Type: application/json

{
  "deviceToken": "<base64-or-hex device token>",
  "platform": "ios",
  "appId": "com.example.interlinedlist"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `deviceToken` | string | yes | The provider-issued device token. |
| `platform` | string | yes | `ios` (more platforms may be added). |
| `appId` | string | no | Bundle identifier. Useful when supporting multiple app variants. |

**Response (200):** `{ "ok": true, "deviceId": "..." }`

If the device token already exists for the current user, the existing record is updated rather than duplicated.

## Unregistering

```http
DELETE /api/push/unregister
Content-Type: application/json

{ "deviceToken": "<base64-or-hex device token>" }
```

Removes the registration. Idempotent — unregistering an unknown token returns `200`.

## Notes

- Re-register the device on every app launch in case the token has rotated.
- The server delivers a push notification for events that also generate an in-app [notification](./notifications) (new follower, reply, dig, etc.), subject to the user's per-event delivery preferences in [Users and Profile](./users-and-profile) settings.
- A user who is signed in on multiple devices receives the push on all of them.
