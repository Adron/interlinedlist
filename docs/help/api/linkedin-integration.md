---
title: LinkedIn Integration
---

# LinkedIn Integration

These endpoints manage **personal** LinkedIn posting targets — the destinations the user can cross-post to via their own linked LinkedIn identity. For **organization-bound** LinkedIn (a shared org credential and company-page assignments), see [Organizations](./organizations).

A **target** is one of three things:

1. The user's personal LinkedIn account (linked via OAuth)
2. An organization page assigned to the user with an active org connection
3. A **personal company page** — a LinkedIn company page the user administers, discovered through their own LinkedIn connection (requires the `rw_organization_admin` scope)

## Endpoint table

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/linkedin/targets` | Session | Every LinkedIn destination the caller can post to right now. |
| GET | `/api/linkedin/posting-targets` | Session | Available targets together with the user's saved enabled/disabled preference. |
| PUT | `/api/linkedin/posting-targets` | Session | Replace the user's posting-target preferences atomically. |
| POST | `/api/linkedin/sync-pages` | Session | Re-discover and sync personal-company-page targets. |

## Target shape

```json
{ "kind": "personal", "label": "Alice Example", "avatarUrl": "https://..." }
```

```json
{
  "kind": "orgPage",
  "pageId": "<OrgLinkedInPage uuid>",
  "linkedInPageId": "12345678",
  "label": "Acme Corp",
  "logoUrl": "https://..."
}
```

```json
{
  "kind": "personalPage",
  "personalPageId": "<LinkedInPersonalPage uuid>",
  "linkedInPageId": "87654321",
  "label": "Alice's Studio",
  "logoUrl": "https://..."
}
```

`pageId` (org) and `personalPageId` (personal) are the InterlinedList record IDs to use in the `linkedInTargets` field when posting via `POST /api/messages`. `linkedInPageId` is LinkedIn's own page identifier. If the same LinkedIn page is reachable both as an org page and as a personal page, only the `orgPage` form is returned.

## Listing available targets

```http
GET /api/linkedin/targets
```

```json
{
  "targets": [
    { "kind": "personal", "label": "Alice Example", "avatarUrl": null },
    { "kind": "orgPage", "pageId": "...", "linkedInPageId": "12345678", "label": "Acme Corp", "logoUrl": null },
    { "kind": "personalPage", "personalPageId": "...", "linkedInPageId": "87654321", "label": "Alice's Studio", "logoUrl": null }
  ]
}
```

## Saved preferences

```http
GET /api/linkedin/posting-targets
```

```json
{
  "targets": [
    { "kind": "personal", "label": "Alice Example", "avatarUrl": null, "enabled": true },
    { "kind": "orgPage", "pageId": "...", "linkedInPageId": "12345678", "label": "Acme Corp", "logoUrl": null, "enabled": false },
    { "kind": "personalPage", "personalPageId": "...", "linkedInPageId": "87654321", "label": "Alice's Studio", "logoUrl": null, "enabled": true }
  ],
  "orgScopeMissing": false
}
```

Preferences are a **client-side default for the composer's target picker** — they are not enforced when posting. Server-side authorization for `POST /api/messages` always re-validates against the user's actual assignments and linked identities.

`orgScopeMissing` is `true` when the user has a personal LinkedIn connection but the stored scope does not include `rw_organization_admin`. The fix is to reconnect LinkedIn via `GET /api/auth/linkedin/authorize?link=true`.

## Updating preferences

```http
PUT /api/linkedin/posting-targets
Content-Type: application/json

{
  "targets": [
    { "kind": "personal" },
    { "kind": "orgPage", "pageId": "<OrgLinkedInPage uuid>" },
    { "kind": "personalPage", "personalPageId": "<LinkedInPersonalPage uuid>" }
  ]
}
```

Targets in the body become enabled; all others become disabled. An empty array disables every target. Duplicates are removed. Each target is validated against what the caller can actually post to — invalid entries return `400`.

## Re-syncing personal company pages

```http
POST /api/linkedin/sync-pages
```

```json
{
  "pages": [
    {
      "id": "<LinkedInPersonalPage uuid>",
      "linkedInPageId": "87654321",
      "pageName": "Alice's Studio",
      "pageLogoUrl": "https://...",
      "lastSyncedAt": "2026-06-12T00:00:00.000Z"
    }
  ]
}
```

Pages no longer administered are removed; new and existing pages are upserted. Errors:

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `not_linked` | LinkedIn account not linked. |
| 400 | `org_scope_missing` | The connection lacks an active token with the `rw_organization_admin` scope. Reconnect to fix. |
| 502 | — | LinkedIn API failure while discovering pages. |

Pages are also discovered automatically by the OAuth callback when the account is linked with the org scope. This endpoint is for refreshing the list afterwards.
