# Organizations API

## GET /api/organizations

**Query params:**
- `public=true` — Only public organizations
- `userId=...` — User's organizations (requires auth, same user or admin)
- `limit`, `offset`

**Response:** `{ organizations, pagination }`

## POST /api/organizations

Create organization. Body: `{ name, description?, avatar?, isPublic? }`

Slug generated from name. Returns `{ organization }` or similar.

## GET /api/organizations/[id]

Get organization by ID. Members can see private orgs.

## PUT /api/organizations/[id]

Update organization. Requires owner/admin role.

## Members

### GET /api/organizations/[id]/members

List members with roles.

### POST /api/organizations/[id]/members

Add member. Body: `{ userId, role }`. Requires owner/admin.

### PUT /api/organizations/[id]/members/[userId]

Update member role. Requires owner/admin.

### DELETE /api/organizations/[id]/members/[userId]

Remove member. Requires owner/admin or self-removal.

## GET /api/organizations/[id]/users

Get users in organization (for member management UI).
