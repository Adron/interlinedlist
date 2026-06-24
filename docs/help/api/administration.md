---
title: Administration
---

# Administration

The `/api/admin/*` endpoints are restricted to platform administrators. The caller must (a) have an `Administrator` record AND (b) be the owner of the system organization named **The Public**. Anything else returns `403 Forbidden`. These endpoints are **not part of the public API contract** and may change without notice.

A related diagnostic surface — the architecture-aggregates endpoints — has the same Public-owner gate but is documented under [Utility Endpoints](./utility-endpoints).

## Endpoint table

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/users` | Paginated list of all users. Search across email/username/displayName. |
| POST | `/api/admin/users` | Create a user (optionally pre-verified, optionally promoted to admin). |
| PUT | `/api/admin/users/:userId` | Update any subset of user fields. |
| DELETE | `/api/admin/users/:userId` | Delete a user (prevents self-delete and last-admin delete). |
| POST | `/api/admin/users/:userId/password` | Set a user's password; invalidates all of their sessions. |
| PATCH | `/api/admin/users/bulk-clearance` | Toggle the `cleared` flag on multiple users. |
| POST | `/api/admin/users/bulk-delete` | Delete multiple users. |
| PATCH | `/api/admin/users/bulk-status` | Set `emailVerified` for multiple users. |
| GET | `/api/admin/email-logs` | Paginated log of outbound emails with summary counts by status. |

## Listing users

```http
GET /api/admin/users?page=1&limit=25&search=octo
```

```json
{
  "users": [
    {
      "id": "u1",
      "email": "octo@example.com",
      "username": "octo",
      "displayName": "Octo",
      "avatar": null,
      "bio": null,
      "emailVerified": true,
      "cleared": false,
      "customerStatus": "free",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "isAdministrator": false
    }
  ],
  "pagination": { "total": 1024, "limit": 25, "offset": 0, "page": 1, "hasMore": true }
}
```

## Creating a user

```http
POST /api/admin/users
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "user1",
  "password": "min8chars",
  "displayName": "User One",
  "emailVerified": false,
  "isAdministrator": false,
  "customerStatus": "free"
}
```

Hashes the password, optionally marks `emailVerified`, optionally promotes to administrator, and adds the user to **The Public**. If the user is not pre-verified, a verification email is sent.

| Status | Condition |
|--------|-----------|
| 400 | Missing email/username/password, password under 8 chars |
| 409 | Email or username already in use |

## Updating a user

```http
PUT /api/admin/users/u1
Content-Type: application/json

{ "emailVerified": true, "customerStatus": "subscriber:monthly", "isAdministrator": true }
```

Any subset of `email`, `username`, `displayName`, `avatar`, `bio`, `emailVerified`, `cleared`, `customerStatus`, `isAdministrator` may be supplied. Email/username uniqueness is re-checked. Promoting/demoting administrator updates the `Administrator` table.

## Setting a user's password

```http
POST /api/admin/users/u1/password
Content-Type: application/json

{ "password": "min8chars" }
```

Sets the password and **invalidates all of the target user's sessions in the same transaction**.

## Bulk operations

```http
PATCH /api/admin/users/bulk-clearance
Content-Type: application/json

{ "userIds": ["u1", "u2", "u3"] }
```

Toggles the `cleared` flag for each user (records a `cleared` analytics action for every newly-cleared user). Returns `{ "updated": N }`.

```http
POST /api/admin/users/bulk-delete
Content-Type: application/json

{ "userIds": ["u1", "u2"] }
```

Deletes the listed users. The caller cannot include themselves; the request fails if it would remove every remaining administrator.

```http
PATCH /api/admin/users/bulk-status
Content-Type: application/json

{ "userIds": ["u1", "u2"], "emailVerified": true }
```

Sets `emailVerified` to the given boolean for every user in the list.

## Email logs

```http
GET /api/admin/email-logs?limit=25&status=delivered&dateRange=7d&sort=desc
```

| Query | Default | Notes |
|-------|---------|-------|
| `limit` | 25 | Clamped to 100. |
| `offset` | 0 | |
| `status` | — | Exact match. |
| `emailType` | — | Exact match. |
| `search` | — | Case-insensitive contains on `recipient`. |
| `dateRange` | `all` | `today`, `7d`, `30d`, or `all`. |
| `sort` | `desc` | `asc` or `desc` on `createdAt`. |

Response includes `logs`, `total`, `summary` (counts by status), and `pagination`.
