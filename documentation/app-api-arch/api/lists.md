# Lists API

## GET /api/lists

Get all lists for the current user.

**Query params:**
- `limit` (default: 50)
- `offset` (default: 0)
- `page` — 1-based page (overrides offset)

**Response:** `{ lists, pagination }`

## POST /api/lists

Create a new list with optional schema.

**Body:**
```json
{
  "title": "string (required)",
  "description": "string?",
  "messageId": "string?",
  "metadata": "object?",
  "schema": "object?",
  "parentId": "string?",
  "isPublic": "boolean?"
}
```

Schema uses DSL format (see `DSL/` in repo). Returns `{ message, data }` with created list.

## GET /api/lists/[id]

Get a single list by ID. Returns `{ data: list }`.

## PUT /api/lists/[id]

Update list metadata.

**Body:** `title`, `description`, `messageId`, `metadata`, `parentId` (all optional)

## DELETE /api/lists/[id]

Delete a list (hard delete, cascades to properties and data rows).

## GET /api/lists/[id]/schema

Get list schema (properties) as DSL format. Returns `{ data: dsl }`.

## PUT /api/lists/[id]/schema

Update list schema from DSL.

**Body:** `{ schema, parentId?, isPublic? }`

## GET /api/lists/[id]/data

Get list data rows with pagination, filtering, sorting.

**Query params:**
- `limit` (default: 100), `offset`, `page`
- `sort`, `order` (asc/desc)
- Any other params = filter by field key

**Response:** `{ rows, pagination }` or similar

## POST /api/lists/[id]/data

Create a row (single or bulk).

**Single:** `{ data: { fieldKey: value, ... } }`

**Bulk:** `{ bulk: true, data: [ { ... }, ... ] }`

Validation runs against list schema. Returns `{ message, data }` or `{ message, count }`.

## GET /api/lists/[id]/data/[rowId]

Get a single row. Returns `{ data: row }`.

## PUT /api/lists/[id]/data/[rowId]

Update a row. Body: `{ data: { fieldKey: value, ... } }`

## DELETE /api/lists/[id]/data/[rowId]

Soft delete a row.

---

## List Watchers (Access & Permissions)

Lists support roles: **watcher**, **collaborator**, **manager**. Only list owners can add or change other users; any logged-in user can add themselves as a watcher to a public list they don't own.

### GET /api/lists/[id]/watchers

Get watchers for a list. **List owner only.**

**Response:** `{ watchers: [{ id, userId, role, createdAt, user: { id, username, displayName, avatar } }] }`

### POST /api/lists/[id]/watchers

Add watcher(s) to a list.

**Owner adding another user** — Body: `{ userId: string, role?: "watcher" | "collaborator" | "manager" }`. List must be public. Default role is `watcher`.

**Current user adding self** — Body: `{}` or omit body. List must be public and not owned by current user. Idempotent (returns success if already watching).

**Response:** `{ watching: true }` (200 or 201)

### PUT /api/lists/[id]/watchers/[userId]

Change a user's role. **List owner only.**

**Body:** `{ role: "watcher" | "collaborator" | "manager" }`

**Response:** `{ role: string }`

### DELETE /api/lists/[id]/watchers/[userId]

Remove a user from list access. **List owner only.**

**Response:** `{ removed: true }`

### GET /api/lists/[id]/watchers/me

Check if current user is watching the list. Requires auth.

**Response:** `{ watching: boolean }`

### GET /api/lists/[id]/watchers/users

Search for users to add. **List owner only.** Excludes existing watchers and the list owner.

**Query params:** `search`, `limit`, `offset`

**Response:** `{ users, total, pagination }`

---

## Public List APIs (Viewing Other Users' Lists)

These endpoints allow unauthenticated access to public list metadata and data when the list belongs to the specified user.

### GET /api/users/[username]/lists/[id]

Get public list metadata and ancestor chain for breadcrumbs. No auth required.

**Response:** `{ list: { id, title, description, parentId, children }, ancestors }`

- 404: List not found or not public

### GET /api/users/[username]/lists/[id]/data

Get list data rows for a public list. Same query params as `GET /api/lists/[id]/data` (limit, offset, page, sort, order, filter by field).

**Response:** `{ rows, pagination }`

- 404: List not found or not public
