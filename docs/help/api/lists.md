---
title: Lists
---

# Lists

Lists are structured collections of typed rows. Every list has a **schema** (a small DSL describing the columns) and a stream of **data rows** matching that schema. Lists can be public, organised into folders, linked together via connections, watched by other users, or synchronised from a GitHub repository.

All list endpoints accept either a session cookie **or** a Bearer token, making them fully accessible from native iOS (and other non-browser) clients.

## Endpoint table

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/lists` | Session or Bearer | Your lists. Query: `limit`, `offset`, `page`. |
| POST | `/api/lists` | Session or Bearer | Create a list. Body: `title`, `description`, `schema` (DSL), optional `parentId`, `isPublic`. **Subscriber only.** |
| GET | `/api/lists/:id` | Session or Bearer | List metadata and schema. |
| PUT | `/api/lists/:id` | Session or Bearer | Update list metadata. |
| DELETE | `/api/lists/:id` | Session or Bearer | Delete a list. |
| GET | `/api/lists/:id/schema` | Session or Bearer | Get list schema (properties). |
| PUT | `/api/lists/:id/schema` | Session or Bearer | Update list schema. |
| POST | `/api/lists/:id/refresh` | Session or Bearer | Refresh a GitHub-backed list from source. |
| GET | `/api/lists/:id/data` | Session or Bearer | List rows. Query: `limit`, `offset`. |
| POST | `/api/lists/:id/data` | Session or Bearer | Add a row. Body: `{ "rowData": { "Field": "value", ... } }`. |
| GET | `/api/lists/:id/data/:rowId` | Session or Bearer | Get one row. |
| PUT | `/api/lists/:id/data/:rowId` | Session or Bearer | Update a row. |
| DELETE | `/api/lists/:id/data/:rowId` | Session or Bearer | Delete a row. |
| GET | `/api/lists/search` | Session or Bearer | Search your lists by title. |
| GET | `/api/lists/:id/watchers` | Session or Bearer | Users watching this list. |
| POST | `/api/lists/:id/watchers` | Session or Bearer | Add a watcher to this list. |
| GET | `/api/lists/:id/watchers/me` | Session or Bearer | Whether the current user is watching. |
| GET | `/api/lists/:id/watchers/users` | Session or Bearer | Users with access (watchers, collaborators, managers). |
| PUT | `/api/lists/:id/watchers/:userId` | Session or Bearer | Change a user's watcher role. |
| DELETE | `/api/lists/:id/watchers/:userId` | Session or Bearer | Remove a user from list access. |
| GET | `/api/lists/connections` | Session or Bearer | All connections between your lists. |
| POST | `/api/lists/connections` | Session or Bearer | Create a directed connection. Body: `fromListId`, `toListId`, optional `label`. |
| DELETE | `/api/lists/connections/:id` | Session or Bearer | Remove a connection. |

Public access to lists you've marked `isPublic: true` is documented in [Public Profiles](./public-profiles).

## Creating a list

```http
POST /api/lists
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
  "isPublic": true,
  "schema": "Title:text, Author:text, Year:number, Read:boolean",
  "createdAt": "2025-06-11T08:30:00.000Z"
}
```

The schema DSL accepts column definitions in `Name:type` form, comma-separated. Supported types include `text`, `number`, `boolean`, `date`, `url`, `markdown`, and a few others. Validation errors include a `details` map identifying the offending column.

## Adding and reading rows

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
  "rowData": { "Title": "The Dream Machine", "Author": "M. Mitchell Waldrop", "Year": 2001, "Read": false },
  "createdAt": "2025-06-11T08:35:00.000Z"
}
```

Fetch rows with pagination:

```http
GET /api/lists/lst_abc001/data?limit=50&offset=0
```

## Updating the schema

`PUT /api/lists/:id/schema` accepts **two body shapes on the same route** (there is no separate `/schema/structured` route); the server dispatches by payload:

- **DSL rebuild (destructive):** body `{ "schema": "Title\nName:text, Done:boolean", "parentId"?, "isPublic"? }`. Wipes and recreates all properties.
- **Structured update (non-destructive):** body `{ "properties": [ { "id"?, "propertyKey", "propertyName", "propertyType", "displayOrder"?, "isVisible"?, "isRequired"?, "defaultValue"?, "helpText"?, "placeholder"? } ] }`. Items with an existing `id` are updated in place (row data preserved); items without `id` are created; existing properties omitted from the array are soft-deleted and their key is stripped from every row. `displayOrder` is authoritative by array order (renumbered 0..n-1). Allowed `propertyType`: `text`, `number`, `boolean`, `date`, `url`, `email`.

The structured form returns `400` for a duplicate `propertyKey`, an unknown `propertyType`, an unknown `id`, or an attempt to change `propertyKey` for an existing `id` (rename `propertyName` instead). If a to-be-deleted property still holds non-null row data, the request fails `409` with `{ error, propertiesWithData: [...] }` unless `?force=true` is passed. Success returns `{ "properties": [ ...rows ordered by displayOrder... ] }`.

## Watchers

A watcher's `role` is one of `watcher`, `collaborator`, or `manager`.

- `GET /api/lists/:id/watchers` (owner only) → `{ watchers: [ { id, userId, role, createdAt, user } ] }`.
- `POST /api/lists/:id/watchers` → body `{ userId?, role? }`. With `userId`, the owner adds that user (list must be public; `role` defaults to `watcher`). Without `userId`, the caller self-subscribes (list must be public and not their own). Idempotent — returns `{ watching: true }` (`201` when newly created, `200` if already watching).
- `PUT /api/lists/:id/watchers/:userId` (owner only) → body `{ role }`; invalid/missing role → `400`. Returns `{ role }`.
- `DELETE /api/lists/:id/watchers/:userId` (owner only) → `{ removed: true }`.
- `GET /api/lists/:id/watchers/users` (owner only) — search users to add. Query: `search`, `limit` (50), `offset` (0), `excludeWatchers` (comma-separated ids; if omitted, current watchers are auto-excluded). Returns `{ users, total, pagination }`.

## Connections

Connections create labelled, directed relationships between two of your lists — useful for modelling related datasets, parent/child structures, or any graph of linked lists.

```http
POST /api/lists/connections
Content-Type: application/json

{ "fromListId": "lst_abc001", "toListId": "lst_abc002", "label": "references" }
```

**Response (201):** the created connection object.

| Error | Condition |
|-------|-----------|
| `400` | Missing `fromListId` or `toListId`, or both IDs are the same. |
| `403` | The current user does not own both lists. |
| `409` | The connection already exists. |

Fetch all connections owned by the current user:

```http
GET /api/lists/connections
```

```json
{
  "connections": [
    { "id": "conn_abc001", "fromListId": "lst_abc001", "toListId": "lst_abc002", "label": "references", "createdAt": "..." }
  ]
}
```

## Searching

```http
GET /api/lists/search?q=books&limit=20&offset=0
```

Returns lists owned by the current user whose title matches. Paginated.

## GitHub-backed lists

A list created with `source: "github"` (and the right configuration) reflects issues from a GitHub repository. Trigger an on-demand sync via:

```http
POST /api/lists/:id/refresh
```

A cron job (`/api/cron/sync-github-lists`) also refreshes these lists periodically — see [Cron & Webhooks](./internal-endpoints).
