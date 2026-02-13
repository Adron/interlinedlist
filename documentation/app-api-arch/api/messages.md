# Messages API

## POST /api/messages

Create a new message. Requires email verification.

**Body:**
```json
{
  "content": "string (required)",
  "publiclyVisible": "boolean?",
  "imageUrls": "string[]?",
  "videoUrls": "string[]?"
}
```

- `content`: Required, trimmed; max length from user's `maxMessageLength`
- `publiclyVisible`: Defaults to user's `defaultPubliclyVisible`
- `imageUrls`: Up to 6 URLs
- `videoUrls`: Up to 1 URL

**Response:** `{ message, data }` with created message (includes `linkMetadata` if URLs detected)

## GET /api/messages

Get messages (for dashboard feed). Filtering by user/viewing preference.

**Query params:** `limit`, `offset`, `page`, user preferences

## GET /api/messages/[id]

Get a single message by ID.

## PUT /api/messages/[id]

Update a message (content, publiclyVisible).

## DELETE /api/messages/[id]

Delete a message.

## GET /api/messages/[id]/metadata

Fetch link metadata for URLs in message content (Open Graph, oEmbed). Used for link previews.

## POST /api/messages/images/upload

Upload image(s) for a message. Returns URLs for `imageUrls`.

## POST /api/messages/videos/upload

Upload video for a message. Returns URL for `videoUrls`.
