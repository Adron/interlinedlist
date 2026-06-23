---
title: Documents
---

# Documents

Documents are markdown notes you own. They support folder organisation, full-text search, image embedding, templates, and a delta-sync mechanism for offline-capable clients. All document-creation endpoints require a subscription.

For organising documents into folders, see [Document Folders](./document-folders).

## Endpoint table

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/documents` | Session or Bearer | List root-level documents (`folderId` is null), ordered by `relativePath`. |
| POST | `/api/documents` | Session or Bearer | Create a root-level document. **Subscriber only.** |
| GET | `/api/documents/:id` | Session or Bearer | Get a document. Owner sees everything; public documents are readable by anyone authenticated. |
| PUT | `/api/documents/:id` | Session or Bearer | Update a document (`title`, `content`, `isPublic`, `folderId`). |
| DELETE | `/api/documents/:id` | Session or Bearer | Soft-delete; cascades blob image cleanup. |
| GET | `/api/documents/search` | Session or Bearer | Full-text search of your own documents. |
| GET | `/api/documents/sync` | Session or Bearer | Delta sync (pass `?lastSyncAt=<ISO>` for incremental). |
| POST | `/api/documents/sync` | Session or Bearer | Batch apply create/update/delete operations in one request. |
| POST | `/api/documents/:id/images/upload` | Session or Bearer | Upload an image to embed in a document. **Subscriber only.** |
| GET | `/api/documents/templates` | Session or Bearer | List document templates. |
| POST | `/api/documents/templates/seed-defaults` | Session or Bearer | Seed your account with the default starter templates. |
| POST | `/api/documents/from-template` | Session or Bearer | Create a document from a template. **Subscriber only.** |

## Creating a document

```http
POST /api/documents
Content-Type: application/json

{
  "title": "API Integration Notes",
  "content": "# Notes\n\nHere are my integration notes...",
  "isPublic": false
}
```

**Response (201):**

```json
{
  "id": "doc_qrs001",
  "title": "API Integration Notes",
  "content": "# Notes\n\nHere are my integration notes...",
  "isPublic": false,
  "folderId": null,
  "relativePath": "api-integration-notes.md",
  "createdAt": "2025-06-11T09:00:00.000Z",
  "updatedAt": "2025-06-11T09:00:00.000Z"
}
```

`relativePath` is auto-generated from `title` if omitted. A content hash (`contentHash`) is computed server-side and used by the delta-sync engine.

## Delta sync

Delta sync is the efficient way to keep a local copy up to date. On first run, omit `lastSyncAt` to fetch everything. On subsequent runs, pass the timestamp returned by the previous sync:

```http
GET /api/documents/sync?lastSyncAt=2025-06-10T00:00:00.000Z
Authorization: Bearer il_tok_...
```

```json
{
  "syncedAt": "2025-06-11T09:15:00.000Z",
  "folders": [ ... ],
  "documents": [
    { "id": "doc_qrs001", "title": "API Integration Notes", "updatedAt": "2025-06-11T09:00:00.000Z", "deleted": false }
  ]
}
```

Documents with `"deleted": true` should be removed from the local copy. Use the returned `syncedAt` as the next `lastSyncAt`.

The `POST /api/documents/sync` form accepts a batch of operations (create/update/delete) and applies them atomically — useful for two-way sync clients pushing local edits.

## Search

```http
GET /api/documents/search?q=integration&limit=20
```

Searches across title and content. Only your own documents are searched.

## Templates

```http
GET /api/documents/templates                   # list available templates
POST /api/documents/templates/seed-defaults    # add the defaults to your account
POST /api/documents/from-template              # create a document from a template
Content-Type: application/json

{ "templateId": "tpl_default_meeting_notes", "title": "Standup 2026-06-23", "folderId": null }
```

## Image uploads

```http
POST /api/documents/doc_qrs001/images/upload
Content-Type: multipart/form-data

file=<binary>
```

Returns the uploaded image URL. Embed it in markdown with `![alt](url)`. Soft-deleting the document cascades the cleanup of these blob images.
