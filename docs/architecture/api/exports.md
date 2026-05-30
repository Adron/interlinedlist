# Export API

Export endpoints return CSV (or other formats) as downloadable files. All require authentication.

## GET /api/exports/messages

Export user's messages as CSV.

**Headers:** `Content-Disposition: attachment; filename="messages-export-YYYY-MM-DD.csv"`

Columns: ID, Content, Publicly Visible, Created At, Updated At

## GET /api/exports/lists

Export user's lists. CSV or JSON format.

## GET /api/exports/list-data-rows

Export list data rows for user's lists. Requires list selection or exports all.

## GET /api/exports/follows

Export follows (followers/following) as CSV.
