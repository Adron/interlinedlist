---
title: Exporting Data
---

# Exporting Data

Export your data from the **Exports** page. Reach it via **Dashboard → Exports** or the Data Management section on the Dashboard.

All exports download as **CSV** (comma-separated values) files that you can open in any spreadsheet application or process with scripts.

---

## Messages

Downloads all messages you have posted as a CSV file.

**Fields included:**

| Column | Description |
|--------|-------------|
| `id` | Unique message ID |
| `content` | The message text |
| `publiclyVisible` | Whether the message is public (`true` / `false`) |
| `createdAt` | Date and time the message was posted (ISO 8601) |
| `updatedAt` | Date and time of the last edit |
| `tags` | Pipe-separated list of tags attached to the message |
| `parentId` | ID of the parent message if this is a reply (blank otherwise) |

---

## Lists

Downloads your list definitions — the structure and metadata of each list, not the row data.

**Fields included:**

| Column | Description |
|--------|-------------|
| `id` | Unique list ID |
| `title` | List title |
| `description` | List description |
| `isPublic` | Whether the list is public (`true` / `false`) |
| `parentId` | ID of the parent list in a hierarchy (blank if top-level) |
| `createdAt` | Date and time the list was created |
| `updatedAt` | Date and time the list was last modified |

To export the actual rows stored in a list, use the **List Data Rows** export below.

---

## List Data Rows

Downloads all row data from all your lists in a single flat CSV. Each row in the CSV represents one row from one list.

**Fields included:**

| Column | Description |
|--------|-------------|
| `listId` | The ID of the list this row belongs to |
| `listTitle` | The title of the list |
| `rowId` | Unique ID of this data row |
| `rowData` | The row's field values, serialised as a JSON object (`{"Field Name": "value", ...}`) |
| `createdAt` | Date and time the row was created |
| `updatedAt` | Date and time the row was last updated |

Because different lists have different schemas, row data is exported as a JSON blob rather than individual columns. You can parse the `rowData` column in a script to extract specific fields.

---

## Follows

Downloads your followers and following relationships.

**Fields included:**

| Column | Description |
|--------|-------------|
| `type` | `"follower"` (they follow you) or `"following"` (you follow them) |
| `userId` | The other user's ID |
| `username` | The other user's username |
| `displayName` | The other user's display name (blank if not set) |
| `createdAt` | Date and time the relationship was established |

---

## Use cases

- **Backup** — Keep a local copy of all your content independent of the platform
- **Migration** — Move messages or list data to another system
- **Analysis** — Import into a spreadsheet or data tool to review patterns in your messages or lists
- **Archiving** — Preserve a snapshot of your lists and data at a point in time
