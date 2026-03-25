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
- `imageUrls`: Up to 8 URLs
- `videoUrls`: Up to 1 URL

**Response:** `{ message, data }` with created message (includes `linkMetadata` if URLs detected)

## GET /api/messages

Get messages (for dashboard feed). Filtering by user/viewing preference.

**Query params:** `limit`, `offset`, `page`, user preferences

Each message includes `digCount` (integer) and, when the caller is authenticated (session or Bearer on this route), `dugByMe` (boolean).

## GET /api/messages/[id]

Get a single message by ID.

Includes `digCount` and `dugByMe` (when authenticated) like list responses.

## POST /api/messages/[id]/dig

Add an **I Dig!** on a message. **Session only** (same cookie as the web app). Any logged-in user may call this; email verification is not required.

- Idempotent: if the user already dug the message, returns **200** with the current `digCount` and `dugByMe: true`.
- **401** if not signed in.
- **404** if the message does not exist or is not visible to the viewer (feed, profile wall, or reply-thread rules).

**Response:** `{ "digCount": number, "dugByMe": true }`

## DELETE /api/messages/[id]/dig

Remove the current user’s dig from a message. **Session only**.

- **404** if there was no dig row for this user and message (or message not visible).
- **401** if not signed in.

**Response:** `{ "digCount": number, "dugByMe": false }`

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
