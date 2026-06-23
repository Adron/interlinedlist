---
title: Authentication & OAuth
---

# Authentication & OAuth

Two authentication methods are supported on InterlinedList's HTTP API.

| Method | Where to use it |
|--------|-----------------|
| Session cookie | The web app and any browser client on the same origin. Set by `POST /api/auth/login`. |
| Bearer token | Native, mobile, desktop, and CLI clients. Obtained from `POST /api/auth/sync-token` and sent as `Authorization: Bearer <token>`. |

Endpoints in the reference below labelled **Session or Bearer** accept either. Endpoints labelled **Session only** require the cookie.

## Login

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "you@example.com", "password": "yourpassword" }
```

**Response (200):**

```json
{
  "id": "clx7k2m0p0000abc123def456",
  "username": "yourhandle",
  "email": "you@example.com",
  "displayName": "Your Name",
  "emailVerified": true,
  "customerStatus": "free",
  "createdAt": "2025-03-12T18:00:00.000Z"
}
```

The server sets an HTTP-only `interlinedlist-session` cookie. Include `credentials: 'include'` in any `fetch` call (or `withCredentials: true` in Axios) to carry it on subsequent requests.

**Errors:** `401 { "error": "Invalid email or password" }` · `403 { "error": "Email not verified" }`

## Obtaining a Bearer token

```http
POST /api/auth/sync-token
Content-Type: application/json

{ "email": "you@example.com", "password": "yourpassword" }
```

**Response (200):**

```json
{ "token": "il_tok_a1b2c3d4..." }
```

Store this token securely (e.g. `.env`, OS keychain). It does not expire automatically and is stored hashed on the server.

```http
GET /api/messages
Authorization: Bearer il_tok_a1b2c3d4...
```

## Registering a new account

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "new@example.com",
  "password": "strongpassword123",
  "username": "myhandle"
}
```

**Response (201):** The user object (verified: false). A verification email is sent automatically.

To resend the verification email later:

```http
POST /api/auth/send-verification-email
```

To complete verification using the token from the email link:

```http
POST /api/auth/verify-email
Content-Type: application/json

{ "token": "<token-from-email-link>" }
```

## Password reset

```http
POST /api/auth/forgot-password
Content-Type: application/json

{ "email": "you@example.com" }
```

**Response (200):** Always `{ "message": "If that email exists, a reset link has been sent." }` (to prevent email enumeration).

Submit the new password with the token from the email link:

```http
POST /api/auth/reset-password
Content-Type: application/json

{ "token": "<token-from-email-link>", "password": "newstrongpassword" }
```

## OAuth providers

All OAuth flows are redirect-based. Navigate to the authorize URL; on success the server redirects back to the app with a session cookie set.

| Provider | Sign in / link URL | Notes |
|----------|--------------------|-------|
| GitHub | `GET /api/auth/github/authorize` | PKCE |
| Mastodon | `GET /api/auth/mastodon/authorize?instance=mastodon.social` | `instance` query param required |
| Bluesky | `GET /api/auth/bluesky/authorize` | Optional `handle` query param |
| LinkedIn | `GET /api/auth/linkedin/authorize` | |
| X (Twitter) | `GET /api/auth/twitter/authorize` | PKCE |

Append `?link=true` to any of the above to add the identity to an already-authenticated session rather than starting a new sign-in.

Native clients can append `?redirect_uri=<your-app-scheme>://callback` so the callback returns a Bearer token instead of setting a cookie.

Check whether a provider is configured on the current deployment:

- `GET /api/auth/linkedin/status` → `{ "configured": true, "redirectUri": "..." }`
- `GET /api/auth/twitter/status` → `{ "configured": true, "redirectUri": "..." }`

## Multi-account & logout

The session cookie holds a comma-separated list of up to 5 session IDs, supporting multiple signed-in accounts.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/accounts` | List the accounts cached in the current cookie. |
| POST | `/api/auth/switch` | Switch the active account in the cookie. Body: `{ "userId": "..." }`. |
| POST | `/api/auth/remove-account` | Remove a linked OAuth identity (not a sign-out). Body: `{ "userId": "..." }`. |
| POST | `/api/auth/logout` | Sign out of the active session. Add `?all=true` to sign out of every session in the cookie. |

## Changing your email

Initiate the change while signed in:

```http
POST /api/user/change-email/request
Content-Type: application/json

{ "newEmail": "new@example.com", "password": "yourpassword" }
```

A confirmation email is sent to the new address. Complete the change with the token from that email:

```http
POST /api/auth/verify-email-change
Content-Type: application/json

{ "token": "<token-from-email-link>" }
```

## Full endpoint table

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Email/password login; sets session cookie. |
| POST | `/api/auth/logout` | Sign out (`?all=true` for all sessions). |
| POST | `/api/auth/register` | Create a new account. |
| POST | `/api/auth/sync-token` | Exchange email/password for a Bearer token. |
| POST | `/api/auth/forgot-password` | Send a password reset email. |
| POST | `/api/auth/reset-password` | Complete a password reset. |
| POST | `/api/auth/send-verification-email` | Resend the verification email. |
| POST | `/api/auth/verify-email` | Verify email with the token from the email link. |
| POST | `/api/auth/verify-email-change` | Confirm an email change. |
| GET | `/api/auth/accounts` | Accounts cached in the current cookie. |
| POST | `/api/auth/switch` | Switch active account. |
| POST | `/api/auth/remove-account` | Remove a linked OAuth identity. |
| GET | `/api/auth/{provider}/authorize` | Start OAuth sign-in or link (`?link=true`). |
| GET | `/api/auth/{provider}/callback` | OAuth callback (redirect target — not for direct calls). |
| GET | `/api/auth/linkedin/status` | Whether LinkedIn OAuth is configured. |
| GET | `/api/auth/twitter/status` | Whether X (Twitter) OAuth is configured. |
| GET | `/api/auth/linkedin/org-authorize` | Start LinkedIn OAuth for an organization (admin only). |
