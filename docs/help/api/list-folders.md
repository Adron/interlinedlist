---
title: List Folders
---

# List Folders

List folders organise lists into an arbitrary-depth hierarchy. They are separate from [document folders](./document-folders). The `/api/folders` endpoints operate on the `ListFolder` model.

## Endpoint table

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/folders` | Session or Bearer | All non-deleted list folders for the current user, as a flat array. |
| POST | `/api/folders` | Session or Bearer | Create a folder. **Subscriber only.** |
| PUT | `/api/folders/:id` | Session or Bearer | Rename and/or reparent. |
| DELETE | `/api/folders/:id` | Session or Bearer | Soft-delete the folder and (recursively) any sub-folders. Lists inside are reparented to root. |

## Listing folders

```http
GET /api/folders
```

```json
{
  "folders": [
    { "id": "f1", "name": "Work", "parentId": null },
    { "id": "f2", "name": "Projects", "parentId": "f1" }
  ]
}
```

The response is a flat array. Reconstruct the tree client-side using each entry's `parentId`. There is no server-enforced depth limit.

## Creating a folder

```http
POST /api/folders
Content-Type: application/json

{ "name": "My Folder", "parentId": null }
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | yes | 1–80 characters after trim |
| `parentId` | string \| null | no | Folder ID owned by the same user; omit or pass `null` for a root folder. |

**Response (201):**

```json
{ "message": "Folder created successfully", "folder": { "id": "f1", "name": "My Folder", "parentId": null } }
```

| Error | Condition |
|-------|-----------|
| `400` | Missing name, name &gt; 80 chars, or `parentId` not a string |
| `403` | No subscription |
| `404` | `parentId` folder not found or not owned by this user |
| `409` | A folder with that name already exists in the same parent |

## Renaming / moving

```http
PUT /api/folders/f1
Content-Type: application/json

{ "name": "Renamed", "parentId": "f3" }
```

Both fields are optional. Setting `parentId` to `null` moves the folder to root. The server rejects moves that would create a cycle (a folder cannot become its own descendant). Folders not owned by the current user surface as `404`, never `403`.

## Deletion behavior

`DELETE /api/folders/:id` soft-deletes the folder and recursively soft-deletes child folders. **Lists are never soft-deleted by this cascade** — they are detached to root (`folderId` set to `null`).
