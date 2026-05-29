# InterlinedList — Operational Guide

## Table of Contents

1. [Twitter/X Integration](#twitterx-integration)
   - [Environment Variables](#environment-variables)
   - [Twitter Developer Portal Setup](#twitter-developer-portal-setup)
   - [Required OAuth Scopes](#required-oauth-scopes)
   - [Callback URL Configuration](#callback-url-configuration)
   - [Local Dev with ngrok](#local-dev-with-ngrok)
   - [OAuth Flow Architecture](#oauth-flow-architecture)
   - [Token Storage and Rotation](#token-storage-and-rotation)
   - [Mobile OAuth (Sync Token Handoff)](#mobile-oauth-sync-token-handoff)
   - [Cross-Posting: Threads and Media](#cross-posting-threads-and-media)
   - [Common Errors and Remediation](#common-errors-and-remediation)

---

## Twitter/X Integration

The integration uses **Twitter OAuth 2.0 with PKCE** (Authorization Code + PKCE). There is no OAuth 1.0a or App-Only (Bearer) authentication path. All user-level API calls — posting, media upload — use per-user access tokens stored in the `linked_identities` table.

Source files:
- `lib/auth/oauth-twitter.ts` — OAuth helpers, config checks, token exchange
- `app/api/auth/twitter/authorize/route.ts` — initiates the OAuth dance
- `app/api/auth/twitter/callback/route.ts` — handles the redirect and stores tokens
- `app/api/auth/twitter/status/route.ts` — exposes configured state to the client
- `lib/twitter/post-status.ts` — cross-posting, thread splitting, media upload

---

### Environment Variables

| Name | Required | Purpose | Example |
|---|---|---|---|
| `TWITTER_CLIENT_ID` | Yes | OAuth 2.0 Client ID from Twitter Developer Portal | `abc123XYZ...` |
| `TWITTER_CLIENT_SECRET` | Yes | OAuth 2.0 Client Secret from Twitter Developer Portal | `s3cr3t...` |
| `TWITTER_REDIRECT_URI` | No | Override the callback URL (default: `${APP_URL}/api/auth/twitter/callback`). Must match a registered Callback URI in the Developer Portal exactly. | `https://abc123.ngrok.io/api/auth/twitter/callback` |
| `APP_URL` | Yes (global) | Canonical base URL of the deployment, no trailing slash. Used to construct the default Twitter redirect URI when `TWITTER_REDIRECT_URI` is not set. | `https://interlinedlist.com` |
| `NEXT_PUBLIC_APP_URL` | Yes (global) | Same as `APP_URL`, exposed to the browser. | `https://interlinedlist.com` |
| `OAUTH_ALLOWED_REDIRECT_URIS` | No | Comma-separated allowlist of `redirect_uri` values accepted by OAuth callbacks. Required when adding a mobile custom-scheme URI. | `https://interlinedlist.com/oauth/callback,interlinedlist://oauth/callback` |

`isTwitterConfigured()` in `lib/auth/oauth-twitter.ts` returns `false` (and the UI hides the Twitter connect button) when either `TWITTER_CLIENT_ID` or `TWITTER_CLIENT_SECRET` is absent.

---

### Twitter Developer Portal Setup

1. Go to [developer.twitter.com](https://developer.twitter.com) and create or open a project and app.
2. Under **User authentication settings**, enable **OAuth 2.0**.
3. Set **Type of App** to **Web App, Automated App or Bot**.
4. Set **App permissions** to **Read and Write** (required for `tweet.write`).
5. Add every environment's callback URL under **Callback URI / Redirect URL** (see next section).
6. Set **Website URL** to the value of `APP_URL` for that environment.
7. Copy **Client ID** → `TWITTER_CLIENT_ID` and **Client Secret** → `TWITTER_CLIENT_SECRET` (the secret is shown only once; store it in your secrets manager immediately).
8. Confirm the app is in a **Project** (standalone apps cannot use OAuth 2.0 PKCE).

---

### Required OAuth Scopes

The scopes are hardcoded in `lib/auth/oauth-twitter.ts`:

```
tweet.read  tweet.write  users.read  offline.access
```

| Scope | Reason |
|---|---|
| `tweet.read` | Read the authenticated user's timeline and verify identity |
| `tweet.write` | Post tweets and threads on behalf of the user |
| `users.read` | Fetch profile info (`/2/users/me`) to get `id`, `username`, `name`, `profile_image_url` |
| `offline.access` | Receive a `refresh_token` so tokens can be renewed without re-prompting the user |

`offline.access` is only granted when the Twitter app's **Token type** is set to **Refresh token** in the Developer Portal. Without it, `tokens.refresh_token` will be undefined and tokens expire after ~2 hours.

---

### Callback URL Configuration

The callback URL is resolved in this priority order (from `lib/auth/oauth-twitter.ts`):

1. `TWITTER_REDIRECT_URI` env var (when set)
2. `${APP_URL}/api/auth/twitter/callback` (default, derived from `NEXT_PUBLIC_APP_URL` / `VERCEL_URL`)

**Every value that this logic can resolve to must be registered** as a Callback URI in the Developer Portal. The check is exact-string: trailing slashes, HTTP vs HTTPS, port numbers — any mismatch causes Twitter to reject the request with `redirect_uri not whitelisted`.

Environments to register:

| Environment | Callback URI to register |
|---|---|
| Production | `https://interlinedlist.com/api/auth/twitter/callback` |
| Vercel preview (per-branch) | `https://<branch>-<project>.vercel.app/api/auth/twitter/callback` |
| Local dev (direct) | `http://localhost:3000/api/auth/twitter/callback` |
| Local dev (ngrok) | `https://<tunnel-id>.ngrok.io/api/auth/twitter/callback` |
| Mobile (iOS custom scheme) | `interlinedlist://oauth/callback` |

The `/api/auth/twitter/status` route exposes the currently resolved redirect URI so you can verify what the server thinks it is without opening source code:

```
GET /api/auth/twitter/status
```

Response:
```json
{ "configured": true, "redirectUri": "https://abc123.ngrok.io/api/auth/twitter/callback" }
```

---

### Local Dev with ngrok

Twitter's OAuth 2.0 **accepts `http://localhost` as a valid redirect URI**, so ngrok is optional for most development work. Use it when you need to test mobile OAuth flows or when Twitter rejects localhost for a specific app configuration.

**Option A — direct localhost (simplest)**

No extra setup required. Ensure the Developer Portal has `http://localhost:3000/api/auth/twitter/callback` registered.

```bash
# .env.local — no TWITTER_REDIRECT_URI override needed
TWITTER_CLIENT_ID="..."
TWITTER_CLIENT_SECRET="..."
APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Option B — ngrok tunnel**

```bash
# Install ngrok and authenticate once
ngrok config add-authtoken <your-ngrok-token>

# Start the tunnel (keep this terminal open)
ngrok http 3000
# Note the Forwarding URL, e.g. https://abc123.ngrok-free.app
```

Add the ngrok callback URL to the Developer Portal, then set in `.env.local`:

```bash
TWITTER_REDIRECT_URI="https://abc123.ngrok-free.app/api/auth/twitter/callback"
APP_URL="https://abc123.ngrok-free.app"
NEXT_PUBLIC_APP_URL="https://abc123.ngrok-free.app"
```

Start the app:

```bash
npm run dev
```

Important: ngrok free-tier URLs change on every restart. Each new URL must be re-registered in the Developer Portal and the env vars updated.

---

### OAuth Flow Architecture

```
Browser                        Next.js                          Twitter
  |                               |                                |
  | GET /api/auth/twitter/authorize?link=<bool>&redirect_uri=<uri>
  |-----------------------------→ |                                |
  |                               | generate state + PKCE verifier |
  |                               | store in oauth_state cookie    |
  |                               | build auth URL                 |
  |                               |-------------------------------→|
  |        302 → twitter.com/i/oauth2/authorize                   |
  |←------------------------------------------------------------- |
  | (user grants permission)                                       |
  |                               |                                |
  |        302 → /api/auth/twitter/callback?code=<code>&state=<s> |
  |-----------------------------→ |                                |
  |                               | verify state cookie            |
  |                               | POST /2/oauth2/token (PKCE)   |
  |                               |-------------------------------→|
  |                               |    { access_token, refresh_token, expires_in }
  |                               |←------------------------------|
  |                               | GET /2/users/me                |
  |                               |-------------------------------→|
  |                               |    { id, username, name, profile_image_url }
  |                               |←------------------------------|
  |                               | upsert linked_identities row   |
  |                               | set session cookie             |
  |        302 → /dashboard       |                                |
  |←-----------------------------|                                |
```

Key implementation details:

- **State parameter**: 32 random bytes, base64url-encoded (`generateState()` in `lib/auth/oauth-twitter.ts`). Stored in an `httpOnly`, `sameSite: lax` cookie named `oauth_state` with a 10-minute TTL. The cookie is deleted immediately after the callback is processed.
- **PKCE**: `code_challenge_method=S256`. Verifier and challenge generated by `lib/auth/pkce.ts`. The verifier never leaves the server.
- **Link mode**: `?link=true` attaches a Twitter identity to an already-authenticated session without creating a new user account. On conflict (Twitter account already linked to a different user), the callback redirects to `/integrations?error=...`.
- **New-user creation**: When no existing `linked_identity` is found, a user record is created with a synthetic email (`<twitter_user_id>+twitter@users.noreply.twitter.com`) and a random password hash.

---

### Token Storage and Rotation

Tokens are persisted in the `linked_identities.providerData` JSON column (`prisma/schema.prisma`, model `LinkedIdentity`):

```json
{
  "access_token": "<bearer token>",
  "refresh_token": "<refresh token>",
  "expires_at": 1748000000000
}
```

`expires_at` is a Unix timestamp in milliseconds (`Date.now() + expires_in * 1000`). It is set at callback time only when the token response includes `expires_in`.

**Current rotation behaviour**: the callback handler (`app/api/auth/twitter/callback/route.ts`) writes new tokens on every sign-in. There is no background proactive refresh — if an access token expires between sign-ins and a cross-post is attempted, the cross-post will fail with a `401` from the Twitter API. The `refresh_token` stored in `providerData` can be exchanged at the Twitter token endpoint for a fresh pair:

```
POST https://api.twitter.com/2/oauth2/token
Authorization: Basic <base64(client_id:client_secret)>
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&refresh_token=<stored_refresh_token>
```

The `getTwitterConfig()` function in `lib/auth/oauth-twitter.ts` provides the client credentials. After a successful refresh, write the new `access_token`, `refresh_token`, and updated `expires_at` back to `linked_identities.providerData`.

Token rotation cadence from Twitter: access tokens expire in approximately 7200 seconds (2 hours) when `offline.access` is granted. Refresh tokens do not expire but are single-use — each refresh issues a new refresh token that replaces the previous one.

---

### Mobile OAuth (Sync Token Handoff)

When the `authorize` endpoint is called with a custom-scheme `redirect_uri` (e.g. `interlinedlist://oauth/callback`), the callback handler detects it via `isMobileRedirectUri()` in `lib/auth/pkce.ts` and instead of setting a session cookie it:

1. Creates a `SyncToken` record in the database (hashed with SHA-256, model in `prisma/schema.prisma`).
2. Appends `?token=<raw_token>` to the custom-scheme redirect URI.
3. The native app captures the URI, extracts the token, and uses it as `Authorization: Bearer <token>` on subsequent API calls.

The sync token name for Twitter-originated mobile sign-ins is `"Mobile-Twitter"` (set in `createSyncTokenForUser` call in `app/api/auth/twitter/callback/route.ts`).

For the custom scheme to be accepted, it must appear in `OAUTH_ALLOWED_REDIRECT_URIS`:

```bash
OAUTH_ALLOWED_REDIRECT_URIS="https://interlinedlist.com/oauth/callback,interlinedlist://oauth/callback"
```

---

### Cross-Posting: Threads and Media

`lib/twitter/post-status.ts` implements the posting logic.

**Character limit**: 280 (`TWITTER_CHAR_LIMIT`). Content exceeding 280 characters is split into a thread by `lib/crosspost/text-splitter.ts`. Each part except the last is posted as a reply to the previous tweet using `reply.in_reply_to_tweet_id`.

**Images**: up to 4 per tweet (`TWITTER_IMAGES_PER_TWEET`). Images are fetched from their URLs, converted to base64, and uploaded to `https://upload.twitter.com/1.1/media/upload.json`. Media IDs are attached to the tweet body via `media.media_ids`.

**Video**: uploaded via the chunked media upload protocol (INIT / APPEND in 5 MB chunks / FINALIZE) to the same endpoint with `media_category=tweet_video`. After FINALIZE, processing state is polled every 3 seconds (`VIDEO_POLL_INTERVAL_MS`) for up to 30 seconds (`VIDEO_POLL_MAX_MS`). Images and video cannot be mixed in a single tweet — the distributor assigns them to separate posts.

**API endpoints used**:

| Endpoint | Purpose |
|---|---|
| `https://upload.twitter.com/1.1/media/upload.json` | Image and video upload (media/upload v1.1) |
| `https://api.twitter.com/2/tweets` | Create tweet (v2) |
| `https://api.twitter.com/2/oauth2/token` | Token exchange and refresh (v2) |
| `https://api.twitter.com/2/users/me` | Fetch authenticated user profile (v2) |

All calls use the per-user `access_token` from `linked_identities.providerData`, not app-level credentials.

---

### Common Errors and Remediation

| Symptom | Likely Cause | Fix |
|---|---|---|
| Redirect to `/login?error=OAuth+configuration+error` at the start of the flow | `TWITTER_CLIENT_ID` or `TWITTER_CLIENT_SECRET` is not set | Set both env vars; verify with `GET /api/auth/twitter/status` |
| Twitter returns `redirect_uri not whitelisted` (400) | The resolved callback URL does not match any registered URI | Register the exact URL shown by `/api/auth/twitter/status` in the Developer Portal |
| `Invalid state` redirect to `/login` | The `oauth_state` cookie expired (10-minute window) or was cleared | Ask the user to retry; ensure cookies are not blocked for the domain |
| `Twitter token exchange failed: 401` in server logs | Client ID / secret are wrong, or the app was suspended | Verify credentials in Developer Portal; check app status |
| Cross-post fails silently; `providerData.access_token` is present | Access token expired (>2 hours old) and no proactive refresh was performed | Re-link the Twitter account from `/integrations` to issue fresh tokens; or implement refresh-on-demand using the stored `refresh_token` |
| Cross-post fails with `403 Forbidden` | App permissions are set to **Read Only** in the Developer Portal | Change to **Read and Write** and re-authorize (existing tokens do not gain new scopes — users must re-link) |
| `This Twitter account is already linked to another user` | `providerUserId` exists under a different `userId` in `linked_identities` | The Twitter account can only be linked to one InterlinedList user at a time; the other user must unlink first |
| Video upload timeout | Video processing exceeds 30 seconds on Twitter's side | Retry; consider reducing video resolution/size before upload |
| New user gets username collision suffix (`_1`, `_2`, ...) | Another account already used the Twitter handle as a username | Expected behavior; the suffix is appended automatically |
