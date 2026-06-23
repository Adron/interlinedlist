---
title: Document Folders
---

# Document Folders

Document folders organise markdown [documents](./documents) into arbitrary-depth trees. They are separate from [list folders](./list-folders).

## Endpoint table

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/documents/folders` | Session or Bearer | All non-deleted document folders for the current user, as a flat array. |
| POST | `/api/documents/folders` | Session or Bearer | Create a folder. **Subscriber only.** |
| GET | `/api/documents/folders/:id` | Session or Bearer | Get a folder with its immediate children and documents. |
| PUT | `/api/documents/folders/:id` | Session or Bearer | Rename or move (with circular-reference protection). |
| DELETE | `/api/documents/folders/:id` | Session or Bearer | Soft-delete the folder and (recursively) all child folders and their documents. |
| GET | `/api/documents/folders/:id/documents` | Session or Bearer | List documents directly inside this folder. |
| POST | `/api/documents/folders/:id/documents` | Session or Bearer | Create a document directly inside this folder. **Subscriber only.** |

## Listing folders

```http
GET /api/documents/folders
```

Returns the **full tree as a flat array**, with each folder reporting its `parentId` and its immediate documents:

```json
{
  "folders": [
    {
      "id": "f1",
      "name": "Work",
      "parentId": null,
      "documents": [ { "id": "doc1", "title": "Meeting Notes", "relativePath": "meeting-notes.md" } ]
    },
    {
      "id": "f2",
      "name": "Projects",
      "parentId": "f1",
      "documents": []
    }
  ]
}
```

Reconstruct the hierarchy client-side by indexing folders by `id` and attaching each child to its `parentId`. There is no server-enforced depth limit.

## Creating a folder

```http
POST /api/documents/folders
Content-Type: application/json

{ "name": "Projects", "parentId": "f1" }
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | yes | |
| `parentId` | string | no | ID of an existing folder owned by this user. Omit or pass `null` for a root folder. |

**Response (201):**

```json
{ "message": "Folder created successfully", "folder": { "id": "f2", "name": "Projects", "parentId": "f1", "userId": "u1" } }
```

| Error | Condition |
|-------|-----------|
| `400` | Name missing or invalid `parentId` type |
| `403` | No subscription |
| `404` | `parentId` folder not found or not owned by this user |

## Renaming / moving

```http
PUT /api/documents/folders/f1
Content-Type: application/json

{ "name": "Renamed Folder", "parentId": "f3" }
```

All fields are optional. `parentId: null` moves the folder to root. Moves that would create a cycle are rejected with `400`. Name collisions in the target parent return `409`.

## Deletion cascade

`DELETE /api/documents/folders/:id` soft-deletes the folder, all descendant folders, and every document inside any of them. Restoration is not exposed via the API; restores happen at the database level by clearing `deletedAt`.
