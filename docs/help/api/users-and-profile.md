---
title: Users and Profile
---

# Users and Profile

Endpoints for the **currently authenticated user**. For viewing other users' public content without auth, see [Public Profiles](./public-profiles).

## Endpoint table

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/user` | Session or Bearer | Current authenticated user including `customerStatus`. |
| PATCH | `/api/user/update` | Session or Bearer | Update profile fields: `displayName`, `bio`, settings, etc. |
| POST | `/api/user/avatar/upload` | Session or Bearer | Upload a new avatar image (multipart `file` field). |
| POST | `/api/user/avatar/from-url` | Session or Bearer | Set avatar from a URL. Body: `{ "url": "..." }`. |
| GET | `/api/user/identities` | Session | Linked OAuth identities (GitHub, Mastodon, Bluesky, LinkedIn, X). |
| DELETE | `/api/user/identities` | Session | Remove a linked identity. |
| POST | `/api/user/identities/verify` | Session | Re-verify a linked identity's connection (e.g. after token refresh). |
| GET | `/api/user/organizations` | Session | Organizations the current user belongs to. |
| POST | `/api/user/organizations` | Session | Create a new organization from your profile. |
| POST | `/api/user/change-email/request` | Session or Bearer | Request an email-address change (sends confirmation to the new address). |
| POST | `/api/user/delete` | Session | Permanently delete the account (hard delete). |
| GET | `/api/user/:username/messages` | Session | Messages for any user by username (viewer sees public; owner sees all). |

## GET /api/user

```http
GET /api/user
Authorization: Bearer il_tok_...
```

**Response (200):**

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

Use the `customerStatus` field to determine subscriber gating. Any non-`"free"` value grants subscriber features. See the [landing page](../api) for the full breakdown.

## PATCH /api/user/update

```http
PATCH /api/user/update
Content-Type: application/json

{
  "displayName": "New Display Name",
  "bio": "Updated bio text.",
  "defaultVisibility": "private"
}
```

**Response (200):** the updated user object (same shape as `GET /api/user`).

Common fields you can update: `displayName`, `bio`, `theme`, `maxMessageLength`, `defaultPubliclyVisible`, `viewingPreference`.

## Linked identities

```http
GET /api/user/identities
```

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

## Avatar uploads

Upload a file (multipart):

```http
POST /api/user/avatar/upload
Content-Type: multipart/form-data

file=<binary>
```

Or set from an existing URL:

```http
POST /api/user/avatar/from-url
Content-Type: application/json

{ "url": "https://example.com/your-photo.jpg" }
```

## Deleting your account

`POST /api/user/delete` permanently and irreversibly removes the account and all associated content. There is no undo.
