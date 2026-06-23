---
title: Exports
---

# Exports

All export endpoints stream CSV files containing the authenticated user's data. They require a **session cookie** (Bearer tokens are not accepted).

## Endpoint table

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/exports/messages` | Your messages as CSV. |
| GET | `/api/exports/lists` | Your list definitions (title, description, schema) as CSV. |
| GET | `/api/exports/list-data-rows` | Row data from all your lists as CSV. |
| GET | `/api/exports/follows` | Your followers and following relationships as CSV. |

## Saving messages to a file

```bash
curl -s "https://interlinedlist.com/api/exports/messages" \
  -H "Cookie: interlinedlist-session=<your-session-cookie>" \
  -o my-messages.csv
```

In the browser, navigating to the URL while signed in triggers a file download (the server sets `Content-Disposition: attachment`).

## What's included

| Endpoint | Columns |
|----------|---------|
| `/api/exports/messages` | Message ID, created-at, content, public flag, tags, parent ID, pushed-message ID, dig count, reply count |
| `/api/exports/lists` | List ID, title, description, schema DSL, public flag, parent folder ID, created-at |
| `/api/exports/list-data-rows` | List ID, row ID, each schema field as its own column, created-at, updated-at |
| `/api/exports/follows` | Direction (follower/following), user ID, username, display name, established-at |

All four exports include the authenticated user's content only. Exports of data you have access to but don't own (e.g. lists you watch) are not currently provided.

## Format

UTF-8 CSV with header row. Fields containing commas, quotes, or newlines are quoted per RFC 4180. Timestamps are ISO 8601 UTC.
