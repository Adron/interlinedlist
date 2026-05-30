# Auth Flow

## Session-Based Auth

- **Cookie**: `session` (httpOnly, secure in production, sameSite: lax)
- **Value**: User ID stored in cookie
- **Max age**: 7 days (configurable via `SESSION_MAX_AGE`)

### getCurrentUser()

- Reads `session` cookie
- Looks up user in Prisma
- Returns user object or `null`
- Used in pages and API routes for auth checks

### Protected Routes

Middleware protects: `/dashboard`, `/settings`, `/lists`, `/admin`

- If no session cookie → redirect to `/login`
- Edge runtime: only cookie existence checked; full validation in page/API

## OAuth

Supported providers: GitHub, Mastodon, Bluesky (AT Protocol)

### Flow

1. User clicks "Connect" → `/api/auth/{provider}/authorize`
2. Redirect to provider
3. Callback → `/api/auth/{provider}/callback`
4. Create/link `LinkedIdentity`, create session
5. Redirect to `/settings` or dashboard

### Linked Identities

- Stored in `LinkedIdentity` model
- `provider` format: `github`, `bluesky`, `mastodon:instance.domain`
- One identity per provider per user

## Password Auth

- **Registration**: `POST /api/auth/register` → bcrypt hash, create User
- **Login**: `POST /api/auth/login` → verify password, `createSession(userId)`
- **Logout**: `POST /api/auth/logout` → `deleteSession()`
- **Password reset**: Token in DB, email link to `/reset-password`
- **Email verification**: Token in DB, email link to `/verify-email`
