# InterlinedList API Reference

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Authentication](#authentication)
4. [Branding & Style Guide](#branding--style-guide)
5. [Messages](#messages)
6. [Lists](#lists)
7. [List Folders](#list-folders)
8. [Documents](#documents)
9. [Document Folders](#document-folders)
10. [Users and Profile](#users-and-profile)
11. [Following](#following)
12. [Organizations](#organizations)
13. [Notifications](#notifications)
14. [Push Notifications](#push-notifications)
15. [Exports](#exports)
16. [Stripe / Subscriptions](#stripe--subscriptions)
17. [GitHub Integration](#github-integration)
18. [LinkedIn Integration](#linkedin-integration)
19. [LinkedIn Organization Integration](#linkedin-organization-integration)
20. [Utility Endpoints](#utility-endpoints)
21. [OAuth Provider Flows](#oauth-provider-flows)
22. [Administration](#administration)
23. [Cron Endpoints (Internal)](#cron-endpoints-internal)
24. [Webhook Endpoints (Internal)](#webhook-endpoints-internal)

---

## Overview

**Base URL:** `https://interlinedlist.com` (or your self-hosted domain)

### Authentication

Two authentication mechanisms are supported interchangeably on all protected routes.

**Session cookie (browser):**  
Login via `POST /api/auth/login`. The response sets an `HttpOnly` session cookie (`interlinedlist-session`). The cookie holds a comma-separated list of up to 5 session IDs supporting the multi-account feature. Subsequent requests from a browser send this cookie automatically.

**Bearer token (CLI / API):**  
Obtain a long-lived sync token via `POST /api/auth/sync-token`. Pass it in every request as:
```
Authorization: Bearer <token>
```
Sync tokens are stored hashed in the database and are not scoped — they carry the same permissions as a session for that user.

> **Note on auth helpers.** Most route handlers use `getCurrentUserOrSyncToken(request)` and therefore accept either a session cookie or `Authorization: Bearer <sync-token>`. A subset — primarily `/api/auth/*`, all `/api/exports/*`, `/api/stripe/*`, `/api/user/identities/*`, `/api/user/organizations`, `/api/linkedin/*`, `/api/organizations/*`, `/api/messages/:id/dig`, and `/api/architecture-aggregates/*` — calls `getCurrentUser()` and therefore requires the session cookie. Endpoints requiring a session cookie are marked in their description.

### Subscription Tiers

`User.customerStatus` is one of:

| Value | Meaning |
|-------|---------|
| `free` | Free tier — most premium features are gated by `isSubscriber()`. |
| `subscriber` | Active paid subscription, billing plan unknown or non-standard. |
| `subscriber:monthly` | Active monthly subscription (set by the Stripe webhook). |
| `subscriber:annual` | Active annual subscription (set by the Stripe webhook). |

Anything starting with `subscriber` is treated as a paid subscriber by `lib/subscription/is-subscriber.ts`. The Stripe webhook also keeps `subscriber:*` during the `past_due` grace period.

### Error Format

All error responses share a consistent shape:

```json
{ "error": "Human-readable message" }
```

Validation errors from list data rows include an additional `details` field:

```json
{ "error": "Validation failed", "details": { "fieldKey": "Error message" } }
```

### Common Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request / validation error |
| 401 | Not authenticated |
| 403 | Authenticated but not authorized (or unverified email, or requires subscription) |
| 404 | Resource not found |
| 409 | Conflict (duplicate) |
| 413 | Payload too large |
| 429 | Rate limited |
| 500 | Internal server error |

---

## Quick Start

### Step 1 — Authenticate

```bash
curl -c cookies.txt -X POST https://interlinedlist.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "password": "yourpassword"}'
```

Response:
```json
{
  "message": "Login successful",
  "user": { "id": "clxyz...", "username": "you", "email": "you@example.com" }
}
```

### Step 2 — Post a message

```bash
curl -b cookies.txt -X POST https://interlinedlist.com/api/messages \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello from the API!", "publiclyVisible": true}'
```

Response:
```json
{
  "message": "Message created successfully",
  "data": { "id": "msg123", "content": "Hello from the API!", "publiclyVisible": true, ... }
}
```

### Step 3 — Cross-post to Mastodon and Bluesky (requires subscription)

```bash
curl -b cookies.txt -X POST https://interlinedlist.com/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Posting everywhere at once!",
    "publiclyVisible": true,
    "mastodonProviderIds": ["<linked-identity-id>"],
    "crossPostToBluesky": true
  }'
```

---

## Authentication

### POST /api/auth/register

**Auth required:** no  
**Description:** Create a new user account; sets a session cookie and sends a verification email.

**Request body**
```json
{
  "email": "you@example.com",
  "username": "yourhandle",
  "password": "minimum8chars",
  "displayName": "Your Name"
}
```

Fields `email`, `username`, and `password` are required. `displayName` defaults to `username`.

**Response** `201 Created`
```json
{
  "message": "User created successfully",
  "user": {
    "id": "clxyz...",
    "email": "you@example.com",
    "username": "yourhandle",
    "displayName": "Your Name",
    "avatar": null,
    "bio": null,
    "theme": null,
    "emailVerified": false,
    "createdAt": "2026-06-04T00:00:00.000Z"
  }
}
```

A session cookie is set on the response. A verification email is dispatched via Resend.

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Missing required field or password shorter than 8 characters |
| 409 | Email or username already taken |

---

### POST /api/auth/login

**Auth required:** no  
**Description:** Authenticate with email and password; sets a session cookie.

**Request body**
```json
{ "email": "you@example.com", "password": "yourpassword" }
```

**Response** `200 OK`
```json
{
  "message": "Login successful",
  "user": {
    "id": "clxyz...",
    "email": "you@example.com",
    "username": "yourhandle",
    "displayName": "Your Name",
    "avatar": null,
    "bio": null,
    "theme": null,
    "emailVerified": true,
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Email or password missing |
| 401 | Invalid credentials |

---

### POST /api/auth/logout

**Auth required:** no (acts on the session cookie present in the request)  
**Description:** Destroy the current session (or all sessions with `all=true`).

**Query parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `all` | boolean | no | Pass `true` to log out all cached accounts |

Alternatively pass `{ "all": true }` in the request body.

**Response** `200 OK`
```json
{ "message": "Logged out successfully" }
```

---

### POST /api/auth/sync-token

**Auth required:** no  
**Description:** Exchange email and password for a long-lived API token for CLI use. No session cookie is set.

**Request body**
```json
{ "email": "you@example.com", "password": "yourpassword" }
```

**Response** `200 OK`
```json
{
  "token": "a3f8...64-char hex...",
  "message": "Sync token created. Store it in your CLI config."
}
```

Store the token and send it as `Authorization: Bearer <token>` on subsequent requests.

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Missing email or password |
| 401 | Invalid credentials |

---

### POST /api/auth/forgot-password

**Auth required:** no  
**Description:** Request a password-reset email. Always returns 200 to prevent email enumeration.

**Request body**
```json
{ "email": "you@example.com" }
```

**Response** `200 OK`
```json
{ "message": "If an account with that email exists, a password reset link has been sent." }
```

---

### POST /api/auth/reset-password

**Auth required:** no  
**Description:** Complete a password reset using the token from the reset email.

**Request body**
```json
{ "token": "<reset-token>", "password": "newpassword123" }
```

**Response** `200 OK`
```json
{ "message": "Password has been reset successfully" }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Missing fields, password too short, or invalid/expired token |

---

### POST /api/auth/verify-email

**Auth required:** no  
**Description:** Verify a user's email address using the token sent at registration.

**Request body**
```json
{ "token": "<verification-token>" }
```

**Response** `200 OK`
```json
{ "message": "Email verified successfully" }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Missing or expired token |

---

### POST /api/auth/send-verification-email

**Auth required:** yes  
**Description:** Resend the email verification email. Rate-limited to once per 10 minutes.

**Response** `200 OK`
```json
{ "message": "Verification email sent successfully" }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |
| 429 | Rate limit — try again in N minutes |
| 503 | Email verification feature unavailable |

---

### POST /api/auth/verify-email-change

**Auth required:** no  
**Description:** Confirm a requested email address change using the token sent to the new address.

**Request body**
```json
{ "token": "<email-change-token>" }
```

**Response** `200 OK`
```json
{ "message": "Email updated successfully" }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Missing or expired token |
| 409 | New email was claimed by another account during the confirmation window |

---

### GET /api/auth/accounts

**Auth required:** yes  
**Description:** List all cached (multi-account) sessions for the current browser cookie.

**Response** `200 OK`
```json
{
  "accounts": [
    { "id": "user1", "username": "alice", "displayName": "Alice", "avatar": null }
  ],
  "currentUserId": "user1"
}
```

---

### POST /api/auth/switch

**Auth required:** yes  
**Description:** Switch the active session to a different cached account.

**Request body**
```json
{ "userId": "user2" }
```

**Response** `200 OK`
```json
{ "message": "Switched successfully" }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | `userId` missing |
| 401 | Target user is not in the cached sessions |

---

### POST /api/auth/remove-account

**Auth required:** yes  
**Description:** Remove a cached account from the multi-account session list.

**Request body**
```json
{ "userId": "user2" }
```

**Response** `200 OK`
```json
{ "message": "Account removed" }
```

---

### GET /api/auth/linkedin/status

**Auth required:** no  
**Description:** Check whether LinkedIn OAuth is configured on this server.

**Response** `200 OK`
```json
{ "configured": true, "redirectUri": "https://..." }
```

---

### GET /api/auth/twitter/status

**Auth required:** no  
**Description:** Check whether Twitter/X OAuth is configured on this server.

**Response** `200 OK`
```json
{ "configured": true, "redirectUri": "https://..." }
```

---

## Branding & Style Guide

This section documents the visual identity and brand assets for InterlinedList. Developers building integrations, embedded widgets, or data-service experiences that surface InterlinedList data must follow these guidelines.

### Brand Overview

InterlinedList is a social list-management and cross-posting platform available in Free and Subscriber tiers. The visual identity combines the **Darkone_v1.0** Bootstrap-based admin theme with a custom InterlinedList primary palette. The three signature brand colors — Ocean Blue, Emerald Green, and Amber Gold — are drawn directly from the logo SVG and must be used consistently across all integrations.

---

### Logo Assets

The following logo files are the canonical assets. Use them exactly as provided — do not recreate, re-export, or trace them.

| File | Description |
|------|-------------|
| `public/logo-dark.svg` | Dark-mode vector logo, viewBox `0 0 2048 2048`, rendered at 512×512. Use on dark and near-black backgrounds. |
| `public/logo-light.svg` | Light-mode vector logo, same geometry as the dark variant. White cutouts replace near-black fills. Use on light or white backgrounds. |
| `public/logo-icon.png` | Icon-only raster asset for contexts that cannot render SVG. |
| `public/favicon.svg` | SVG favicon. |
| `.claude/logo/interlinedlist-logo-text.png` | Logotype with full "InterlinedList" wordmark. |
| `.claude/logo/interlinedlist-logo-only.png` | Icon mark only, no wordmark. |
| `.claude/logo/interlinedlist.svg` | Canonical SVG for general-purpose use. |
| `.claude/logo/interlinedlist.png` | Canonical PNG for general-purpose use. |

#### Logo Usage Rules

- **Minimum size:** Never render the logo below 24 px on its shortest axis.
- **Clear space:** Maintain a minimum clear space equal to the height of the letter "I" in the wordmark on all four sides.
- **Dark vs. light variant:** Use `logo-dark.svg` on backgrounds darker than 50% luminance. Use `logo-light.svg` on backgrounds lighter than 50% luminance. Do not place either variant on a mid-tone background where contrast is insufficient.
- **No recoloring:** Do not change any fill colors in the SVG. Do not apply CSS `filter`, `color`, or `fill` overrides that alter the logo's appearance.
- **No geometric transforms:** Do not stretch, squish, rotate, skew, or add drop shadows, glows, or outlines.
- **Attribution:** When surfacing InterlinedList data via the API, include the attribution "Powered by InterlinedList" adjacent to the logo. A text-only attribution is acceptable when the logo cannot be rendered.

---

### Brand Color Palette

#### Primary Palette (logo-derived)

These three colors are extracted directly from the fill values in `public/logo-dark.svg` and `public/logo-light.svg`. They are the definitive InterlinedList brand colors.

| Name | Hex | RGB | Role |
|------|-----|-----|------|
| Ocean Blue | `#0F4C5F` | `rgb(15, 76, 95)` | Primary action color, links, buttons |
| Emerald Green | `#34A56D` | `rgb(52, 165, 109)` | Success states, active indicators, live badges |
| Amber Gold | `#F9AF36` | `rgb(249, 175, 54)` | Highlights, badges, calls-to-action |
| Near Black | `#1A1A1A` | `rgb(26, 26, 26)` | Body text, dark backgrounds |
| White | `#FFFFFF` | `rgb(255, 255, 255)` | Light cutouts, reversed text |

#### Darkone Theme Palette

These are the Bootstrap SCSS variables defined in `styles/darkone/scss/config/_variables.scss`. They govern the admin panel chrome and component defaults.

| SCSS Variable | Hex | Semantic Role |
|---------------|-----|---------------|
| `$purple` | `#7E67FE` | Darkone primary (`$primary`) |
| `$blue` | `#1A80F8` | Bootstrap blue |
| `$cyan` | `#1AB0F8` | `$info` |
| `$green` | `#21D760` | `$success` |
| `$red` | `#ED321F` | `$danger` |
| `$gray-900` | `#21252E` | `$dark`, darkest chrome |
| `$gray-800` | `#36404A` | Secondary chrome, dropdown dark bg |
| `$gray-700` | `#424E5A` | `$secondary`, borders, muted surfaces |

#### Dark Mode CSS Custom Properties

These variables are set on `[data-theme="dark"]` in `app/globals.css` and control the app's dark-mode surfaces.

| CSS Variable | Value | Usage |
|--------------|-------|-------|
| `--color-bg` | `#1A1A1A` | Page background |
| `--color-bg-secondary` | `#2D2D2D` | Card and panel backgrounds |
| `--color-bg-tertiary` | `#333333` | Input and subtle surface backgrounds |
| `--color-link` | `#4A9EFF` | Hyperlinks |
| `--color-link-hover` | `#6BB3FF` | Hyperlink hover state |
| `--color-hero-gradient-start` | `#667EEA` | Hero section gradient start |
| `--color-hero-gradient-end` | `#764BA2` | Hero section gradient end |

#### Darkone Dark Backgrounds (from `_variables-dark.scss`)

| SCSS Variable | Hex | Darkone Usage |
|---------------|-----|---------------|
| `$body-bg-dark` | `#191E23` | Dark mode body background |
| `$body-secondary-bg-dark` | `#1D2329` | Sidebar, topbar, secondary panels |
| `$body-tertiary-bg-dark` | `#242B33` | Tertiary surfaces |

---

### Typography

| Property | Value |
|----------|-------|
| Primary font family | `"Play"` (Google Fonts) |
| Fallback stack | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif` |
| Font smoothing | `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale` |
| Base line-height | `1.6` |

Load the Play font from Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Play:wght@400;700&display=swap" rel="stylesheet">
```

Apply the complete font stack:

```css
body {
  font-family: "Play", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  line-height: 1.6;
}
```

---

### Branding Package

A full branding package ZIP is available at the project root: `Darkone_v1.0.zip`. This archive contains the complete Darkone Bootstrap admin theme — SCSS source, compiled CSS, and component examples. Partners building branded admin experiences or white-label integrations should use this as the theme foundation.

**What to include in a partner branding bundle:**

| Asset | Source |
|-------|--------|
| Logo SVG (dark variant) | `public/logo-dark.svg` |
| Logo SVG (light variant) | `public/logo-light.svg` |
| Favicon SVG | `public/favicon.svg` |
| Canonical PNG logo | `.claude/logo/interlinedlist.png` |
| Logotype PNG | `.claude/logo/interlinedlist-logo-text.png` |
| Color tokens JSON | Derive from the Primary Palette table above |
| Font reference | `"Play"` via Google Fonts (see Typography section) |
| Usage guidelines | These docs, or a PDF export of this section |

**Sample color tokens JSON** for design-system tooling:

```json
{
  "brand": {
    "oceanBlue":    { "value": "#0F4C5F", "role": "primary" },
    "emeraldGreen": { "value": "#34A56D", "role": "success" },
    "amberGold":    { "value": "#F9AF36", "role": "highlight" },
    "nearBlack":    { "value": "#1A1A1A", "role": "text-dark" },
    "white":        { "value": "#FFFFFF", "role": "text-light" }
  },
  "darkMode": {
    "bgBody":       { "value": "#191E23" },
    "bgSecondary":  { "value": "#1D2329" },
    "bgTertiary":   { "value": "#242B33" }
  }
}
```

---

### Integration Guidelines for API Consumers

When building widgets, embedded lists, or dashboards that display InterlinedList data, apply the palette as follows.

#### Color Application

| Context | Color | Hex |
|---------|-------|-----|
| Primary buttons and action links | Ocean Blue | `#0F4C5F` |
| Success states, active/live indicators | Emerald Green | `#34A56D` |
| Badges, highlights, calls-to-action | Amber Gold | `#F9AF36` |
| Dark mode panel background | Darkone body dark | `#191E23` |
| Dark mode card/sidebar background | Darkone secondary dark | `#1D2329` |
| Dark mode page body (app CSS) | `--color-bg` | `#1A1A1A` |
| Dark mode card (app CSS) | `--color-bg-secondary` | `#2D2D2D` |

#### Attribution Requirement

Any surface that retrieves and displays InterlinedList data via the API must include attribution. The preferred form is the logo mark followed by the text "Powered by InterlinedList". A plain-text "Powered by InterlinedList" with a link to `https://interlinedlist.com` is acceptable when logo rendering is not feasible (for example, plain-text email or CLI output).

**Do not use the Darkone purple (`#7E67FE`) or the hero gradient (`#667EEA` → `#764BA2`) as primary brand colors in partner integrations.** Those colors belong to the admin panel chrome and are not part of the public InterlinedList brand palette.

---

### Branding Package Contents Checklist

Partners who receive or build a branded integration bundle should verify it contains the following:

- [ ] `logo-dark.svg` — vector logo for dark backgrounds
- [ ] `logo-light.svg` — vector logo for light backgrounds
- [ ] `interlinedlist.png` — canonical raster logo
- [ ] `interlinedlist-logo-text.png` — logotype with wordmark
- [ ] `favicon.svg` — favicon asset
- [ ] `color-tokens.json` — color tokens derived from this section
- [ ] Font reference — "Play" from Google Fonts, with fallback stack
- [ ] Link to or PDF of these usage guidelines

---

## Messages

### GET /api/messages

**Auth required:** no (authenticated users see more content)  
**Description:** Retrieve the top-level message feed. Unauthenticated callers see only public messages. Authenticated callers respect the user's `viewingPreference` setting.

**Query parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `limit` | integer | no | Page size (default 50) |
| `offset` | integer | no | Number of messages to skip (default 0) |
| `onlyMine` | boolean | no | Return only the authenticated user's own messages |
| `tag` | string | no | Filter by a specific tag |

**Response** `200 OK`
```json
{
  "messages": [
    {
      "id": "msg123",
      "content": "Hello world",
      "publiclyVisible": true,
      "imageUrls": [],
      "videoUrls": [],
      "tags": [],
      "crossPostUrls": [],
      "scheduledAt": null,
      "pushedMessageId": null,
      "pushCount": 0,
      "createdAt": "2026-06-04T10:00:00.000Z",
      "updatedAt": "2026-06-04T10:00:00.000Z",
      "user": { "id": "u1", "username": "alice", "displayName": "Alice", "avatar": null },
      "dugByMe": false
    }
  ],
  "pagination": { "total": 120, "limit": 50, "offset": 0, "hasMore": true }
}
```

---

### POST /api/messages

**Auth required:** yes  
**Description:** Create a message. Supports replies, push messages, cross-posting to Mastodon / Bluesky / LinkedIn / Twitter, image and video attachments, and scheduled publishing. Images, video, cross-posting, and scheduling require a subscription. The user's email must be verified.

**Request body**
```json
{
  "content": "Your message text",
  "publiclyVisible": true,
  "parentId": null,
  "pushedMessageId": null,
  "imageUrls": [],
  "videoUrls": [],
  "tags": [],
  "mastodonProviderIds": [],
  "crossPostToBluesky": false,
  "crossPostToLinkedIn": false,
  "linkedInTargets": [
    { "kind": "personal" },
    { "kind": "orgPage", "pageId": "<org-linkedin-page-uuid>" },
    { "kind": "personalPage", "personalPageId": "<linkedin-personal-page-uuid>" }
  ],
  "linkedInLinkAsFirstComment": false,
  "crossPostToTwitter": false,
  "scheduledAt": null,
  "scheduledCrossPostConfig": null
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `content` | string | yes (unless plain push) | Message text. Maximum length set per-user (default 666). |
| `publiclyVisible` | boolean | no | Defaults to the user's `defaultPubliclyVisible` setting. Push messages are always public. |
| `parentId` | string | no | ID of the message being replied to. Cannot be combined with `pushedMessageId`. |
| `pushedMessageId` | string | no | ID of the message to push (re-share). The original message must be public. Cannot be scheduled. |
| `imageUrls` | string[] | no | 1–8 Vercel Blob URLs obtained from `POST /api/messages/images/upload`. Requires subscription. |
| `videoUrls` | string[] | no | Exactly 0 or 1 Vercel Blob URL from `POST /api/messages/videos/upload`. Requires subscription. |
| `tags` | string[] | no | Arbitrary tags for filtering. |
| `mastodonProviderIds` | string[] | no | IDs of linked Mastodon identities to post to. Requires subscription. Skipped for replies and push messages. |
| `crossPostToBluesky` | boolean | no | Post to the linked Bluesky account. Requires subscription. Skipped for replies and push messages. |
| `crossPostToLinkedIn` | boolean | no | Post to LinkedIn. Requires subscription. Skipped for replies and push messages. Destinations are selected with `linkedInTargets`; without it, legacy resolution applies — the most recently connected active `OrgLinkedInPage` assignment posts as `urn:li:organization:<linkedInPageId>` using the org credential, otherwise falls back to the personal `LinkedIdentity`. See `lib/linkedin/resolve-linkedin-target.ts`. |
| `linkedInTargets` | object[] | no | LinkedIn destinations to post to, used with `crossPostToLinkedIn: true`. Each element is `{ "kind": "personal" }`, `{ "kind": "orgPage", "pageId": "<OrgLinkedInPage uuid>" }`, or `{ "kind": "personalPage", "personalPageId": "<LinkedInPersonalPage uuid>" }`. Duplicates are removed. Each org page must be assigned to the caller; each personal page must belong to the caller's own LinkedIn connection. Discover available targets via `GET /api/linkedin/posting-targets`. |
| `linkedInTarget` | object | no | **Legacy** single-destination form, same element shape as `linkedInTargets`. Accepted for backward compatibility and treated as a one-element array when `linkedInTargets` is absent or empty. |
| `linkedInLinkAsFirstComment` | boolean | no | Post the InterlinedList link as the first comment rather than in the body (LinkedIn only; applies to all LinkedIn targets). |
| `crossPostToTwitter` | boolean | no | Post to the linked Twitter/X account. Requires subscription. |
| `scheduledAt` | ISO 8601 string | no | Future date/time for scheduled publishing. Cannot be combined with `pushedMessageId`. Cross-post settings are stored in `scheduledCrossPostConfig`. |
| `scheduledCrossPostConfig` | object | no | Cross-post configuration stored alongside a scheduled message (mirrors the cross-post fields above). |

**Response** `201 Created`
```json
{
  "message": "Message created successfully",
  "data": { "id": "msg456", "content": "...", ... },
  "crossPostResults": [
    { "providerId": "...", "instanceName": "mastodon.social", "success": true, "url": "https://..." },
    { "providerId": "", "instanceName": "LinkedIn (personal)", "success": true, "url": "https://www.linkedin.com/..." },
    { "providerId": "", "instanceName": "LinkedIn (Acme Corp)", "success": false, "error": "The selected LinkedIn page is unavailable — the assignment was removed or the organization connection expired.", "errorCode": "page_unavailable", "statusCode": 410 }
  ]
}
```

Each `crossPostResults` entry has the shape `{ providerId, instanceName, success, url?, error?, errorCode?, statusCode? }`. Failure entries always carry `success: false` and `error`; `errorCode` and `statusCode` are populated when the upstream provider returned a structured error (e.g. Mastodon/LinkedIn HTTP errors). See `app/api/messages/route.ts` for the exact union.

LinkedIn posting fans out: each entry in `linkedInTargets` is posted independently and produces its own `crossPostResults` entry, so one failed target does not abort the others. The `instanceName` is `LinkedIn (<page name>)` for org pages and personal company pages, `LinkedIn (personal)` for the personal account when multiple targets are requested, and plain `LinkedIn` for a single default/personal post. An unavailable personal company page fails with `"The selected LinkedIn company page is unavailable — reconnect LinkedIn or re-sync your company pages in Settings."`.

When scheduling: `"message": "Message scheduled successfully"` and `"scheduledAt"` are included instead. The stored `scheduledCrossPostConfig` includes `linkedInTargets` when provided, and the cron publisher posts to each target.

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Missing content, content too long, invalid fields, push + reply combined, push cannot be scheduled, push target not public. Malformed LinkedIn destinations return `{ "error": "Invalid linkedInTargets" }` or `{ "error": "Invalid linkedInTarget" }`. |
| 401 | Not authenticated |
| 403 | Email not verified, or subscription required for images/video/cross-post/schedule |
| 404 | Parent message or push target not found |
| 409 | You already pushed this message |

---

### GET /api/messages/:id

**Auth required:** no  
**Description:** Retrieve a single message. Unauthenticated users can only retrieve public messages.

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Message ID |

**Response** `200 OK` — the full message object with `dugByMe`.

**Error responses**

| Status | Condition |
|--------|-----------|
| 404 | Message not found or not visible to caller |

---

### PATCH /api/messages/:id

**Auth required:** yes (session cookie only)  
**Description:** Edit a scheduled message that has not yet been published. Only `scheduledAt` and `scheduledCrossPostConfig` can be updated.

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Message ID |

**Request body**
```json
{
  "scheduledAt": "2026-07-01T09:00:00.000Z",
  "scheduledCrossPostConfig": {
    "mastodonProviderIds": [],
    "crossPostToBluesky": true,
    "crossPostToLinkedIn": true,
    "linkedInLinkAsFirstComment": false,
    "linkedInTargets": [
      { "kind": "personal" },
      { "kind": "orgPage", "pageId": "<org-linkedin-page-uuid>" },
      { "kind": "personalPage", "personalPageId": "<linkedin-personal-page-uuid>" }
    ],
    "crossPostToTwitter": false
  }
}
```

`scheduledCrossPostConfig.linkedInTargets` is an array of LinkedIn destinations (`{ "kind": "personal" }`, `{ "kind": "orgPage", "pageId": "<uuid>" }`, or `{ "kind": "personalPage", "personalPageId": "<uuid>" }`); the cron publisher posts to each one. The legacy single-object `linkedInTarget` field is still accepted and is stored only when `linkedInTargets` is absent or empty. Set `scheduledCrossPostConfig` to `null` to clear all cross-post settings.

**Response** `200 OK` — the updated message object.

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Invalid date, date not in the future, message is not a pending scheduled post, `Invalid linkedInTargets`, or `Invalid linkedInTarget` |
| 401 | Not authenticated |
| 403 | Not your message |
| 404 | Message not found |

---

### DELETE /api/messages/:id

**Auth required:** yes  
**Description:** Delete a message and all its replies. Removes associated blobs from storage and deletes cross-posts on Mastodon, Bluesky, and LinkedIn where credentials are available.

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Message ID |

**Response** `200 OK`
```json
{ "message": "Message deleted successfully" }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |
| 403 | Not your message |
| 404 | Message not found |
| 409 | Other messages still push this one — remove those pushes first |

---

### POST /api/messages/:id/dig

**Auth required:** yes (session cookie only)  
**Description:** Record a "dig" reaction on a message. Idempotent — calling twice does not create a duplicate dig. The author is notified asynchronously the first time. Permission is gated by `canViewerDigMessage` (the message must be visible to the viewer; a 404 is returned for hidden messages).

**Response** `200 OK`
```json
{ "isNewDig": true, "digCount": 5, "digCreatedAt": "2026-06-18T00:00:00.000Z" }
```

`isNewDig` is `false` (and `digCreatedAt` may be omitted) when the viewer had already dug the message.

**Error responses**

| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |
| 404 | Message not found or not visible to viewer |

---

### DELETE /api/messages/:id/dig

**Auth required:** yes (session cookie only)  
**Description:** Remove the viewer's dig on a message.

**Response** `200 OK`
```json
{ "digCount": 4 }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |
| 404 | Message not found or viewer had not dug it |

---

### POST /api/messages/:id/metadata

**Auth required:** no (intended for internal use; no auth check)  
**Description:** Re-detect links in the message content and refresh stored Open Graph / oEmbed metadata. Updates `Message.linkMetadata`. The `POST /api/messages` handler automatically triggers this endpoint asynchronously after creating any message that contains at least one URL, so manual calls are only necessary when a link's metadata is stale or the original fetch failed.

**Response** `200 OK`
```json
{
  "message": "Metadata fetched successfully",
  "metadata": { "links": [ { "url": "...", "title": "...", "description": "...", "image": "..." } ] }
}
```

When the message contains no links the response is `200 OK` with `{ "message": "No links found in message" }`.

**Error responses**

| Status | Condition |
|--------|-----------|
| 404 | Message not found |
| 500 | Internal error during metadata fetch |

---

### GET /api/messages/:id/replies

**Auth required:** no (a signed-in author can see replies to their own private posts via the session cookie)  
**Description:** Get direct replies to a message, ordered oldest first. Each reply object includes a `replyCount` for nested replies. If the parent message is private and the caller is not the author, the endpoint returns `404`.

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Parent message ID |

**Response** `200 OK`
```json
{ "replies": [ { "id": "msg789", "content": "...", "replyCount": 2, ... } ], "total": 4 }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 404 | Parent message not found, or parent is not visible to the caller |

---

### GET /api/messages/scheduled

**Auth required:** yes  
**Description:** List the authenticated user's upcoming scheduled messages.

**Query parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `range` | string | no | `today`, `week`, or `month` (default). Controls the lookahead window. |

**Response** `200 OK`
```json
{ "messages": [ { "id": "...", "scheduledAt": "2026-07-01T09:00:00.000Z", ... } ] }
```

---

### POST /api/messages/images/upload

**Auth required:** yes  
**Description:** Upload an image to attach to a message. Images are resized to a maximum of 1200 px per side and 1.4 MB before storage. Requires subscription and verified email.

**Request** `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `file` | File | Image file (any `image/*` MIME type) |

**Response** `200 OK`
```json
{ "url": "https://vercel-blob.com/messages/..." }
```

Pass the returned URL in the `imageUrls` array when calling `POST /api/messages`.

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | No file or not an image |
| 401 | Not authenticated |
| 403 | Email not verified or no subscription |
| 413 | Image too large after resize attempt |

---

### POST /api/messages/videos/upload

**Auth required:** yes  
**Description:** Upload a video to attach to a message. Maximum 3 MB. Accepted formats: MP4, WebM, QuickTime, AVI. Requires subscription and verified email.

**Request** `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `file` | File | Video file |

**Response** `200 OK`
```json
{ "url": "https://vercel-blob.com/messages/..." }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | No file, unsupported format, or file exceeds 3 MB |
| 401 | Not authenticated |
| 403 | Email not verified or no subscription |

---

## Lists

### GET /api/lists

**Auth required:** yes  
**Description:** Get all non-deleted lists owned by the authenticated user.

**Query parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `limit` | integer | no | Page size (default 50) |
| `offset` | integer | no | Records to skip (default 0) |
| `page` | integer | no | 1-based page number (alternative to `offset`) |

**Response** `200 OK`
```json
{
  "lists": [
    {
      "id": "list1",
      "title": "My List",
      "description": null,
      "isPublic": false,
      "parentId": null,
      "parent": null,
      "children": [],
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "pagination": { "total": 12, "limit": 50, "offset": 0, "hasMore": false }
}
```

---

### POST /api/lists

**Auth required:** yes  
**Description:** Create a new list. Requires subscription. Supports DSL schema, parent–child nesting, and GitHub Issues-backed lists.

**Request body**
```json
{
  "title": "Project Backlog",
  "description": "Optional description",
  "isPublic": false,
  "parentId": null,
  "schema": "optional DSL string",
  "messageId": null,
  "metadata": null,
  "source": "local",
  "githubRepo": null
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string | yes | Display name |
| `description` | string | no | |
| `isPublic` | boolean | no | Default false |
| `parentId` | string | no | ID of a parent list owned by this user |
| `schema` | string | no | DSL schema string (not for GitHub lists) |
| `messageId` | string | no | Link to a message |
| `metadata` | object | no | Arbitrary JSON metadata |
| `source` | string | no | `"local"` (default) or `"github"` |
| `githubRepo` | string | no | Required when `source` is `"github"`. Format: `owner/repo` |

**Response** `201 Created`
```json
{
  "message": "List created successfully",
  "data": { "id": "list1", "title": "Project Backlog", "properties": [], ... }
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Missing title, invalid schema, circular parentId reference, or invalid githubRepo format |
| 401 | Not authenticated |
| 403 | No subscription |
| 404 | parentId not found |

---

### GET /api/lists/search

**Auth required:** yes (session cookie or `Authorization: Bearer <sync-token>`)  
**Description:** Search the authenticated user's lists by `title` or `description` (case-insensitive `contains`). Results are ordered by `updatedAt` descending and scoped to the caller; soft-deleted lists are excluded.

**Query parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | yes | Search query, 1–200 characters |
| `limit` | integer | no | Default 20, max 100 |
| `offset` | integer | no | Default 0; negative values are coerced to 0 |

**Response** `200 OK`
```json
{
  "lists": [
    {
      "id": "list1",
      "title": "Reading List",
      "description": "Books to read this year",
      "isPublic": false,
      "folderId": "f1",
      "itemCount": 42,
      "createdAt": "2026-06-21T12:00:00.000Z",
      "updatedAt": "2026-06-21T12:00:00.000Z"
    }
  ],
  "pagination": { "total": 3, "limit": 20, "offset": 0, "hasMore": false }
}
```

`itemCount` is the number of `dataRows` belonging to the list.

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | `q` missing, empty, or longer than 200 characters; `limit` greater than 100 |
| 401 | Not authenticated |
| 500 | Internal server error |

---

### GET /api/lists/:id

**Auth required:** yes  
**Description:** Get a single list by ID.

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | List ID |

**Response** `200 OK`
```json
{ "data": { "id": "list1", "title": "...", "properties": [], ... } }
```

---

### PUT /api/lists/:id

**Auth required:** yes  
**Description:** Update a list's metadata. All fields are optional.

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | List ID |

**Request body**
```json
{
  "title": "New Title",
  "description": "Updated description",
  "isPublic": true,
  "parentId": null,
  "folderId": null,
  "messageId": null,
  "metadata": {}
}
```

**Response** `200 OK`
```json
{ "message": "List updated successfully", "data": { ... } }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Circular parentId reference |
| 401 | Not authenticated |
| 404 | List, parentId, or folderId not found |

---

### DELETE /api/lists/:id

**Auth required:** yes  
**Description:** Hard-delete a list and cascade-delete all its properties and data rows.

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | List ID |

**Response** `200 OK`
```json
{ "message": "List deleted successfully" }
```

---

### POST /api/lists/:id/refresh

**Auth required:** yes  
**Description:** Re-sync the cached rows of a GitHub-backed list against the live GitHub Issues API. Owner-only. Lists not backed by GitHub return 400.

**Response** `200 OK`
```json
{ "message": "Refreshed", "count": 42 }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | List is not GitHub-backed, or `githubRepo` is missing |
| 401 | Not authenticated |
| 404 | List not found or not owned by the caller |
| Other | The GitHub fetch status code (e.g. 401, 404, 502) when GitHub returns an error |

---

### GET /api/lists/:id/data

**Auth required:** yes  
**Description:** Get data rows for a list with pagination, optional key-value filtering, and sorting. For GitHub-backed lists, fetches from GitHub if the cache is empty.

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | List ID |

**Query parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `limit` | integer | no | Page size (default 100) |
| `offset` | integer | no | Default 0 |
| `page` | integer | no | 1-based alternative to offset |
| `sort` | string | no | Property key to sort by |
| `order` | string | no | `asc` or `desc` |
| `<propertyKey>` | string | no | Filter by any property key (e.g., `status=open`) |

**Response** `200 OK`
```json
{
  "rows": [ { "id": "row1", "rowData": { "status": "open", "title": "Fix bug" }, ... } ],
  "pagination": { "total": 50, "limit": 100, "offset": 0, "hasMore": false }
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |
| 404 | List not found or not owned by the caller |

---

### POST /api/lists/:id/data

**Auth required:** yes  
**Description:** Create a new data row. For GitHub-backed lists, creates a GitHub issue. Supports `bulk` creation for local lists.

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | List ID |

**Request body (single row)**
```json
{ "data": { "status": "open", "title": "New task" } }
```

**Request body (bulk, local lists only)**
```json
{
  "bulk": true,
  "data": [
    { "status": "open", "title": "Task 1" },
    { "status": "open", "title": "Task 2" }
  ]
}
```

**Response** `201 Created` (single)
```json
{ "message": "Row created successfully", "data": { "id": "row1", "rowData": { ... } } }
```

**Response** `201 Created` (bulk) — note the different shape: bulk returns a `count`, not the row data.
```json
{ "message": "2 rows created successfully", "count": 2 }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Missing `data`, validation failed (`{ "error": "Validation failed", "details": { ... } }`), or `bulk: true` requested against a GitHub-backed list |
| 401 | Not authenticated |
| 404 | List not found or not owned by the caller |

---

### GET /api/lists/:id/data/:rowId

**Auth required:** yes  
**Description:** Get a single data row.

**Response** `200 OK`
```json
{ "data": { "id": "row1", "rowData": { ... } } }
```

---

### PUT /api/lists/:id/data/:rowId

**Auth required:** yes  
**Description:** Update a data row. For GitHub-backed lists, patches the corresponding issue.

**Request body**
```json
{ "data": { "status": "closed", "title": "Updated task" } }
```

**Response** `200 OK`
```json
{ "message": "Row updated successfully", "data": { ... } }
```

---

### DELETE /api/lists/:id/data/:rowId

**Auth required:** yes  
**Description:** Soft-delete a data row. For GitHub-backed lists, closes the issue.

**Response** `200 OK`
```json
{ "message": "Row deleted successfully" }
```

---

### GET /api/lists/:id/schema

**Auth required:** yes  
**Description:** Return the list's column definitions as a DSL string.

**Response** `200 OK`
```json
{ "data": "title: My List\n---\nstatus: text required\n..." }
```

---

### PUT /api/lists/:id/schema

**Auth required:** yes  
**Description:** Update the list's column definitions. This endpoint accepts **two distinct request body shapes** and the server dispatches by body shape:

- A body containing a top-level `schema` **string** triggers the original **destructive DSL rebuild** flow (see [Destructive DSL rebuild](#destructive-dsl-rebuild-schema-string-body) below).
- A body containing a top-level `properties` **array** triggers the **non-destructive property update** flow (see [Non-destructive property update](#non-destructive-property-update-properties-body) below).

The two branches differ in side effects, validation, and error semantics. Both share the same path and HTTP method; clients select which to use purely by the shape of the JSON they POST. The non-destructive branch is checked first: if `body.properties` is an array, the destructive branch is never reached for that request.

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | List ID. |

---

#### Destructive DSL rebuild (`schema` string body)

**Description:** Replace the list's schema from a DSL string. This deletes all existing property definitions and recreates them. Preserved for backward compatibility with existing clients.

**Request body**
```json
{
  "schema": "title: My List\n---\nstatus: text required\n...",
  "parentId": null,
  "isPublic": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schema` | string | yes | DSL document defining the list title, description, and fields. |
| `parentId` | string \| null | no | Optional parent list ID. `null` clears the parent. The parent must belong to the same user and must not create a circular reference. |
| `isPublic` | boolean | no | Toggle the list's public visibility. |

**Response** `200 OK`
```json
{ "message": "Schema updated successfully", "data": { ... } }
```

**Error responses**

- `400` — `schema` missing; DSL fails to validate or parse; `parentId` is not a string or null; setting the supplied `parentId` would create a circular reference.
- `401` — not authenticated.
- `404` — list does not exist, is soft-deleted, **or belongs to another user** (note: this branch returns 404 for cross-user access, distinct from the non-destructive branch below which returns 403). Also returned when a supplied `parentId` does not resolve to a list owned by the caller.

---

#### Non-destructive property update (`properties[]` body)

**Description:** Apply a row-level diff to the list's properties. Existing rows referenced by `id` are updated in place; rows without an `id` are created; rows present in the current schema but absent from the request are deleted. Row data for surviving keys is preserved; deleted-property keys are stripped from every row's JSON data.

**Request body**
```json
{
  "properties": [
    {
      "id": null,
      "propertyKey": "title",
      "propertyName": "Title",
      "propertyType": "text",
      "displayOrder": 0,
      "isVisible": true,
      "isRequired": false,
      "defaultValue": null,
      "helpText": null,
      "placeholder": null
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `properties` | array | yes | Authoritative list of properties the list should have after the request completes. Order in the array determines `displayOrder` (see below). |
| `properties[].id` | string \| null | no | `null`, omitted, or any falsy value marks the property as **new** and creates a row. A non-null value must reference an existing `ListProperty` on this list — referencing an unknown id returns 400. |
| `properties[].propertyKey` | string | yes | 1–60 characters. Unique within the request. **Cannot be changed for an existing `id`**; rename `propertyName` instead. |
| `properties[].propertyName` | string | yes | 1–120 characters. Display label. |
| `properties[].propertyType` | string | yes | One of `text`, `number`, `boolean`, `date`, `url`, `email`. |
| `properties[].displayOrder` | number | no | Accepted but ignored — see note below. |
| `properties[].isVisible` | boolean | no | Defaults to `true`. |
| `properties[].isRequired` | boolean | no | Defaults to `false`. |
| `properties[].defaultValue` | string \| null | no | Defaults to `null`. |
| `properties[].helpText` | string \| null | no | Defaults to `null`. |
| `properties[].placeholder` | string \| null | no | Defaults to `null`. |

> **`displayOrder` is authoritative — but derived from array index.** After validation, properties are renumbered contiguously from `0` in the order received. Any `displayOrder` value supplied in the body is overwritten with the property's position in the `properties` array.

**Query parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `force` | `"true"` | conditional | Required to confirm a request that would delete one or more properties whose key still has non-null, non-empty data on at least one row. Without `?force=true`, such a request fails with `409`. |

**Behavior**

- Properties whose `id` matches an existing row are **updated** in place (all other writable fields applied, `propertyKey` left untouched). Row data for the key is preserved verbatim.
- Properties without an `id` (or with `id: null`) are **created**. Existing rows store no value for the new key until written.
- Properties present in the list's current schema but **absent** from the request are **deleted**. Their `propertyKey` is removed from every row's `rowData` JSON in the same transaction.
- All updates, creates, and deletes happen inside a single transaction.

**Response** `200 OK`

Returns the full set of properties as they exist after the transaction, ordered by `displayOrder` ascending.

```json
{
  "properties": [
    {
      "id": "prop_abc",
      "listId": "list_xyz",
      "propertyKey": "title",
      "propertyName": "Title",
      "propertyType": "text",
      "displayOrder": 0,
      "isVisible": true,
      "isRequired": false,
      "defaultValue": null,
      "helpText": null,
      "placeholder": null,
      "validationRules": null,
      "visibilityCondition": null,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

**Error responses**

- `400` — `properties` is not an array; any property is not an object; `propertyKey` or `propertyName` is the wrong type or outside its length bounds; duplicate `propertyKey` within the request; unknown `propertyType`; `id` references a property not on this list; attempt to change `propertyKey` for an existing `id`.
- `401` — not authenticated.
- `403` — list exists but belongs to another user (note: this branch returns **403**, distinct from the destructive DSL branch which returns **404** for the same condition).
- `404` — list does not exist or is soft-deleted.
- `409` — at least one property marked for deletion has non-null, non-empty data on at least one row, and `?force=true` was not supplied. Response body:

  ```json
  {
    "error": "Some properties marked for deletion contain row data. Re-submit with ?force=true to confirm.",
    "propertiesWithData": ["legacy_field", "another_key"]
  }
  ```

  Re-submit the same body with `?force=true` to proceed; deleted properties' values will be stripped from every row's `rowData`.

---

### GET /api/lists/:id/watchers

**Auth required:** yes (list owner only)  
**Description:** List all watchers for a list.

**Response** `200 OK`
```json
{
  "watchers": [
    { "id": "w1", "userId": "u2", "role": "watcher", "createdAt": "...", "user": { ... } }
  ]
}
```

---

### POST /api/lists/:id/watchers

**Auth required:** yes  
**Description:** Add a watcher to a public list. If the request body includes `userId`, the list owner can add another user with an optional `role` (`watcher`, `collaborator`, `manager`). Without `userId`, the authenticated user watches the list (cannot watch your own list).

**Request body**
```json
{ "userId": "u2", "role": "collaborator" }
```

**Response** `201 Created`
```json
{ "watching": true }
```

Returns `200` if the watcher relationship already exists.

---

### GET /api/lists/:id/watchers/me

**Auth required:** yes  
**Description:** Check whether the authenticated user is a watcher of the given list.

**Response** `200 OK`
```json
{ "watching": true }
```

---

### GET /api/lists/:id/watchers/users

**Auth required:** yes  
**Role required:** list owner  
**Description:** User-picker endpoint for adding watchers. Returns users **not** currently watching the list and not the list owner, paginated.

**Query parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | string | "" | Case-insensitive `contains` over `username`, `displayName`, and `email`. |
| `limit` | number | 50 | |
| `offset` | number | 0 | |
| `excludeWatchers` | string | — | Comma-separated user IDs to explicitly exclude. If omitted, current watchers are excluded automatically. |

**Response** `200 OK`
```json
{
  "users": [ { "id": "...", "username": "...", "displayName": "...", "email": "...", "avatar": "..." } ],
  "total": 124,
  "pagination": { "limit": 50, "offset": 0, "hasMore": true }
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |
| 404 | List not found or not owned by the caller |

---

### PUT /api/lists/:id/watchers/:userId

**Auth required:** yes  
**Role required:** list owner  
**Description:** Change a watcher's role on the list. Valid roles: `watcher`, `collaborator`, `manager`.

**Request body**
```json
{ "role": "collaborator" }
```

**Response** `200 OK`
```json
{ "role": "collaborator" }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Missing/invalid `role` |
| 401 | Not authenticated |
| 404 | List not owned by the caller, or `:userId` is not a watcher of this list |

---

### DELETE /api/lists/:id/watchers/:userId

**Auth required:** yes  
**Role required:** list owner  
**Description:** Remove a user from the list's watchers. Idempotent — non-existent rows return success.

**Response** `200 OK`
```json
{ "removed": true }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |
| 404 | List not owned by the caller |

---

### GET /api/lists/connections

**Auth required:** yes  
**Description:** Get all connections between the user's lists.

**Response** `200 OK`
```json
{ "connections": [ { "id": "c1", "fromListId": "list1", "toListId": "list2", "label": null } ] }
```

---

### POST /api/lists/connections

**Auth required:** yes  
**Description:** Create a directional connection between two lists the user owns.

**Request body**
```json
{ "fromListId": "list1", "toListId": "list2", "label": "depends on" }
```

**Response** `201 Created` — the raw connection object (not wrapped). Example:
```json
{ "id": "c1", "fromListId": "list1", "toListId": "list2", "label": "depends on", "createdAt": "..." }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Missing `fromListId` or `toListId`, or self-connection |
| 401 | Not authenticated |
| 403 | User does not own both lists |
| 409 | Connection already exists |

---

### DELETE /api/lists/connections/:id

**Auth required:** yes  
**Description:** Delete a list connection by id. The authenticated user must own both the `fromList` and the `toList` of the connection.

**Response** `200 OK`
```json
{ "success": true }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |
| 403 | Caller does not own both lists in the connection |
| 404 | Connection not found |

---

### GET /api/users/:username/lists

**Auth required:** no  
**Description:** Get the public lists belonging to a specific user by username.

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `username` | string | The user's username |

**Query parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `limit` | integer | no | Default 100 |
| `offset` | integer | no | Default 0 |
| `page` | integer | no | 1-based page number |

**Response** `200 OK` — same pagination envelope as `GET /api/lists`.

---

### GET /api/users/:username/lists/:id

**Auth required:** no  
**Description:** Get a single public list with its ancestor chain for breadcrumb rendering.

**Response** `200 OK`
```json
{
  "list": { "id": "list1", "title": "...", "parentId": null, "children": [] },
  "ancestors": []
}
```

---

### GET /api/users/:username/lists/:id/data

**Auth required:** no  
**Description:** Get data rows for a public list. Same query parameters as `GET /api/lists/:id/data`.

---

## List Folders

List folders organise a user's lists into a hierarchy. They use the `ListFolder` model and mirror the behavior of the `/api/documents/folders` endpoints but operate on lists rather than documents. Authentication uses `getCurrentUserOrSyncToken` (session cookie or `Authorization: Bearer <sync-token>`). A folder belonging to another user surfaces as `404`, never `403`.

### GET /api/folders

**Auth required:** yes  
**Description:** Return every non-deleted list folder owned by the authenticated user as a flat array. Each item has `id`, `name`, and `parentId`; clients reconstruct the hierarchy using `parentId`.

**Response** `200 OK`
```json
{
  "folders": [
    { "id": "f1", "name": "Work", "parentId": null },
    { "id": "f2", "name": "Projects", "parentId": "f1" }
  ]
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |

---

### POST /api/folders

**Auth required:** yes (subscribers only)  
**Description:** Create a new list folder. Requires an active subscription.

**Request body**
```json
{ "name": "My Folder", "parentId": null }
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | yes | 1–80 characters after trim |
| `parentId` | string \| null | no | ID of a folder owned by this user; omit or pass `null` for a root folder |

**Response** `201 Created`
```json
{
  "message": "Folder created successfully",
  "folder": { "id": "f1", "name": "My Folder", "parentId": null }
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Missing name, name exceeds 80 characters, or `parentId` is not a string |
| 401 | Not authenticated |
| 403 | User is not a subscriber |
| 404 | `parentId` folder not found or not owned by this user |
| 409 | A folder with that name already exists in the same parent (`{ "error": "A folder with that name already exists here" }`) |

---

### PUT /api/folders/:id

**Auth required:** yes  
**Description:** Rename and/or reparent a list folder. Both fields are optional — send only what you want to change. Reparenting under the folder itself or any of its descendants is rejected (cycle protection).

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Folder ID |

**Request body**
```json
{ "name": "New Name", "parentId": "f3" }
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | no | 1–80 characters after trim |
| `parentId` | string \| null | no | New parent folder ID, or `null` to move to root |

**Response** `200 OK`
```json
{
  "message": "Folder updated successfully",
  "folder": { "id": "f1", "name": "New Name", "parentId": "f3" }
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Name empty or exceeds 80 characters, `parentId` not a string, folder set as its own parent, or move would create a cycle |
| 401 | Not authenticated |
| 404 | Folder not found (including folders owned by another user), or proposed parent does not exist |
| 409 | A folder with that name already exists in the target parent (exact body: `{ "error": "A folder with that name already exists here" }`) |

---

### DELETE /api/folders/:id

**Auth required:** yes  
**Description:** Soft-delete a list folder. Any child folders are recursively soft-deleted, and every list inside this folder (or any descendant folder) is detached to root (`folderId` set to `null`). Lists themselves are never soft-deleted by this cascade.

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Folder ID |

**Response** `200 OK`
```json
{ "message": "Folder deleted successfully" }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |
| 404 | Folder not found (including folders owned by another user) |

---

## Documents

### GET /api/documents

**Auth required:** yes  
**Description:** Get root-level documents (not inside any folder) for the authenticated user.

**Response** `200 OK`
```json
{ "documents": [ { "id": "doc1", "title": "Notes", "folderId": null, ... } ] }
```

---

### POST /api/documents

**Auth required:** yes  
**Description:** Create a root-level document. Requires subscription.

**Request body**
```json
{
  "title": "My Notes",
  "content": "# Hello\n\nMarkdown content.",
  "relativePath": "my-notes.md",
  "isPublic": false
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string | no | Defaults to the path stem if omitted |
| `content` | string | no | Markdown content (defaults to empty) |
| `relativePath` | string | no | Defaults to a slug derived from `title`. Appended with `.md` if missing. |
| `isPublic` | boolean | no | Default false |

**Response** `201 Created`
```json
{ "message": "Document created successfully", "document": { "id": "doc1", ... } }
```

---

### GET /api/documents/:id

**Auth required:** no  
**Description:** Get a document by ID. Authenticated users can retrieve their own private documents; anyone can retrieve public documents.

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Document ID |

**Response** `200 OK`
```json
{ "document": { "id": "doc1", "title": "...", "content": "...", "isPublic": false, ... } }
```

---

### PUT /api/documents/:id
### PATCH /api/documents/:id

**Auth required:** yes  
**Description:** Update a document's title, content, visibility, or folder. `PATCH` is accepted as an equivalent alias for `PUT` (the iOS client uses `PATCH` for partial updates, including moving documents between folders via `folderId`).

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Document ID |

**Request body**
```json
{
  "title": "Updated Title",
  "content": "New markdown content",
  "isPublic": true,
  "folderId": "folder123"
}
```

All fields are optional. Setting `folderId` to `null` moves the document to the root level.

**Response** `200 OK`
```json
{ "message": "Document updated successfully", "document": { ... } }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 403 | `folderId` not found or not owned by this user |
| 404 | Document not found |

---

### DELETE /api/documents/:id

**Auth required:** yes  
**Description:** Soft-delete a document. Blob images embedded in the document's markdown are deleted from storage.

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Document ID |

**Response** `200 OK`
```json
{ "message": "Document deleted successfully" }
```

---

### POST /api/documents/:id/images/upload

**Auth required:** yes (email verified)  
**Description:** Upload an image to embed in a document. Accepts PNG, JPG, JPEG, GIF, WebP, and SVG. Non-SVG images are resized to at most 1200 px and 1.4 MB. SVGs are capped at 500 KB.

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Document ID |

**Request** `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `file` | File | Image file |

**Response** `200 OK`
```json
{ "url": "https://vercel-blob.com/documents/..." }
```

Embed the URL in the document's markdown: `![alt](url)`.

---

### GET /api/documents/search

**Auth required:** yes  
**Description:** Search the authenticated user's documents by title or content (case-insensitive). Results are ordered by `updatedAt` descending and scoped to the caller; soft-deleted documents are excluded.

**Query parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | yes | Search query, 1–200 characters |
| `limit` | integer | no | Default 20, max 100 |
| `offset` | integer | no | Default 0 |

**Response** `200 OK`
```json
{
  "documents": [
    {
      "id": "doc1",
      "title": "Meeting Notes",
      "content": "Full document body...",
      "folderId": "f1",
      "isPublic": false,
      "createdAt": "2026-06-21T12:00:00.000Z",
      "updatedAt": "2026-06-21T12:00:00.000Z"
    }
  ],
  "pagination": { "total": 3, "limit": 20, "offset": 0, "hasMore": false }
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | `q` missing, empty, or longer than 200 characters; `limit` greater than 100 |
| 401 | Not authenticated |

---

### GET /api/documents/templates

**Auth required:** yes  
**Description:** List documents inside the user's `_templates` folder. Creates the folder if it does not exist. Requires subscription.

**Response** `200 OK`
```json
{
  "folderCreated": false,
  "templatesFolderId": "f_templates",
  "templates": [ { "id": "doc_tmpl", "title": "Weekly Report", ... } ]
}
```

---

### POST /api/documents/templates/seed-defaults

**Auth required:** yes  
**Subscription required:** yes  
**Description:** Idempotently seed a set of default document templates (Recipe, Social Media Campaign, Post Series Plan, Thread Outline, Weekly Digest, Announcement, Release Notes, Meeting Notes, Project Brief, Personal Bio, Reading Notes, Interview Guide, Retrospective, Decision Record, Event Recap) into the user's `_templates` folder. Creates the templates folder if it does not exist. Skips templates that are already present.

**Response** `200 OK`
```json
{ "templatesFolderId": "f_templates", "templates": [ { "id": "...", "title": "Recipe" }, ... ] }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |
| 403 | No active subscription |

---

### POST /api/documents/from-template

**Auth required:** yes  
**Description:** Create a new document by copying a template. Requires subscription.

**Request body**
```json
{
  "templateDocumentId": "doc_tmpl",
  "targetFolderId": "folder123"
}
```

`targetFolderId` is optional; omit or pass `null` to create at root level.

**Response** `201 Created`
```json
{ "message": "Document created successfully", "document": { ... } }
```

---

### GET /api/documents/sync

**Auth required:** yes  
**Description:** Delta-sync endpoint for the CLI. Returns all non-deleted folders and documents changed since `lastSyncAt`. Omit the parameter for a full initial sync.

**Query parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `lastSyncAt` | ISO 8601 string | no | Only return items updated after this timestamp |

**Response** `200 OK`
```json
{
  "folders": [ { "id": "f1", "name": "Work", "parentId": null, ... } ],
  "documents": [ { "id": "doc1", "title": "...", "content": "...", ... } ],
  "lastSyncAt": "2026-06-04T12:00:00.000Z"
}
```

---

### POST /api/documents/sync

**Auth required:** yes  
**Description:** Apply a batch of create, update, and delete operations from the CLI.

**Request body**
```json
{
  "operations": [
    { "op": "create", "type": "folder", "path": "Work/Projects" },
    { "op": "create", "type": "document", "path": "Work/Projects/notes.md", "data": {
        "id": "doc_cli_1",
        "folderId": "f1",
        "title": "Notes",
        "content": "# Hello",
        "relativePath": "notes.md",
        "isPublic": false
      }
    },
    { "op": "delete", "type": "document", "path": "old.md", "data": { "id": "doc_old" } }
  ]
}
```

Each operation has `op` (`create`, `update`, or `delete`), `type` (`folder` or `document`), `path`, and `data`. Errors on individual operations are logged but do not abort the batch.

**Response** `200 OK`
```json
{ "lastSyncAt": "2026-06-04T12:05:00.000Z" }
```

---

### GET /api/users/:username/documents

**Auth required:** no  
**Description:** List the public documents belonging to a user, along with every folder referenced by those documents (folders are walked all the way to the root so the client can reconstruct breadcrumbs). Soft-deleted documents and folders are excluded.

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `username` | string | The user's username |

**Response** `200 OK`
```json
{
  "documents": [
    {
      "id": "doc1",
      "title": "Public Notes",
      "folderId": "f1",
      "relativePath": "public-notes.md",
      "createdAt": "2026-06-04T10:00:00.000Z",
      "updatedAt": "2026-06-04T10:00:00.000Z"
    }
  ],
  "folders": [
    { "id": "f1", "name": "Public", "parentId": null }
  ]
}
```

`content` is intentionally not returned by this listing endpoint — fetch the full document via `GET /api/documents/:id` when needed.

**Error responses**

| Status | Condition |
|--------|-----------|
| 404 | User not found |

---

## Document Folders

Document folders organise markdown documents. They support arbitrary nesting. The `GET /api/documents/folders` endpoint returns the full folder tree as a **flat array**; clients reconstruct the hierarchy using `parentId`.

### GET /api/documents/folders

**Auth required:** yes  
**Description:** Return all of the authenticated user's non-deleted document folders as a flat array. Each item includes its `parentId` so the client can build the tree to any depth.

**Response** `200 OK`
```json
{
  "folders": [
    {
      "id": "f1",
      "name": "Work",
      "parentId": null,
      "documents": [
        { "id": "doc1", "title": "Meeting Notes", "relativePath": "meeting-notes.md" }
      ]
    },
    {
      "id": "f2",
      "name": "Projects",
      "parentId": "f1",
      "documents": []
    },
    {
      "id": "f3",
      "name": "Archive",
      "parentId": "f1",
      "documents": [
        { "id": "doc2", "title": "Old Spec", "relativePath": "old-spec.md" }
      ]
    }
  ]
}
```

**Building the tree client-side:**  
Root folders have `parentId: null`. To build the hierarchy, index all folders by `id`, then for each folder with a non-null `parentId` attach it as a child of the folder with that `id`. There is no server-enforced depth limit.

**Note:** This replaced an earlier response shape that returned only root-level folders with one level of nested `children`. Clients that relied on the old shape must be updated to build the tree from `parentId` links.

---

### POST /api/documents/folders

**Auth required:** yes  
**Description:** Create a new document folder. Requires subscription. To create a subfolder, supply the parent's ID as `parentId`.

**Request body**
```json
{
  "name": "Projects",
  "parentId": "f1"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | yes | |
| `parentId` | string | no | ID of an existing folder owned by this user. Omit or pass `null` for a root folder. |

**Response** `201 Created`
```json
{
  "message": "Folder created successfully",
  "folder": { "id": "f2", "name": "Projects", "parentId": "f1", "userId": "u1", ... }
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Name missing or invalid `parentId` type |
| 401 | Not authenticated |
| 403 | No subscription |
| 404 | `parentId` folder not found or not owned by this user |

---

### GET /api/documents/folders/:id

**Auth required:** yes  
**Description:** Get a single document folder by ID including its immediate children and documents.

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Folder ID |

**Response** `200 OK`
```json
{
  "folder": {
    "id": "f1",
    "name": "Work",
    "parentId": null,
    "parent": null,
    "children": [ { "id": "f2", "name": "Projects", ... } ],
    "documents": [ { "id": "doc1", "title": "Notes", "relativePath": "notes.md", ... } ]
  }
}
```

---

### PUT /api/documents/folders/:id

**Auth required:** yes  
**Description:** Rename or move a document folder. Validates that the new `parentId` would not create a circular reference.

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Folder ID |

**Request body**
```json
{ "name": "Renamed Folder", "parentId": "f3" }
```

All fields are optional. Set `parentId` to `null` to move the folder to root.

**Response** `200 OK`
```json
{ "message": "Folder updated successfully", "folder": { ... } }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Circular reference detected |
| 404 | Folder not found |
| 409 | A folder with that name already exists here |

---

### DELETE /api/documents/folders/:id

**Auth required:** yes  
**Description:** Soft-delete a folder and recursively soft-delete all child folders and their documents.

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Folder ID |

**Response** `200 OK`
```json
{ "message": "Folder deleted successfully" }
```

---

### GET /api/documents/folders/:id/documents

**Auth required:** yes  
**Description:** List non-deleted documents directly inside a folder.

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Folder ID |

**Response** `200 OK`
```json
{ "documents": [ { "id": "doc1", "title": "Notes", "relativePath": "notes.md", ... } ] }
```

---

### POST /api/documents/folders/:id/documents

**Auth required:** yes  
**Description:** Create a new document inside a specific folder. Requires subscription.

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Folder ID |

**Request body**
```json
{
  "title": "Meeting Notes",
  "content": "# Agenda\n\n...",
  "relativePath": "meeting-notes.md",
  "isPublic": false
}
```

Same field rules as `POST /api/documents`.

**Response** `201 Created`
```json
{ "message": "Document created successfully", "document": { ... } }
```

---

## Users and Profile

### GET /api/user

**Auth required:** yes  
**Description:** Return the full profile of the currently authenticated user.

**Response** `200 OK`
```json
{
  "user": {
    "id": "u1",
    "email": "you@example.com",
    "username": "you",
    "displayName": "You",
    "avatar": null,
    "bio": null,
    "theme": null,
    "emailVerified": true,
    "pendingEmail": null,
    "maxMessageLength": 666,
    "defaultPubliclyVisible": false,
    "messagesPerPage": 20,
    "viewingPreference": "all_messages",
    "showPreviews": true,
    "showAdvancedPostSettings": false,
    "latitude": null,
    "longitude": null,
    "isPrivateAccount": false,
    "cleared": false,
    "githubDefaultRepo": null,
    "openaiApiKey": null,
    "anthropicApiKey": null,
    "customerStatus": "free",
    "stripeCustomerId": null,
    "notificationTrayLimit": 20,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "isAdministrator": false
  }
}
```

---

### PATCH /api/user/update

**Auth required:** yes  
**Description:** Update profile and preference settings for the authenticated user. All fields are optional; only supplied fields are changed. `customerStatus` and `stripeCustomerId` are managed by webhooks and cannot be set here.

**Request body**
```json
{
  "displayName": "New Name",
  "bio": "About me",
  "avatar": "https://...",
  "theme": "dark",
  "maxMessageLength": 500,
  "defaultPubliclyVisible": true,
  "messagesPerPage": 25,
  "viewingPreference": "following_only",
  "showPreviews": true,
  "showAdvancedPostSettings": false,
  "latitude": 47.6,
  "longitude": -122.3,
  "isPrivateAccount": false,
  "githubDefaultRepo": "owner/repo",
  "notificationTrayLimit": 20,
  "openaiApiKey": null,
  "anthropicApiKey": null
}
```

| Field | Validation |
|-------|-----------|
| `maxMessageLength` | integer 1–10000 |
| `messagesPerPage` | integer 10–30 |
| `notificationTrayLimit` | integer 10–40 |
| `viewingPreference` | `my_messages`, `all_messages`, `followers_only`, or `following_only` |
| `githubDefaultRepo` | `owner/repo` format or null |
| `latitude` | -90 to 90 |
| `longitude` | -180 to 180 |

**Response** `200 OK`
```json
{ "message": "User updated successfully", "user": { ... } }
```

---

### GET /api/user/:username/messages

**Auth required:** no  
**Description:** Get the public message wall for a user. Authenticated viewers can also see their own private messages if visiting their own profile.

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `username` | string | Username |

**Query parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `limit` | integer | no | Max 100, default 50 |
| `offset` | integer | no | Default 0 |

**Response** `200 OK` — same envelope as `GET /api/messages`.

---

### POST /api/user/avatar/upload

**Auth required:** yes  
**Description:** Upload a new profile avatar. Accepts any image; resizes to fit 1200 px and 1.4 MB, saves as JPEG.

**Request** `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `file` | File | Image file (max 1.4 MB upload) |

**Response** `200 OK`
```json
{ "url": "https://vercel-blob.com/avatars/..." }
```

Use the returned URL as the `avatar` field in `PATCH /api/user/update`.

---

### POST /api/user/avatar/from-url

**Auth required:** yes  
**Description:** Fetch an image from a URL and store it as the user's avatar blob.

**Request body**
```json
{ "url": "https://example.com/photo.jpg" }
```

**Response** `200 OK`
```json
{ "url": "https://vercel-blob.com/avatars/..." }
```

---

### POST /api/user/change-email/request

**Auth required:** yes  
**Description:** Request an email address change. Sends a verification email to the new address. Rate-limited to once per 10 minutes.

**Request body**
```json
{ "newEmail": "new@example.com" }
```

**Response** `200 OK`
```json
{ "message": "Verification email sent successfully. Check your inbox." }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Missing, invalid, or unchanged email |
| 409 | Email already in use |
| 429 | Rate limited |

---

### POST /api/user/delete

**Auth required:** yes  
**Description:** Permanently delete the authenticated user's account. Requires supplying the account's `username` and `email` for confirmation. Cascades to all messages, lists, follows, and linked identities. Cannot be used if the user is the sole administrator.

**Request body**
```json
{ "username": "yourhandle", "email": "you@example.com" }
```

**Response** `200 OK`
```json
{ "message": "Account deleted successfully" }
```

---

### GET /api/user/identities

**Auth required:** yes (session cookie only)  
**Description:** List all linked OAuth identities for the authenticated user.

**Response** `200 OK`
```json
{
  "identities": [
    {
      "id": "li1",
      "provider": "mastodon:mastodon.social",
      "providerUsername": "you@mastodon.social",
      "profileUrl": "https://mastodon.social/@you",
      "avatarUrl": null,
      "connectedAt": "2026-01-01T00:00:00.000Z",
      "lastVerifiedAt": null
    }
  ]
}
```

---

### DELETE /api/user/identities

**Auth required:** yes (session cookie only)  
**Description:** Disconnect a linked OAuth identity.

**Query parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `provider` | string | yes | Provider key, e.g. `mastodon:mastodon.social`, `bluesky`, `linkedin`, `twitter`, `github` |

**Response** `200 OK`
```json
{ "success": true }
```

---

### POST /api/user/identities/verify

**Auth required:** yes (session cookie only)  
**Description:** Verify that the stored access token for a linked identity is still valid. Updates `lastVerifiedAt` on success.

**Request body**
```json
{ "provider": "github" }
```

**Response** `200 OK`
```json
{ "success": true }
```

---

### GET /api/user/organizations

**Auth required:** yes (session cookie only)  
**Description:** List all organizations the authenticated user belongs to.

**Query parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `role` | string | no | Filter by `owner`, `admin`, or `member` |

**Response** `200 OK`
```json
{ "organizations": [ { "id": "org1", "name": "Acme", "role": "admin", ... } ] }
```

---

### POST /api/user/organizations

**Auth required:** yes (session cookie only)  
**Description:** Join a public organization.

**Request body**
```json
{ "organizationId": "org1" }
```

**Response** `201 Created`
```json
{ "message": "Joined organization successfully", "membership": { ... } }
```

---

## Following

### POST /api/follow/:userId

**Auth required:** yes  
**Description:** Follow a user. For private accounts this creates a pending follow request.

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `userId` | string | ID of the user to follow |

**Response** `201 Created`
```json
{
  "follow": {
    "id": "fol1",
    "followerId": "u1",
    "followingId": "u2",
    "status": "approved",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Missing `userId`, or attempting to follow yourself |
| 401 | Not authenticated |
| 404 | Target user not found |

---

### DELETE /api/follow/:userId

**Auth required:** yes  
**Description:** Unfollow a user.

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `userId` | string | ID of the user to unfollow |

**Response** `200 OK`
```json
{ "message": "Unfollowed successfully" }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 404 | Follow relationship not found |

---

### GET /api/follow/:userId/status

**Auth required:** yes  
**Description:** Get the current follow relationship status between the authenticated user and a target user.

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `userId` | string | Target user ID |

**Response** `200 OK`
```json
{ "status": "approved", "isFollowing": true, "isPending": false }
```

`status` is `null` if no relationship exists. Values: `approved`, `pending`.

---

### GET /api/follow/requests

**Auth required:** yes  
**Description:** Get pending follow requests directed at the authenticated user. Each entry is the public follower-user record plus the `Follow` row's `id` (as `followId`) and timestamp.

**Response** `200 OK`
```json
{
  "requests": [
    {
      "id": "u3",
      "username": "bob",
      "displayName": "Bob",
      "avatar": null,
      "followId": "fol2",
      "createdAt": "2026-06-04T10:00:00.000Z"
    }
  ]
}
```

Use the entry's `id` (the follower's user id) when calling `POST /api/follow/:userId/approve` or `POST /api/follow/:userId/reject`.

---

### POST /api/follow/:userId/approve

**Auth required:** yes  
**Description:** Approve a pending follow request from `:userId` (the follower). Only the user being followed can approve. Status transitions `pending → approved`.

**Response** `200 OK`
```json
{ "follow": { "id": "...", "followerId": "u3", "followingId": "u1", "status": "approved", "createdAt": "...", "updatedAt": "..." } }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Missing `userId`, or the follow request is not in `pending` state |
| 401 | Not authenticated |
| 404 | Follow request not found |

---

### POST /api/follow/:userId/reject

**Auth required:** yes  
**Description:** Reject a pending follow request. Deletes the row.

**Response** `200 OK`
```json
{ "message": "Follow request rejected" }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |
| 404 | Follow request not found |

---

### DELETE /api/follow/:userId/remove

**Auth required:** yes  
**Description:** Remove a follower (the user being followed forcibly drops the follower). Only callable by the user being followed.

**Response** `200 OK`
```json
{ "message": "Follower removed successfully" }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |
| 404 | Follower relationship not found |

---

### GET /api/follow/:userId/counts

**Auth required:** yes  
**Description:** Return follower/following counts for `:userId`.

**Response** `200 OK`
```json
{ "followers": 42, "following": 17 }
```

---

### GET /api/follow/:userId/followers

**Auth required:** yes  
**Description:** Paginated list of users following `:userId`.

**Query parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | 50 | 1–100 |
| `offset` | number | 0 | ≥ 0 |
| `status` | string | — | Optional filter: `pending` or `approved` |

**Response** `200 OK`
```json
{
  "followers": [
    {
      "id": "u2",
      "username": "alice",
      "displayName": "Alice",
      "avatar": null,
      "followId": "fol_123",
      "status": "approved",
      "createdAt": "2026-06-04T10:00:00.000Z"
    }
  ],
  "pagination": { "total": 42, "limit": 50, "offset": 0, "hasMore": false }
}
```

The shape is produced by `getFollowers`. Each item is the public follower user (`id`, `username`, `displayName`, `avatar`) augmented with `followId`, `status`, and `createdAt` from the underlying `Follow` row.

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | `limit` out of `1..100`, negative `offset`, or invalid `status` |
| 401 | Not authenticated |

---

### GET /api/follow/:userId/following

**Auth required:** yes  
**Description:** Paginated list of users `:userId` is following. Same query parameters as `/api/follow/:userId/followers`. The response uses the same envelope but the top-level array key is `following` instead of `followers`.

---

### GET /api/follow/:userId/mutual

**Auth required:** yes  
**Description:** Mutual connection counts between the authenticated user and `:userId`.

**Response** `200 OK`
```json
{ "mutualFollowers": 4, "mutualFollowing": 6 }
```

If the underlying follow tables are missing (fresh dev DB), the endpoint returns zeroes with `200 OK` rather than 500.

---

## Organizations

### GET /api/organizations

**Auth required:** no (some modes require auth)  
**Description:** List organizations. Behaviour varies by query parameter.

**Query parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `public` | boolean | no | Return only public organizations (no auth required) |
| `userId` | string | no | Return organizations for a specific user (requires auth; only self or admin) |
| `limit` | integer | no | Default 20 |
| `offset` | integer | no | Default 0 |

**Response** `200 OK`
```json
{
  "organizations": [ { "id": "org1", "name": "Acme", "isPublic": true, ... } ],
  "pagination": { "total": 5, "limit": 20, "offset": 0, "hasMore": false }
}
```

---

### POST /api/organizations

**Auth required:** yes  
**Description:** Create a new organization. Requires subscription.

**Request body**
```json
{ "name": "Acme Corp", "description": "Our org", "avatar": null, "isPublic": true }
```

**Response** `201 Created`
```json
{ "message": "Organization created successfully", "organization": { ... } }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Missing name |
| 403 | No subscription |
| 409 | Name already taken |

---

### GET /api/organizations/:id

**Auth required:** no (private orgs require auth and membership)  
**Description:** Get an organization by ID or slug. Returns `memberCount` and the authenticated user's `userRole` (null if not a member).

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Organization ID or slug |

**Response** `200 OK`
```json
{
  "organization": {
    "id": "org1",
    "name": "Acme",
    "isPublic": true,
    "memberCount": 12,
    "userRole": "member"
  }
}
```

---

### PUT /api/organizations/:id

**Auth required:** yes  
**Description:** Update organization details. Requires `admin` or `owner` role in the organization.

**Request body**
```json
{ "name": "New Name", "description": "Updated", "avatar": null, "isPublic": true, "settings": {} }
```

**Response** `200 OK`
```json
{ "message": "Organization updated successfully", "organization": { ... } }
```

---

### DELETE /api/organizations/:id

**Auth required:** yes  
**Description:** Delete an organization. Requires `owner` role. System organizations cannot be deleted.

**Response** `200 OK`
```json
{ "message": "Organization deleted successfully", "organization": { ... } }
```

---

### GET /api/organizations/:id/members

**Auth required:** yes (must be a member)  
**Description:** List members of an organization.

**Query parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `limit` | integer | no | Default 50 |
| `offset` | integer | no | Default 0 |
| `role` | string | no | Filter by `owner`, `admin`, or `member` |

**Response** `200 OK`
```json
{
  "members": [
    {
      "id": "u1",
      "username": "alice",
      "displayName": "Alice",
      "avatar": null,
      "emailVerified": true,
      "role": "owner",
      "active": true,
      "joinedAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "pagination": { "total": 12, "limit": 50, "offset": 0, "hasMore": false }
}
```

---

### POST /api/organizations/:id/members

**Auth required:** yes  
**Description:** Add a user to an organization. Requires `admin` or `owner` role.

**Request body**
```json
{ "userId": "u2", "role": "member" }
```

`role` must be `owner`, `admin`, or `member`.

**Response** `201 Created`
```json
{ "message": "User added to organization successfully", "membership": { ... } }
```

---

### PUT /api/organizations/:id/members/:userId

**Auth required:** yes  
**Description:** Update a member's role (and optionally their `active` flag). Permission is enforced by `updateUserRole`: an admin can manage members; demoting/removing the last owner is rejected.

**Request body**
```json
{ "role": "admin", "active": true }
```

`role` is required and must be `owner`, `admin`, or `member`. `active` is optional.

**Response** `200 OK`
```json
{ "message": "Member role updated successfully", "membership": { "id": "...", "role": "admin", "active": true, ... } }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Missing/invalid `role`, or attempting to demote the last owner |
| 401 | Not authenticated |
| 403 | Caller lacks permission, or member cannot be removed (e.g. last owner) |
| 404 | Target user is not a member of this organization |

---

### DELETE /api/organizations/:id/members/:userId

**Auth required:** yes  
**Description:** Remove a member from the organization. Permission and last-owner protection enforced by `removeUserFromOrganization`.

**Response** `200 OK`
```json
{ "message": "Member removed from organization successfully", "membership": { ... } }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Cannot remove the last owner |
| 401 | Not authenticated |
| 403 | Caller lacks permission, or target cannot be removed |
| 404 | Target user is not a member of this organization |

---

### GET /api/organizations/:id/users

**Auth required:** yes  
**Role required:** owner  
**Description:** Search users **not** already members of the organization. Used by the "Add Member" picker. Returns paginated user records.

**Query parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | string | "" | Case-insensitive `contains` over `username`, `displayName`, and `email`. |
| `limit` | number | 1000 | |
| `offset` | number | 0 | |
| `excludeMembers` | string | — | Comma-separated user IDs to exclude. If omitted, all current org members are excluded automatically. |

**Response** `200 OK`
```json
{
  "users": [ { "id": "...", "username": "...", "displayName": "...", "email": "...", "avatar": "...", "createdAt": "..." } ],
  "total": 1024,
  "pagination": { "limit": 1000, "offset": 0, "hasMore": false }
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |
| 403 | Caller is not the organization owner |

---

## Notifications

### GET /api/notifications

**Auth required:** yes  
**Description:** Get unread notification tray items and the total unread count. The tray limit is controlled by the user's `notificationTrayLimit` setting (10–40, default 20).

**Query parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `scope` | string | yes | Must be `tray` |

**Response** `200 OK`
```json
{
  "unreadCount": 3,
  "items": [
    {
      "id": "n1",
      "title": "Alice liked your message",
      "body": "...",
      "actionUrl": "/messages/msg123",
      "type": "like",
      "metadata": {},
      "createdAt": "2026-06-04T10:00:00.000Z",
      "readAt": null
    }
  ]
}
```

---

### PATCH /api/notifications/:id/read

**Auth required:** yes  
**Description:** Mark a single notification as read (idempotent).

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Notification ID |

**Response** `200 OK`
```json
{ "ok": true }
```

---

### POST /api/notifications/mark-all-read

**Auth required:** yes  
**Description:** Mark all unread notifications as read for the authenticated user.

**Response** `200 OK`
```json
{ "ok": true, "updated": 5 }
```

---

### DELETE /api/notifications/:id

**Auth required:** yes  
**Description:** Delete a notification owned by the authenticated user. Returns `204 No Content` on success.

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Missing `id` |
| 401 | Not authenticated |
| 404 | Notification not found or not owned by the caller |

---

## Push Notifications

### POST /api/push/register

**Auth required:** yes  
**Description:** Register a device token for APNS (iOS) or FCM (Android) push notifications. Upserts the token if it already exists.

**Request body**
```json
{ "token": "<device-token>", "platform": "ios" }
```

`platform` must be `ios` or `android`.

**Response** `200 OK`
```json
{ "ok": true }
```

---

### DELETE /api/push/unregister

**Auth required:** yes  
**Description:** Remove a device token on logout.

**Request body**
```json
{ "token": "<device-token>" }
```

**Response** `200 OK`
```json
{ "ok": true }
```

---

## Exports

All export endpoints return a downloadable CSV file. They use the session cookie only (no Bearer token support).

### GET /api/exports/messages

**Auth required:** yes  
**Description:** Export all of the authenticated user's messages as CSV.

**Response** `200 OK` — `text/csv` with columns: ID, Content, Publicly Visible, Created At, Updated At.

---

### GET /api/exports/lists

**Auth required:** yes  
**Description:** Export all non-deleted lists as CSV.

**Response** `200 OK` — `text/csv` with columns: ID, Title, Description, Is Public, Created At, Updated At.

---

### GET /api/exports/list-data-rows

**Auth required:** yes  
**Description:** Export all non-deleted list data rows as CSV.

**Response** `200 OK` — `text/csv` with columns: ID, List ID, List Title, Row Data (JSON), Row Number, Created At, Updated At.

---

### GET /api/exports/follows

**Auth required:** yes  
**Description:** Export all follow relationships (as follower and as followed) as CSV.

**Response** `200 OK` — `text/csv` with columns: ID, Relationship Type, Follower Username, Follower Display Name, Follower Email, Following Username, Following Display Name, Following Email, Status, Created At, Updated At.

---

## Stripe / Subscriptions

### POST /api/stripe/create-checkout-session

**Auth required:** yes (session cookie)  
**Description:** Create a Stripe Checkout session to start or change a subscription. Creates a Stripe customer record for the user if one does not already exist.

**Request body**
```json
{ "priceId": "price_..." }
```

`priceId` must match `STRIPE_PRICE_MONTHLY` or `STRIPE_PRICE_ANNUAL` from the server environment.

**Response** `200 OK`
```json
{ "url": "https://checkout.stripe.com/..." }
```

Redirect the browser to `url` to complete payment.

---

### POST /api/stripe/create-portal-session

**Auth required:** yes (session cookie)  
**Description:** Create a Stripe Customer Portal session so the user can manage their subscription. Pass `{ "flow": "cancel" }` to open directly on the cancellation flow.

**Request body**
```json
{ "flow": "cancel" }
```

**Response** `200 OK`
```json
{ "url": "https://billing.stripe.com/..." }
```

---

## GitHub Integration

These endpoints proxy GitHub API requests using the user's linked GitHub identity. Auth is provided by the linked identity, not by separate credentials.

### GET /api/github/issues

**Auth required:** yes (linked GitHub identity required)  
**Description:** List issues from a repository.

**Query parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `repo` | string | yes | `owner/repo` |
| `state` | string | no | `open` (default), `closed`, or `all` |

**Response** `200 OK` — array of GitHub issue objects as returned by the GitHub API.

---

### POST /api/github/issues

**Auth required:** yes (linked GitHub identity required)  
**Description:** Create a GitHub issue.

**Request body**
```json
{ "repo": "owner/repo", "title": "Bug report", "body": "Details...", "labels": [], "assignees": [] }
```

**Response** — GitHub issue object.

---

### GET /api/github/repos

**Auth required:** yes (linked GitHub identity required)  
**Description:** List accessible repositories for the linked GitHub account.

---

### PATCH /api/github/issues/:owner/:repo/:number

**Auth required:** yes (linked GitHub identity required for the issue's `:owner/:repo` context)  
**Description:** Update an existing GitHub issue's labels and/or assignees via the GitHub API.

**Request body**
```json
{ "labels": ["bug", "p1"], "assignees": ["octocat"] }
```

At least one of `labels` or `assignees` is required. Non-string entries in either array are silently filtered out.

**Response** — the upstream GitHub issue object on success. On error, the GitHub-reported status and message are forwarded.

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Neither `labels` nor `assignees` provided |
| Other | Forwarded from the GitHub API (`message` from GitHub becomes `error`) |

---

### POST /api/github/issues/:owner/:repo/:number/comments

**Auth required:** yes  
**Description:** Add a comment to an existing GitHub issue.

**Request body**
```json
{ "body": "Comment text" }
```

`body` is required and must be a non-empty trimmed string.

**Response** — the upstream GitHub comment object.

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Missing or empty `body` |
| Other | Forwarded from the GitHub API |

---

### GET /api/github/repos/:owner/:repo/assignees

**Auth required:** yes  
**Description:** List candidate assignees for `:owner/:repo` via the GitHub API. Returns the GitHub `assignees` array.

---

### GET /api/github/repos/:owner/:repo/labels

**Auth required:** yes  
**Description:** List defined labels for `:owner/:repo` via the GitHub API.

---

### GET /api/github/repos/:owner/:repo/next-issue-number

**Auth required:** yes  
**Description:** Compute the next issue number for `:owner/:repo` (`max(existing issue number) + 1`, or `1` if no issues). Pull requests are filtered out before computing the max.

**Response** `200 OK`
```json
{ "nextNumber": 124 }
```

---

## LinkedIn Integration

Endpoints for discovering and configuring the LinkedIn destinations a user can cross-post to. A **target** is the user's personal LinkedIn account (linked via OAuth), an organization page the user has been assigned to with an active organization-level connection, or a **personal company page** — a LinkedIn company page the user administers, discovered through their own LinkedIn connection when it was linked with the `rw_organization_admin` scope.

Target objects come in three shapes:

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

`pageId` is the InterlinedList `OrgLinkedInPage` record ID and `personalPageId` is the InterlinedList `LinkedInPersonalPage` record ID (use these in `linkedInTargets` when posting); `linkedInPageId` is LinkedIn's own page identifier. `avatarUrl` / `logoUrl` may be `null`. When the same LinkedIn page is reachable both as an org page and as a personal page, only the `orgPage` target is returned.

### GET /api/linkedin/targets

**Auth required:** yes  
**Description:** List every LinkedIn destination the user can post to right now — the personal account (when linked with an active access token), assigned org pages with an active, non-expired organization connection, and the user's synced personal company pages (when the personal connection is active).

**Response** `200 OK`
```json
{
  "targets": [
    { "kind": "personal", "label": "Alice Example", "avatarUrl": null },
    { "kind": "orgPage", "pageId": "...", "linkedInPageId": "12345678", "label": "Acme Corp", "logoUrl": null },
    { "kind": "personalPage", "personalPageId": "...", "linkedInPageId": "87654321", "label": "Alice's Studio", "logoUrl": null }
  ]
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |

---

### GET /api/linkedin/posting-targets

**Auth required:** yes  
**Description:** List the user's available LinkedIn targets together with their saved posting preference. Each target carries an `enabled` flag. If the user has never saved preferences, every available target is returned with `enabled: true`.

Preferences are a client-side default for the composer's target selection only — they are **not** enforced when posting. Server-side authorization for `POST /api/messages` is always based on the user's actual org-page assignments.

**Response** `200 OK`
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

`orgScopeMissing` is `true` when the caller has a personal LinkedIn connection but the stored `providerData.scope` does not include `rw_organization_admin`. This typically indicates a legacy connection made before personal-account company pages were supported — the user should reconnect LinkedIn to enable that feature. `false` when there is no personal LinkedIn connection at all, or when the scope is granted.

**Error responses**

| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |

---

### PUT /api/linkedin/posting-targets

**Auth required:** yes  
**Description:** Replace the user's LinkedIn posting-target preferences atomically. Targets listed in the body become enabled; all others become disabled. An empty array disables every target. Duplicates are removed.

**Request body**
```json
{
  "targets": [
    { "kind": "personal" },
    { "kind": "orgPage", "pageId": "<OrgLinkedInPage uuid>" },
    { "kind": "personalPage", "personalPageId": "<LinkedInPersonalPage uuid>" }
  ]
}
```

Every requested target is validated against what the caller can actually post to: `personal` requires a linked LinkedIn account, each `pageId` must be an org page assigned to the caller with an active connection, and each `personalPageId` must be a synced company page available through the caller's own LinkedIn connection.

**Response** `200 OK` — the updated preference state, same shape as `GET /api/linkedin/posting-targets`:
```json
{
  "targets": [
    { "kind": "personal", "label": "Alice Example", "avatarUrl": null, "enabled": true },
    { "kind": "orgPage", "pageId": "...", "linkedInPageId": "12345678", "label": "Acme Corp", "logoUrl": null, "enabled": true },
    { "kind": "personalPage", "personalPageId": "...", "linkedInPageId": "87654321", "label": "Alice's Studio", "logoUrl": null, "enabled": true }
  ]
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Invalid JSON body, `targets` is not an array, a target has an invalid shape (`Invalid targets`), personal account not linked, a page is not assigned to you (`One or more LinkedIn pages are not assigned to you`), or a personal company page is not available to you (`One or more LinkedIn company pages are not available to you`) |
| 401 | Not authenticated |

---

### POST /api/linkedin/sync-pages

**Auth required:** yes  
**Description:** Re-discover the LinkedIn company pages the user administers via their personal LinkedIn connection and sync them as `LinkedInPersonalPage` records. Pages no longer administered are removed; new and existing pages are upserted. Pages are also synced automatically by the OAuth callback when the account is linked with the org scope, so this endpoint is for refreshing the list afterwards. No request body.

**Response** `200 OK`
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

`id` is the value to use as `personalPageId` in `linkedInTargets`. `pageLogoUrl` may be `null`.

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | LinkedIn account not linked (`{ "code": "not_linked" }`), or the connection lacks an active token with the `rw_organization_admin` scope (`{ "code": "org_scope_missing" }`) — prompt the user to reconnect via `GET /api/auth/linkedin/authorize?link=true` |
| 401 | Not authenticated |
| 502 | LinkedIn API failure while discovering pages (`Failed to sync LinkedIn company pages`) |

---

## LinkedIn Organization Integration

These endpoints manage a **shared** LinkedIn credential bound to an `Organization`. Owners/admins connect a LinkedIn account that controls one or more LinkedIn Company Pages; pages are then **assigned** to organization members. When a member with an active assignment cross-posts with `crossPostToLinkedIn: true` (and no explicit `linkedInTargets`), the post is published as `urn:li:organization:<linkedInPageId>` using the org credential — overriding the member's personal `LinkedIdentity`. Without an assignment (or after disconnect) cross-posts fall back to the member's personal LinkedIn. Resolution lives in `lib/linkedin/resolve-linkedin-target.ts`.

### GET /api/auth/linkedin/org-authorize

**Auth required:** yes (browser flow)  
**Description:** Start the LinkedIn OAuth flow that connects a shared organization LinkedIn credential. Owner or admin role on the target organization is required. Redirects the browser to LinkedIn with scopes `openid profile email w_member_social rw_organization_admin`.

**Query parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `organizationId` | string | yes | Organization to connect LinkedIn for. |

**Errors are surfaced via redirect** (e.g. `/organizations?error=...`):
- Not signed in → redirect to `/login`
- Missing `organizationId` → redirect to `/organizations?error=organizationId required`
- Caller is not owner/admin → redirect to `/organizations?error=You must be an owner or admin to connect LinkedIn`

### GET /api/auth/linkedin/org-callback

**Auth required:** yes (browser flow)  
**Description:** LinkedIn redirect target for the org flow. Exchanges the code, upserts the `OrgLinkedInCredential` (clearing any prior `disconnectedAt`), then discovers LinkedIn Company Pages the credential admins and upserts them as `OrgLinkedInPage` rows (removing pages that no longer appear). Discovery failure is logged but does not abort the connection. Redirects to `/organizations/<slug>/linkedin` on success or with `?error=<message>` on failure. Not intended for direct API consumption.

### GET /api/organizations/:id/linkedin/status

**Auth required:** yes  
**Description:** Return the organization's LinkedIn credential (if any), its pages, and each page's member assignments. Any organization member may call this.

**Response** `200 OK`
```json
{
  "credential": {
    "id": "...",
    "organizationId": "...",
    "connectedByUserId": "...",
    "providerUserId": "...",
    "providerUsername": "...",
    "expiresAt": "2026-12-01T00:00:00.000Z",
    "scopesGranted": "openid profile email w_member_social rw_organization_admin",
    "disconnectedAt": null,
    "lastVerifiedAt": "2026-06-01T00:00:00.000Z",
    "pages": [
      {
        "id": "<OrgLinkedInPage uuid>",
        "linkedInPageId": "12345678",
        "pageName": "Acme Corp",
        "pageLogoUrl": "https://...",
        "lastSyncedAt": "2026-06-01T00:00:00.000Z",
        "assignments": [
          { "user": { "id": "...", "username": "alice", "displayName": "Alice", "avatar": "..." } }
        ]
      }
    ]
  },
  "role": "owner"
}
```

`credential` is `null` when LinkedIn has never been connected for this org. `role` is the caller's role (`owner`, `admin`, or `member`).

**Error responses**

| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |
| 403 | Caller is not a member of this organization |

### PUT /api/organizations/:id/linkedin/assignments

**Auth required:** yes  
**Role required:** owner or admin  
**Description:** Assign or unassign an organization member to one of the org's LinkedIn Company Pages. A user may have at most one assignment per organization at a time; setting a new `pageId` replaces any prior assignment.

**Request body**
```json
{ "userId": "<member user id>", "pageId": "<OrgLinkedInPage uuid> | null" }
```

A `null`, `undefined`, or empty-string `pageId` removes the user's assignment for this organization.

**Response** `200 OK`
```json
{ "assignment": { "id": "...", "pageId": "...", "userId": "...", "assignedByUserId": "..." } }
```
or, when unassigning:
```json
{ "assigned": false }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Missing `userId`, or the target user is not a member of this organization |
| 401 | Not authenticated |
| 403 | Caller is not owner/admin |
| 404 | `pageId` does not belong to this organization's LinkedIn credential |

### DELETE /api/organizations/:id/linkedin/credential

**Auth required:** yes  
**Role required:** owner (admin is **not** sufficient)  
**Description:** Disconnect the organization's LinkedIn credential. Sets `disconnectedAt` rather than deleting the record, so prior assignments are preserved if the org reconnects. Members with prior assignments fall back to their personal LinkedIn for cross-posts.

**Response** `200 OK`
```json
{ "disconnected": true }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |
| 403 | Caller is not owner |
| 404 | No LinkedIn credential exists for this organization |

### POST /api/organizations/:id/linkedin/sync-pages

**Auth required:** yes  
**Role required:** owner or admin  
**Description:** Re-discover LinkedIn Company Pages the org's stored credential admins. Upserts each returned page and deletes pages no longer in the response. Use this after a page is added/removed in LinkedIn without reconnecting.

**Response** `200 OK`
```json
{ "pages": [ { "id": "...", "linkedInPageId": "...", "pageName": "...", "pageLogoUrl": "...", "lastSyncedAt": "..." } ] }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |
| 403 | Caller is not owner/admin |
| 404 | No active LinkedIn credential for this organization (never connected or `disconnectedAt` set) |

---

## Utility Endpoints

### GET /api/location

**Auth required:** no  
**Description:** Resolve latitude/longitude to a city, state, and timezone via the NOAA API. US coordinates only.

**Query parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `latitude` | number | yes | |
| `longitude` | number | yes | |

**Response** `200 OK`
```json
{
  "city": "Seattle",
  "state": "WA",
  "country": "United States",
  "coordinates": { "latitude": 47.6, "longitude": -122.3 },
  "timezone": "America/Los_Angeles"
}
```

---

### GET /api/weather

**Auth required:** no  
**Description:** US weather data from NOAA's `api.weather.gov` for a given lat/lon. The handler first hits `/points/<lat>,<lon>` to derive the gridpoint, then fetches the forecast. With `extended=true` it also fetches the hourly forecast and includes a `weekly` series; extended responses are LRU-cached server-side for 30 minutes per gridpoint (override with `refresh=true`).

**Query parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `latitude` | number | yes | |
| `longitude` | number | yes | |
| `extended` | boolean | no | `true` to include `hourly` and `weekly` series. |
| `refresh` | boolean | no | `true` bypasses the server-side cache. |

**Response** `200 OK` — `ExtendedWeatherData`:
```json
{
  "location": "Seattle",
  "temperature": 62,
  "condition": "Partly Sunny",
  "conditionIcon": "bx-cloud",
  "high": 68, "low": 54,
  "humidity": 71,
  "windSpeed": 5,
  "timeZone": "America/Los_Angeles",
  "hourly": [ { "startTime": "...", "temperature": 62, "probabilityOfPrecipitation": 0, "shortForecast": "Partly Sunny" } ],
  "weekly": [ { "name": "Tonight", "startTime": "...", "isDaytime": false, "temperature": 54, "probabilityOfPrecipitation": 0, "shortForecast": "Mostly Cloudy", "icon": "..." } ]
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Missing or non-numeric `latitude`/`longitude` |
| 404 | NOAA returned 404 for the point, or no forecast endpoint for the location |
| 500 | Other upstream NOAA failures |

---

### GET /api/images/proxy

**Auth required:** no  
**Description:** Server-side image proxy for Instagram CDN images (to bypass CORS in the browser). Fetches the image with an Instagram-aware `Referer`, caches it for 1 hour (LRU, 50 entries), and streams the bytes back. **On any failure** (timeout, non-image content type, oversized response, network error) the endpoint responds with a placeholder SVG and the header `X-Image-Status: placeholder` — it does not return 4xx/5xx for image failures.

**Query parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | yes | Full image URL. Hostname must be `instagram.com`, `cdninstagram.com`, `fbcdn.net`, or a subdomain of one of those. |

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Missing or malformed `url`, or non-http(s) protocol |
| 403 | URL is not an allowed Instagram domain |

---

### POST /api/analytics/ingest

**Auth required:** no  
**Description:** First-party analytics beacon. Records a page view or a named action. The handler always responds `204 No Content` — invalid bodies are silently dropped to avoid breaking page navigations. If the caller does not have an analytics session cookie, the response sets `interlinedlist_analytics_session` (configurable lifetime; 1 year by default).

**Request body**
```json
{
  "type": "page_view",
  "path": "/dashboard",
  "referrer": "https://google.com"
}
```

For `type: "action"`:
```json
{
  "type": "action",
  "name": "post_created",
  "properties": { "channel": "web" }
}
```

Unknown `type` values are ignored. The current user, if any, is automatically attached server-side via the session cookie.

---

### GET /api/oauth/client-metadata

**Auth required:** no  
**Description:** Bluesky AT Protocol relying-party client metadata. This is **not** intended for direct consumption — Bluesky's auth server fetches it during the OAuth handshake. The URL also serves as the `BLUESKY_CLIENT_ID`. Response is the standard OAuth client-metadata JSON.

---

### GET /api/architecture-aggregates/schema

**Auth required:** yes  
**Role required:** owner of "The Public" organization  
**Description:** Returns the ERD (entity-relationship diagram) data derived from the live Prisma schema plus live row counts for the modeled tables. Used by the Architecture Aggregates dashboard.

**Error responses**

| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |
| 403 | Caller is not the owner of "The Public" |
| 404 | "The Public" organization not found |

---

### GET /api/architecture-aggregates/:table

**Auth required:** yes  
**Role required:** owner of "The Public" organization  
**Description:** Paginated, read-only browse of one of the whitelisted tables: `users`, `messages`, `lists`, `list_properties`, `list_data_rows`, `administrators`, `organizations`, `user_organizations`, `follows`. Each row is serialized with related fields flattened (e.g. `userName`, `userDisplayName`). Soft-deleted rows are excluded for tables that support soft-delete.

**Query parameters**

| Param | Type | Default |
|-------|------|---------|
| `page` | number | 1 |
| `limit` | number | 10 |

**Response** `200 OK`
```json
{ "data": [ ... ], "total": 0, "page": 1, "limit": 10, "totalPages": 0 }
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Unknown `:table` |
| 401 | Not authenticated |
| 403 | Caller is not the owner of "The Public" |

---

### GET /api/test-db

**Auth required:** no  
**Description:** Dev-only diagnostic endpoint that asserts the database is reachable. **Do not depend on this in production code paths.**

---

## OAuth Provider Flows

OAuth connections use a two-step authorize → callback pattern. No request body is needed; the browser is redirected to the provider.

| Provider | Authorize | Callback |
|----------|-----------|---------|
| LinkedIn (personal) | `GET /api/auth/linkedin/authorize` | `GET /api/auth/linkedin/callback` |
| LinkedIn (organization) | `GET /api/auth/linkedin/org-authorize?organizationId=<id>` | `GET /api/auth/linkedin/org-callback` |
| Mastodon | `GET /api/auth/mastodon/authorize` | `GET /api/auth/mastodon/callback` |
| Bluesky | `GET /api/auth/bluesky/authorize` | `GET /api/auth/bluesky/callback` |
| GitHub | `GET /api/auth/github/authorize` | `GET /api/auth/github/callback` |
| Twitter/X | `GET /api/auth/twitter/authorize` | `GET /api/auth/twitter/callback` |

All authorize endpoints redirect the browser to the third-party OAuth page. On completion the provider redirects to the callback URL, which creates or updates the `LinkedIdentity` (or `OrgLinkedInCredential` for the org flow) record and redirects the browser back into the app. These flows are intended for use from a browser, not from API clients.

`GET /api/auth/linkedin/authorize?link=true` (account-link mode, initiated from `/integrations`) requests the extended scopes `rw_organization_admin w_organization_social` in addition to the sign-in scopes; plain sign-in keeps the minimal scopes. When `rw_organization_admin` is granted, the LinkedIn callback discovers the company pages the user administers and syncs them as `LinkedInPersonalPage` records (posting targets of kind `personalPage`). A discovery failure does not fail the link — pages can be re-synced via `POST /api/linkedin/sync-pages`.

The LinkedIn organization flow (`org-authorize` / `org-callback`) is documented under [LinkedIn Organization Integration](#linkedin-organization-integration). It binds a shared `OrgLinkedInCredential` to an organization and is gated by the owner/admin role on the target org.

**Bluesky AT Protocol client metadata.** Bluesky's OAuth implementation requires the relying party to publish a JSON client-metadata document. Production serves this from `GET /api/oauth/client-metadata` — the URL is also the `BLUESKY_CLIENT_ID`. It is not a user-callable endpoint; AT Protocol fetches it during the authorize handshake.

---

## Administration

All endpoints under `/api/admin/*` are gated by `checkAdminAndPublicOwner()`: the caller must (a) have an `Administrator` record AND (b) be the owner of the system organization named "The Public". Anything else returns `403 Forbidden`. These endpoints are not part of the public API contract and may change without notice.

### GET /api/admin/users

**Auth required:** admin + Public owner  
**Description:** Paginated list of all users. Supports search across `email`, `username`, and `displayName`. Each user is returned with `isAdministrator` set from the `Administrator` table.

**Query parameters**

| Param | Type | Default |
|-------|------|---------|
| `page` | number | 1 |
| `limit` | number | 10 |
| `search` | string | "" |

**Response** `200 OK`
```json
{
  "users": [ { "id": "...", "email": "...", "username": "...", "displayName": "...", "avatar": "...", "bio": "...", "emailVerified": true, "cleared": false, "customerStatus": "free", "stripeCustomerId": null, "createdAt": "...", "isAdministrator": false } ],
  "pagination": { "total": 1024, "limit": 10, "offset": 0, "page": 1, "hasMore": true }
}
```

---

### POST /api/admin/users

**Auth required:** admin + Public owner  
**Description:** Create a user. Hashes the password, optionally marks email verified, optionally promotes to administrator, and adds the user to "The Public" organization. If the new user is not pre-verified, a verification email is sent and recorded via the email log.

**Request body**
```json
{
  "email": "user@example.com",
  "username": "user1",
  "password": "min8chars",
  "displayName": "User One",
  "avatar": null,
  "bio": null,
  "emailVerified": false,
  "isAdministrator": false,
  "customerStatus": "free"
}
```

**Response** `201 Created` — created user object with `isAdministrator` flag.

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Missing `email`/`username`/`password`, password under 8 chars, or unique constraint clash on a non-email/username field |
| 403 | Caller fails the admin + Public-owner gate |
| 409 | Email or username already in use |

---

### PUT /api/admin/users/:userId

**Auth required:** admin + Public owner  
**Description:** Update a user. Any subset of `email`, `username`, `displayName`, `avatar`, `bio`, `emailVerified`, `cleared`, `customerStatus`, `stripeCustomerId`, `isAdministrator` may be supplied. Email/username uniqueness is re-checked. Promoting/demoting administrator updates the `Administrator` table. Setting `cleared: true` records a `cleared` analytics action.

**Response** `200 OK` — `{ "user": { ..., "isAdministrator": true } }`

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Email/username already in use, or unique constraint clash |
| 403 | Caller fails the admin + Public-owner gate |
| 404 | User not found |

---

### DELETE /api/admin/users/:userId

**Auth required:** admin + Public owner  
**Description:** Delete a user. The caller cannot delete themselves, and the last remaining administrator cannot be deleted.

**Response** `200 OK` — `{ "message": "User deleted" }`

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Self-delete, or deleting the last administrator |
| 403 | Caller fails the admin + Public-owner gate |
| 404 | User not found |

---

### POST /api/admin/users/:userId/password

**Auth required:** admin + Public owner  
**Description:** Set a user's password. The new password must be at least 8 characters. All of the target user's sessions are deleted in the same transaction.

**Request body**
```json
{ "password": "min8chars" }
```

**Response** `200 OK` — `{ "message": "Password updated" }`

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Missing or too-short password |
| 403 | Caller fails the admin + Public-owner gate |
| 404 | User not found |

---

### PATCH /api/admin/users/bulk-clearance

**Auth required:** admin + Public owner  
**Description:** Toggle the `cleared` flag on each user in `userIds`. Records a `cleared` analytics action for every user newly cleared.

**Request body**
```json
{ "userIds": ["u1", "u2", "u3"] }
```

**Response** `200 OK` — `{ "updated": 3 }`

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | `userIds` missing or empty |
| 403 | Caller fails the admin + Public-owner gate |

---

### POST /api/admin/users/bulk-delete

**Auth required:** admin + Public owner  
**Description:** Delete the users listed in `userIds`. The caller cannot include themselves. The request fails if it would delete every remaining administrator.

**Request body**
```json
{ "userIds": ["u1", "u2"] }
```

**Response** `200 OK` — `{ "deleted": 2 }`

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | `userIds` missing/empty, caller included in the list, or this would remove the last administrator(s) |
| 403 | Caller fails the admin + Public-owner gate |

---

### PATCH /api/admin/users/bulk-status

**Auth required:** admin + Public owner  
**Description:** Set `emailVerified` to a fixed boolean for every user in `userIds`.

**Request body**
```json
{ "userIds": ["u1", "u2"], "emailVerified": true }
```

**Response** `200 OK` — `{ "updated": 2 }`

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | `userIds` missing/empty, or `emailVerified` not a boolean |
| 403 | Caller fails the admin + Public-owner gate |

---

### GET /api/admin/email-logs

**Auth required:** admin + Public owner  
**Description:** Paginated log of outbound emails (from Resend) with summary counts grouped by status. Used by the email-logs admin dashboard.

**Query parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | 25 | Clamped to 100. |
| `offset` | number | 0 | |
| `status` | string | — | Exact match on `EmailLog.status`. |
| `emailType` | string | — | Exact match on `EmailLog.emailType`. |
| `search` | string | — | Case-insensitive `contains` on `recipient`. |
| `dateRange` | string | `all` | `today`, `7d`, `30d`, or `all`. |
| `sort` | string | `desc` | `asc` or `desc` on `createdAt`. |

**Response** `200 OK`
```json
{
  "logs": [ { "id": "...", "createdAt": "...", "status": "delivered", "emailType": "...", "recipient": "...", ... } ],
  "total": 0,
  "summary": { "delivered": 0, "failed": 0, "queued": 0 },
  "pagination": { "limit": 25, "offset": 0, "hasMore": false }
}
```

---

## Cron Endpoints (Internal)

These endpoints are called automatically by Vercel Cron and are **not intended for direct use**. They are secured by the `CRON_SECRET` environment variable: the caller must supply `Authorization: Bearer <CRON_SECRET>` or the `x-vercel-cron` request header containing the same value. If `CRON_SECRET` is unset, the secret check is skipped (intended for local development only).

### GET /api/cron/publish-scheduled-messages

Publishes any messages whose `scheduledAt` is in the past. Executes cross-posting according to each message's `scheduledCrossPostConfig`, then clears `scheduledAt` and `scheduledCrossPostConfig`. Returns a summary of `published`, `total`, and any per-message `errors`.

LinkedIn target resolution matches the live `POST /api/messages` path: an active `OrgLinkedInPage` assignment for the author posts as `urn:li:organization:<linkedInPageId>` using the org credential and overrides the personal LinkedIn identity. Without an assignment (or when the org credential has been disconnected) the cron falls back to the author's personal `LinkedIdentity`. Per-target failures are recorded but do not abort the run.

### GET /api/cron/sync-github-lists

Refreshes the GitHub Issues cache for every active GitHub-backed list. Returns:
```json
{ "message": "Sync complete", "synced": 12, "total": 14, "errors": ["List abc123: ..."] }
```
`errors` is omitted when there are none.

---

## Webhook Endpoints (Internal)

These endpoints receive signed payloads from third-party services and are not intended for direct calls.

### POST /api/webhooks/stripe

Receives Stripe events (`checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`) and updates `customerStatus` on the corresponding user record. Verified via the `stripe-signature` header using `STRIPE_WEBHOOK_SECRET`.

### POST /api/webhooks/resend

Receives email delivery events from Resend and updates the email log. Verified via Resend's signature mechanism.
