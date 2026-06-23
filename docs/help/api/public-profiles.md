---
title: Public Profiles
---

# Public Profiles

Endpoints in this group return content marked **public** by its owner. They require no authentication and may be called from any client. Private content is excluded from responses.

## Endpoint table

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users/:username/lists` | Public lists owned by the user. |
| GET | `/api/users/:username/lists/:id` | A specific public list (metadata + schema). |
| GET | `/api/users/:username/lists/:id/data` | Rows from a specific public list. |
| GET | `/api/users/:username/documents` | Public documents owned by the user. |

`/api/user/:username/messages` (note the singular `user`) is also a public-by-default endpoint: the viewer sees the user's public messages without authenticating; if the requester is the owner, private messages are included.

## Fetching a public list

```bash
curl https://interlinedlist.com/api/users/somehandle/lists/lst_abc001
```

**Response (200):**

```json
{
  "id": "lst_abc001",
  "title": "Books to Read",
  "description": "My reading backlog.",
  "isPublic": true,
  "schema": "Title:text, Author:text, Year:number, Read:boolean",
  "owner": { "username": "somehandle", "displayName": "Some One" },
  "createdAt": "2025-06-11T08:30:00.000Z"
}
```

## Fetching list rows

```bash
curl "https://interlinedlist.com/api/users/somehandle/lists/lst_abc001/data?limit=50&offset=0"
```

**Response (200):** the same paginated row shape as the authenticated `GET /api/lists/:id/data`.

## Pagination

`limit` and `offset` query params are supported on the list and document endpoints. The response includes a `pagination` object with `total`, `limit`, `offset`, and `hasMore`.

## Privacy notes

- A list marked `isPublic: false` returns `404` from these endpoints, not `403`.
- Documents marked `isPublic: false` are likewise excluded.
- These endpoints never reveal email addresses or any non-public profile field.
