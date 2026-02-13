# Auth API

## POST /api/auth/login

**Body:** `{ email, password }`

Returns JSON and sets `session` cookie on success. 401 on invalid credentials.

## POST /api/auth/register

**Body:** `{ email, username, password }`

Creates user, sends verification email. Sets session or returns verification-pending.

## POST /api/auth/logout

Clears session cookie. No body.

## POST /api/auth/forgot-password

**Body:** `{ email }`

Creates reset token, sends email. Always returns success (no user enumeration).

## POST /api/auth/reset-password

**Body:** `{ token, password }`

Resets password if token valid. Redirect or JSON.

## POST /api/auth/send-verification-email

Resend verification email. Rate limited (e.g. 10 min).

## GET /api/auth/verify-email

**Query:** `?token=...`

Verifies email, redirects to login or dashboard.

## OAuth

### GitHub

- `GET /api/auth/github/authorize` — Redirect to GitHub
- `GET /api/auth/github/callback` — Callback, create session

### Mastodon

- `GET /api/auth/mastodon/authorize` — Redirect to instance
- `GET /api/auth/mastodon/callback` — Callback

### Bluesky

- `GET /api/auth/bluesky/authorize` — Redirect to Bluesky
- `GET /api/auth/bluesky/callback` — Callback

OAuth creates `LinkedIdentity` and links to user account.
