# User API

## GET /api/user

Get current user profile (from session). Returns user object.

## PUT /api/user/update

Update user profile.

**Body:** `displayName`, `bio`, `maxMessageLength`, `defaultPubliclyVisible`, `messagesPerPage`, `viewingPreference`, `showPreviews`, `showAdvancedPostSettings`, `latitude`, `longitude`, `isPrivateAccount`

## Avatar

### POST /api/user/avatar/upload

Upload avatar image. Multipart form or base64.

### POST /api/user/avatar/from-url

**Body:** `{ url }` — Set avatar from URL (e.g. OAuth profile image)

## Linked Identities

### GET /api/user/identities

Get user's linked identities (GitHub, Bluesky, Mastodon).

### POST /api/user/identities/verify

Verify/re-check a linked identity.

### DELETE /api/user/identities

Unlink identity. Body or query: provider identifier.

## GET /api/user/organizations

Get current user's organizations with roles.
