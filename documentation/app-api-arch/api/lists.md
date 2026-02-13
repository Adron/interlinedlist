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
