---
title: Organizations
---

# Organizations

Organizations let multiple users share lists, posting permissions, and (when connected) a shared LinkedIn credential for company-page posting. Roles are `owner`, `admin`, and `member`.

## Endpoint table

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/organizations` | Session | List organizations. Query: `?public=true` for all public orgs, `?userId=...` to filter by member. |
| POST | `/api/organizations` | Session | Create an organization. Body: `name`, `description`, `isPublic`. |
| GET | `/api/organizations/:id` | Session | Get an organization. |
| PUT | `/api/organizations/:id` | Session | Update an organization. |
| DELETE | `/api/organizations/:id` | Session | Delete an organization. |
| GET | `/api/organizations/:id/members` | Session | List members and their roles. |
| POST | `/api/organizations/:id/members` | Session | Add a member. Body: `{ "userId": "...", "role": "member" }`. |
| PUT | `/api/organizations/:id/members/:userId` | Session | Update a member's role (and optionally `active`). |
| DELETE | `/api/organizations/:id/members/:userId` | Session | Remove a member. |
| GET | `/api/organizations/:id/users` | Session | Users in the organization with role details. |
| GET | `/api/organizations/:id/linkedin/status` | Session | LinkedIn credential status for the org. |
| DELETE | `/api/organizations/:id/linkedin/credential` | Session | Disconnect the shared LinkedIn credential. |
| GET | `/api/organizations/:id/linkedin/sync-pages` | Session | List the discovered LinkedIn company pages. |
| POST | `/api/organizations/:id/linkedin/sync-pages` | Session | Re-discover and sync LinkedIn company pages. |
| GET | `/api/organizations/:id/linkedin/assignments` | Session | Page assignments per member. |
| PUT | `/api/organizations/:id/linkedin/assignments` | Session | Update page assignments. |

## Creating an organization

```http
POST /api/organizations
Content-Type: application/json

{ "name": "Acme Dev Team", "description": "Internal engineering org.", "isPublic": false }
```

**Response (201):**

```json
{
  "id": "org_001",
  "name": "Acme Dev Team",
  "description": "Internal engineering org.",
  "isPublic": false,
  "createdAt": "2025-06-11T10:00:00.000Z"
}
```

## Members

```http
POST /api/organizations/org_001/members
Content-Type: application/json

{ "userId": "clx9user00003", "role": "member" }
```

Roles: `owner`, `admin`, `member`. You must be an owner or admin to add or change roles. The last owner cannot be demoted or removed — the server returns `400`.

```http
PUT /api/organizations/org_001/members/clx9user00003
Content-Type: application/json

{ "role": "admin" }
```

**Response (200):**

```json
{
  "message": "Member role updated successfully",
  "membership": {
    "id": "mem_xyz001",
    "userId": "clx9user00003",
    "organizationId": "org_001",
    "role": "admin",
    "active": true,
    "createdAt": "2025-06-11T10:00:00.000Z"
  }
}
```

Pass `"active": false` alongside `role` to suspend a member's access without removing them from the organization.

## LinkedIn organization integration

When an organization's owners or admins connect a shared LinkedIn credential, member-authored messages can be cross-posted as company posts.

Start the OAuth flow:

```http
GET /api/auth/linkedin/org-authorize?organizationId=org_001
```

This redirects the browser to LinkedIn requesting the `rw_organization_admin` scope. On completion, the discovered LinkedIn company pages are stored as `OrgLinkedInPage` records bound to the organization.

| Method | Path | Purpose |
|--------|------|---------|
| `GET /api/organizations/:id/linkedin/status` | Returns `{ "connected": true, "expiresAt": "..." }` plus the discovered pages. |
| `POST /api/organizations/:id/linkedin/sync-pages` | Re-discover and upsert company pages. |
| `GET /api/organizations/:id/linkedin/assignments` | Returns which member is assigned to post to which page. |
| `PUT /api/organizations/:id/linkedin/assignments` | Replace the assignment map atomically. |
| `DELETE /api/organizations/:id/linkedin/credential` | Revoke the shared credential (assignments are cleared server-side). |

When a member with an active assignment cross-posts with `crossPostToLinkedIn: true` (and no explicit `linkedInTargets`), the post is published using the org credential as the assigned company page. Without an assignment (or after disconnect) cross-posts fall back to the member's personal LinkedIn identity.

For personal LinkedIn pages (not org-bound), see [LinkedIn Integration](./linkedin-integration).
