# InterlinedList — Operational Guide

This document is the working DevOps reference for the InterlinedList web app. It describes the environment variables the running code actually reads, the database/migration workflow, the deployment pipeline, the cron jobs, the OAuth provider integrations, and the third-party services the app talks to.

The authoritative source for runtime behaviour is the code itself — `lib/`, `app/`, `scripts/`, and `middleware.ts`. Whenever something in this document disagrees with the code, the code wins. Submit a fix for the doc.

---

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Environment Variables](#environment-variables)
3. [Database and Migrations](#database-and-migrations)
4. [Deployment](#deployment)
5. [Cron Jobs](#cron-jobs)
6. [OAuth Providers](#oauth-providers)
   - [LinkedIn (Personal Sign-In and Personal-Account Company Pages)](#linkedin-personal-sign-in-and-personal-account-company-pages)
   - [LinkedIn (Organization Shared Credential)](#linkedin-organization-shared-credential)
   - [Bluesky (AT Protocol)](#bluesky-at-protocol)
   - [Mastodon](#mastodon)
   - [GitHub](#github)
   - [Twitter / X](#twitter--x)
   - [Mobile OAuth (Sync Token Handoff)](#mobile-oauth-sync-token-handoff)
7. [Third-Party Services](#third-party-services)
   - [Apple Push Notification Service (APNs)](#apple-push-notification-service-apns)
   - [Resend (Transactional Email)](#resend-transactional-email)
   - [Stripe (Subscriptions)](#stripe-subscriptions)
   - [Vercel Blob (Object Storage)](#vercel-blob-object-storage)
8. [Database Schema Notes](#database-schema-notes)
9. [Performance: ILIKE Query Considerations](#performance-ilike-query-considerations)

---

## Local Development Setup

1. **Clone the repo and install dependencies:**

   ```bash
   git clone git@github.com:Adron/interlinedlist.git
   cd interlinedlist
   npm install
   ```

2. **Create `.env.local`** by copying `.env.example` and filling in real values for at minimum `DATABASE_URL`, `APP_URL`, `NEXT_PUBLIC_APP_URL`, and `SESSION_*`. See [Environment Variables](#environment-variables) for the full list.

3. **Start PostgreSQL.** The repository expects a PostgreSQL instance reachable via `DATABASE_URL`. For local Docker:

   ```bash
   ./scripts/setup-database.sh
   ```

   This brings up a Postgres container preconfigured for `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/interlinedlist?schema=public"`.

4. **Run migrations** (safe additive workflow):

   ```bash
   npm run db:migrate
   ```

   See [Database and Migrations](#database-and-migrations) for details on `db:migrate` vs `db:migrate:deploy`.

5. **Seed initial data** (optional but recommended for local dev):

   ```bash
   node scripts/seed-initial-data.js          # default org "The Public", default lists/folders
   npx tsx scripts/seed-test-users.ts          # creates TEST_USER_* and TEST_SUBSCRIBER_* accounts
   npm run test-data:seed                      # bulk demo content for testing
   ```

6. **Start the dev server:**

   ```bash
   npm run dev
   ```

   App at `http://localhost:3000`.

---

## Environment Variables

The table below lists every `process.env.*` value the code reads, grouped by area. Anything in `.env.example` that does **not** appear in this table is stale and should not be set in production (see the [.env.example notes](#envexample-hygiene) at the bottom of this section).

### Application

| Name | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV` | Yes | Standard Node mode. Set to `production` in deployed environments. |
| `DATABASE_URL` | Yes | PostgreSQL connection string. Used by Prisma. |
| `APP_URL` | Yes | Canonical base URL of the deployment, no trailing slash (e.g. `https://interlinedlist.com`). Used to construct OAuth redirect URIs and absolute links. |
| `NEXT_PUBLIC_APP_URL` | Yes | Same as `APP_URL`, exposed to the browser. |
| `VERCEL_URL` | No | Auto-populated by Vercel for preview deployments. Used as a fallback when `APP_URL` is not set. |
| `APP_NAME` | No | Display name used in email templates and OAuth metadata. Defaults to `InterlinedList`. |
| `APP_USER_AGENT` | No | `User-Agent` header sent to upstream APIs (NOAA, GitHub, etc.). Should include a contact email. |
| `APP_CONTACT_EMAIL` | No | Contact email surfaced in OAuth metadata documents. |
| `SESSION_COOKIE_NAME` | No | Session cookie name. Defaults to `interlinedlist_session`. |
| `SESSION_MAX_AGE` | No | Session lifetime in seconds. Defaults to 30 days. |
| `ANALYTICS_ENABLED` | No | Set to `false` to disable first-party analytics ingestion. |
| `CRON_SECRET` | Yes (prod) | Shared secret enforced by `/api/cron/*` endpoints. See [Cron Jobs](#cron-jobs). |
| `SKIP_DB_MIGRATE` | No | When `true`, the `vercel-build` step skips `prisma migrate deploy`. Escape hatch for emergency redeploys. See [Deployment](#deployment). |
| `XDG_DOWNLOAD_DIR` | No | Path used by download utilities in dev tooling. |

### OAuth Providers

| Name | Required | Purpose |
| --- | --- | --- |
| `LINKEDIN_CLIENT_ID` | When LinkedIn is used | LinkedIn OAuth client id. |
| `LINKEDIN_CLIENT_SECRET` | When LinkedIn is used | LinkedIn OAuth client secret. |
| `LINKEDIN_REDIRECT_URI` | No | Override for personal LinkedIn callback. Defaults to `${APP_URL}/api/auth/linkedin/callback`. |
| `LINKEDIN_ORG_REDIRECT_URI` | When org LinkedIn flow is used | Override for organization LinkedIn callback. Defaults to `${APP_URL}/api/auth/linkedin/org-callback`. **Must be registered in the LinkedIn Developer Portal** (see [LinkedIn (Organization Shared Credential)](#linkedin-organization-shared-credential)). |
| `BLUESKY_CLIENT_ID` | When Bluesky is used | The publicly-served URL of the client-metadata document — usually `${APP_URL}/api/oauth/client-metadata`. AT Protocol fetches this during the OAuth handshake. |
| `GITHUB_CLIENT_ID` | When GitHub is used | GitHub OAuth client id. |
| `GITHUB_CLIENT_SECRET` | When GitHub is used | GitHub OAuth client secret. |
| `TWITTER_CLIENT_ID` | When Twitter is used | Twitter / X OAuth 2.0 client id. |
| `TWITTER_CLIENT_SECRET` | When Twitter is used | Twitter / X OAuth 2.0 client secret. |
| `TWITTER_REDIRECT_URI` | No | Override for Twitter callback. Defaults to `${APP_URL}/api/auth/twitter/callback`. |
| `OAUTH_ALLOWED_REDIRECT_URIS` | When mobile OAuth is used | Comma-separated allowlist of OAuth `redirect_uri` values. Must include any mobile custom-scheme URIs (e.g. `interlinedlist://oauth/callback`). |

> Mastodon uses **dynamic client registration** per-instance — there are no global `MASTODON_*` env vars. The first time a user connects an instance, the app registers a client on that instance and stores the credentials in the database.

### Stripe (Subscriptions)

| Name | Required |
| --- | --- |
| `STRIPE_SECRET_KEY` | Yes |
| `STRIPE_WEBHOOK_SECRET` | Yes |
| `STRIPE_PRICE_MONTHLY` | Yes |
| `STRIPE_PRICE_ANNUAL` | Yes |
| `NEXT_PUBLIC_STRIPE_PRICE_MONTHLY` | Yes |
| `NEXT_PUBLIC_STRIPE_PRICE_ANNUAL` | Yes |
| `NEXT_PUBLIC_STRIPE_PRICE_MONTHLY_LABEL` | No (display label for monthly button) |
| `NEXT_PUBLIC_STRIPE_PRICE_ANNUAL_LABEL` | No (display label for annual button) |

There is **no** `STRIPE_PUBLISHABLE_KEY` referenced anywhere in the code — do not set it. The client-side checkout uses Stripe Checkout sessions; the publishable key is not needed.

### Resend (Email)

| Name | Required |
| --- | --- |
| `RESEND_API_KEY` | Yes |
| `RESEND_FROM_EMAIL` | Yes — the `From` address for all transactional mail. |
| `RESEND_WEBHOOK_SECRET` | Yes — used by `/api/webhooks/resend` to verify signatures. |

### Apple Push Notification Service (APNs)

| Name | Required for iOS push |
| --- | --- |
| `APNS_KEY_ID` | Yes — 10-char key id from Apple Developer Console. |
| `APNS_TEAM_ID` | Yes — 10-char team id. |
| `APNS_BUNDLE_ID` | Yes — the iOS app bundle identifier (must match Xcode). |
| `APNS_PRIVATE_KEY` | Yes — full contents of the `.p8` file. Multi-line PEM is preserved on Vercel; on other hosts replace literal newlines with `\n`. |
| `APNS_PRODUCTION` | Yes — `false` for sandbox (dev builds, TestFlight), `true` for App Store production. |

### Storage

| Name | Required |
| --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Yes — Vercel Blob read/write token used by image/video upload routes. |

### Test Accounts (CI / local only)

| Name | Required for tests |
| --- | --- |
| `TEST_USER_EMAIL`, `TEST_USER_PASSWORD` | Yes — free-tier test account, created by `scripts/seed-test-users.ts`. |
| `TEST_SUBSCRIBER_EMAIL`, `TEST_SUBSCRIBER_PASSWORD` | Yes — subscriber-tier test account. |

### .env.example Hygiene

The repo's `.env.example` is intended for new contributors. The variables below appear in `.env.example` but are **not** read anywhere in the codebase and should be removed:

- `NEXTAUTH_URL`, `NEXTAUTH_SECRET` — there is no NextAuth.js installation.
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` — sessions use the cookie-based session model, not JWTs.
- `STRIPE_PUBLISHABLE_KEY` — see Stripe section above.
- Trailing duplicate `TWITTER_*` and `PROD_*` blocks at the bottom of the example file (clear copy-paste residue).

Variables the code reads but that are missing from `.env.example` (add when next touching the file):

- `CRON_SECRET`
- `LINKEDIN_ORG_REDIRECT_URI`
- `SESSION_MAX_AGE`, `SESSION_COOKIE_NAME`
- `APP_NAME`, `APP_USER_AGENT`, `APP_CONTACT_EMAIL`
- `ANALYTICS_ENABLED`
- `SKIP_DB_MIGRATE`

Also: a couple of comments in `.env.example` reference `documentation/mobile-client-setup.md`. The actual path is `docs/mobile-client-setup.md` — fix those references next time the file is touched.

---

## Database and Migrations

InterlinedList uses Prisma against PostgreSQL. **Migration changes are strictly additive** — never drop or rename a column in a single migration, and never use `prisma db push` (it is not part of the workflow and bypasses the migration history).

### npm scripts

| Script | What it does |
| --- | --- |
| `npm run db:migrate` | Generates and applies a new migration for local/dev use. Wraps `prisma migrate dev` with the additional safety in `scripts/safe-migrate.js`. Use this when authoring schema changes. |
| `npm run db:migrate:deploy` | Applies committed migrations without prompting. Wraps `prisma migrate deploy` via `scripts/migrate-deploy.js`. Used by CI/CD and the Vercel build. |
| `npm run db:migrate:diagnose` | Reads `prisma/migrations/` against the live `_prisma_migrations` table and prints any drift. Use this when a deployment fails with a migration error. |
| `npm run backup` | Snapshots the database to a local SQL dump (see `scripts/`). |
| `npm run restore` | Restores from a snapshot — destructive, will overwrite the current database. Confirm twice before running in production. |

### Authoring schema changes

1. Edit `prisma/schema.prisma`. Only add columns, tables, indexes, and relations — do not drop, rename, or change types in place.
2. Run `npm run db:migrate` and supply a descriptive migration name.
3. Commit the schema change **and** the generated `prisma/migrations/<timestamp>_<name>/` directory together. Both must land in the same commit so deploy ordering is unambiguous.
4. If you need to remove a column, do it in two migrations across two deploys: first stop writing to it in code, deploy; later drop the column in a separate migration, deploy.

### Production deploys

`vercel-build` (see [Deployment](#deployment)) runs `node scripts/migrate-deploy.js` before `next build`. The script is a thin wrapper around `prisma migrate deploy` plus connection-string sanity checks. To skip migrations on a deploy (emergency only), set `SKIP_DB_MIGRATE=true` for that build.

---

## Deployment

The app is deployed on Vercel. The build command is `vercel-build` (defined in `package.json`):

```text
prisma generate && node scripts/migrate-deploy.js && next build
```

Steps:

1. **`prisma generate`** — regenerate the Prisma client from `prisma/schema.prisma`.
2. **`node scripts/migrate-deploy.js`** — apply committed migrations. Skipped when `SKIP_DB_MIGRATE=true`.
3. **`next build`** — Next.js production build.

### vercel.json

`vercel.json` declares:

- `crons` — see [Cron Jobs](#cron-jobs).
- Function timeouts where the default 10s is insufficient (notably the publish-scheduled-messages cron).

### deploy-all-production.js

`scripts/deploy-all-production.js` is the convenience wrapper used to push a build manually when CI is unavailable. It runs lint + type checks, builds locally, and triggers the Vercel deploy.

### Pre-deploy checklist

- All migrations committed alongside their schema change.
- `SKIP_DB_MIGRATE` is **not** set (unless the migration was applied out-of-band and you need to skip it intentionally).
- All required env vars are present in the Vercel project (see [Environment Variables](#environment-variables)).
- `CRON_SECRET` is set in production — without it the cron endpoints fail closed.

---

## Cron Jobs

Two cron jobs run from Vercel Cron via `vercel.json`:

| Path | Schedule | Purpose |
| --- | --- | --- |
| `GET /api/cron/publish-scheduled-messages` | `* * * * *` (every minute) | Publishes any messages whose `scheduledAt` has elapsed. Fans out to each cross-post destination per the stored `scheduledCrossPostConfig`. LinkedIn target resolution matches the live `POST /api/messages` path (see `docs/api-reference.md`). |
| `GET /api/cron/sync-github-lists` | `0 * * * *` (hourly) | Re-syncs the cached rows of every GitHub-backed list against the GitHub Issues API. |

Both endpoints require either:

- `Authorization: Bearer <CRON_SECRET>` header, OR
- `x-vercel-cron: <CRON_SECRET>` header (Vercel populates this automatically when the cron fires).

Without a matching secret the routes return `401`. This means **direct user-agent calls always fail** — exactly what you want for cron endpoints exposed at predictable URLs.

If you need to invoke a cron job manually for testing, set `CRON_SECRET` locally and:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/publish-scheduled-messages
```

---

## OAuth Providers

Each provider has its own pair of routes under `app/api/auth/<provider>/` and a helper module under `lib/auth/oauth-<provider>.ts`. The mobile sync-token handoff (when the OAuth caller is the iOS app) is documented at the end of this section.

### LinkedIn (Personal Sign-In and Personal-Account Company Pages)

**Source files**

- `lib/auth/oauth-linkedin.ts` — config, scope sets, auth-URL builders, token exchange, profile/admin-page fetchers.
- `app/api/auth/linkedin/authorize/route.ts` — initiates the personal flow.
- `app/api/auth/linkedin/callback/route.ts` — handles the redirect, upserts the `LinkedIdentity`, and (when scope permits) discovers admin pages.

**Env vars:** `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI` (optional override).

**Scopes:** The base sign-in scope set is `openid profile email`. When `?link=true` is appended to the authorize URL (the account-link flow from `/integrations`), the request additionally includes `w_member_social rw_organization_admin w_organization_social`. This gives the connection permission to (a) post to the user's personal LinkedIn timeline, (b) discover the LinkedIn Company Pages the user administers, and (c) post on behalf of those pages using the personal access token.

**Personal-Account Company Pages.** When the link flow grants `rw_organization_admin`, the callback also calls `fetchLinkedInAdminPages()` and upserts a `LinkedInPersonalPage` row for each page. These appear in the user's cross-post **Posting targets** picker as `{ "kind": "personalPage" }` entries and post under `urn:li:organization:<linkedInPageId>` using the user's own access token. A discovery failure during the link does not fail the link — pages can be re-synced from the LinkedIn card on `/integrations`.

**Token refresh — not implemented (by design).** LinkedIn does **not** issue a `refresh_token` for "Sign In with LinkedIn using OpenID Connect" or for the `w_member_social` / `rw_organization_admin` product set the app uses. The token response carries only `access_token`, `expires_in` (~60 days), and `scope`. Refresh tokens are only available on LinkedIn's **Marketing Developer Platform** product, which InterlinedList does not request. Consequence: when a LinkedIn access token expires, the cross-post fails with 401 and the user must re-link from `/integrations` to obtain a new token. The exchange helper deliberately does not store anything in a `refresh_token` field — the field is absent on every row. If a future product change grants the app access to LinkedIn refresh tokens, mirror the Twitter pattern in `lib/twitter/token-refresh.ts`: add `refreshLinkedInToken()` to `lib/auth/oauth-linkedin.ts`, add a `getValidLinkedInAccessToken()` helper, and call it from `postToLinkedIn()` before the post request.

**LinkedIn Developer Portal setup**

1. Create an app at <https://www.linkedin.com/developers/>.
2. Under **Auth**, register every environment's redirect URI:
   - `https://interlinedlist.com/api/auth/linkedin/callback`
   - `https://<branch>-<project>.vercel.app/api/auth/linkedin/callback` (preview deploys)
   - `http://localhost:3000/api/auth/linkedin/callback`
3. Under **Products**, request **Sign In with LinkedIn using OpenID Connect** and the products needed for `w_member_social` and `rw_organization_admin`. Approval can take a few business days.

### LinkedIn (Organization Shared Credential)

**Source files**

- `lib/auth/oauth-linkedin.ts` — `buildLinkedInOrgAuthUrl()`, `getLinkedInOrgRedirectUri()`.
- `app/api/auth/linkedin/org-authorize/route.ts` — owner/admin-gated entry point.
- `app/api/auth/linkedin/org-callback/route.ts` — handles the redirect, upserts `OrgLinkedInCredential` and discovered `OrgLinkedInPage` rows.
- `app/api/organizations/[id]/linkedin/{status,assignments,credential,sync-pages}/route.ts` — admin UI for status, page assignment, disconnect, re-sync.
- `lib/linkedin/resolve-linkedin-target.ts` — precedence resolver (org assignment overrides personal LinkedIn for cross-posts when no explicit target is requested).

**Env vars:** `LINKEDIN_ORG_REDIRECT_URI` (required when the default would not match — typically yes in non-default deploys). The default value is `${APP_URL}/api/auth/linkedin/org-callback`.

**Scopes:** `openid profile email w_member_social rw_organization_admin`. The org callback uses the same client id/secret as the personal flow.

**LinkedIn Developer Portal setup.** Register the org callback URL **in addition** to the personal callback URL — they are distinct paths and LinkedIn enforces exact-string match:

- `https://interlinedlist.com/api/auth/linkedin/org-callback`
- `https://<branch>-<project>.vercel.app/api/auth/linkedin/org-callback`
- `http://localhost:3000/api/auth/linkedin/org-callback`

**Runtime behaviour.** The org-authorize route stores `organizationId` on the OAuth state cookie. The org-callback reads it back, upserts `OrgLinkedInCredential` (clearing `disconnectedAt` if the org is reconnecting), fetches admin pages via `fetchLinkedInAdminPages()`, and upserts each as `OrgLinkedInPage` while deleting any pages no longer in the response. Admin/owner members then assign pages to specific users via `PUT /api/organizations/:id/linkedin/assignments`.

### Bluesky (AT Protocol)

**Source files**

- `lib/auth/oauth-bluesky.ts` — OAuth helpers, client-metadata, DPoP key handling.
- `app/api/auth/bluesky/authorize/route.ts` and `callback/route.ts`.
- `app/api/oauth/client-metadata/route.ts` — serves the AT Protocol client-metadata document.

**Env vars:** `BLUESKY_CLIENT_ID` — set to the public URL of `GET /api/oauth/client-metadata`. In development this is typically `https://127.0.0.1:3000/api/oauth/client-metadata`; in production it is `${APP_URL}/api/oauth/client-metadata`. AT Protocol fetches this document during the authorize handshake; the URL is the relying-party identifier.

**Runtime behaviour.** Bluesky uses a non-standard "duplex streaming body" pattern for token exchange. `lib/auth/oauth-bluesky.ts` uses `fetch(..., { duplex: 'half' })` on the token-exchange POST. Without this option the request body is buffered and the Node 25 `undici` implementation throws — symptoms are a 500 on the callback and a stack trace mentioning "duplex" or "ReadableStream". If you upgrade Node or `undici` and start seeing this error, verify the `duplex: 'half'` option is still being passed.

**Token refresh.** AT Protocol access tokens are DPoP-bound — they can only be used by the holder of the private key that signed the original handshake, so any refresh must include a DPoP proof signed with the same key. InterlinedList delegates this entirely to `@atproto/oauth-client-node`. In `lib/bluesky/post-status.ts` the cross-post path calls `NodeOAuthClient.restore(did)`, which inspects the cached token, refreshes via the PDS token endpoint if needed (using the stored `dpopJwk`), and writes the rotated `tokenSet` back to `linked_identities.providerData` through the session store defined in `lib/bluesky/session-from-provider-data.ts`. There is no app-level refresh helper to call directly — the library handles both proactive and on-401 refresh as long as the cached `dpopJwk` is intact. A `TokenRefreshError` or `TokenInvalidError` thrown from `restore()` surfaces as the "please re-link your Bluesky account in Settings" error in the cross-post path. If the `dpopJwk` is missing from `providerData` (older rows pre-DPoP rollout), refresh is impossible and re-linking is the only fix.

### Mastodon

**Source files**

- `lib/auth/oauth-mastodon.ts` — dynamic client registration, OAuth helpers.
- `app/api/auth/mastodon/authorize/route.ts` and `callback/route.ts`.

**Env vars:** none — Mastodon is dynamically registered per-instance. The first time a user adds an instance, the app POSTs to `https://<instance>/api/v1/apps` to register an OAuth client and stores the client id/secret in the database keyed on the instance domain.

**Runtime behaviour.** Each user can connect multiple Mastodon instances; each is a separate `LinkedIdentity` with provider `mastodon:<instance-domain>`. There is no shared app credential.

### GitHub

**Source files**

- `lib/auth/oauth-github.ts` — OAuth helpers, scope selection.
- `app/api/auth/github/authorize/route.ts` and `callback/route.ts`.
- `lib/github/issues.ts` — issue read/write helpers used by GitHub-backed lists.

**Env vars:** `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`.

**Scopes.** Plain sign-in uses minimal scopes. When `?link=true` is appended (account-link flow), the request adds `repo` scope so the app can read and write GitHub Issues for GitHub-backed lists.

**Setup.** Register an OAuth app at <https://github.com/settings/developers> with `${APP_URL}/api/auth/github/callback` as the callback URL.

**Token refresh — not applicable.** InterlinedList uses a GitHub **OAuth App** (not a GitHub App). OAuth App user access tokens **do not expire by default** and the token-exchange response contains only `access_token` and `scope` — no `expires_in` or `refresh_token` — which is why `GitHubTokenResponse` in `lib/auth/oauth-github.ts` does not model those fields and the callback writes only `{ access_token, scopes }` into `providerData`. Tokens become invalid only when the user revokes the app's authorization at <https://github.com/settings/applications> or when the OAuth App's client secret is rotated. Either case requires re-linking from `/integrations`. If the app is ever migrated to a **GitHub App** (which does issue expiring tokens with refresh), mirror the Twitter refresh pattern: add `refreshGitHubToken()` to `lib/auth/oauth-github.ts`, a `getValidGitHubAccessToken()` helper, and call it before each GitHub API request in `lib/github/issues.ts`.

### Twitter / X

The Twitter integration is documented in detail below — it was the first integration the team built and has the deepest operational notes. The code paths and conventions established here informed the structure of the other OAuth provider modules.

The integration uses **Twitter OAuth 2.0 with PKCE** (Authorization Code + PKCE). There is no OAuth 1.0a or App-Only (Bearer) authentication path. All user-level API calls — posting, media upload — use per-user access tokens stored in the `linked_identities` table.

Source files:

- `lib/auth/oauth-twitter.ts` — OAuth helpers, config checks, token exchange
- `app/api/auth/twitter/authorize/route.ts` — initiates the OAuth dance
- `app/api/auth/twitter/callback/route.ts` — handles the redirect and stores tokens
- `app/api/auth/twitter/status/route.ts` — exposes configured state to the client
- `lib/twitter/post-status.ts` — cross-posting, thread splitting, media upload

#### Twitter Developer Portal Setup

1. Go to [developer.twitter.com](https://developer.twitter.com) and create or open a project and app.
2. Under **User authentication settings**, enable **OAuth 2.0**.
3. Set **Type of App** to **Web App, Automated App or Bot**.
4. Set **App permissions** to **Read and Write** (required for `tweet.write`).
5. Add every environment's callback URL under **Callback URI / Redirect URL** (see next subsection).
6. Set **Website URL** to the value of `APP_URL` for that environment.
7. Copy **Client ID** → `TWITTER_CLIENT_ID` and **Client Secret** → `TWITTER_CLIENT_SECRET` (the secret is shown only once; store it in your secrets manager immediately).
8. Confirm the app is in a **Project** (standalone apps cannot use OAuth 2.0 PKCE).

#### Required OAuth Scopes

The scopes are hardcoded in `lib/auth/oauth-twitter.ts`:

```text
tweet.read  tweet.write  users.read  offline.access
```

| Scope | Reason |
| --- | --- |
| `tweet.read` | Read the authenticated user's timeline and verify identity |
| `tweet.write` | Post tweets and threads on behalf of the user |
| `users.read` | Fetch profile info (`/2/users/me`) to get `id`, `username`, `name`, `profile_image_url` |
| `offline.access` | Receive a `refresh_token` so tokens can be renewed without re-prompting the user |

`offline.access` is only granted when the Twitter app's **Token type** is set to **Refresh token** in the Developer Portal. Without it, `tokens.refresh_token` will be undefined and tokens expire after ~2 hours.

#### Callback URL Configuration

The callback URL is resolved in this priority order (from `lib/auth/oauth-twitter.ts`):

1. `TWITTER_REDIRECT_URI` env var (when set)
2. `${APP_URL}/api/auth/twitter/callback` (default, derived from `NEXT_PUBLIC_APP_URL` / `VERCEL_URL`)

Every value that this logic can resolve to must be registered as a Callback URI in the Developer Portal. The check is exact-string: trailing slashes, HTTP vs HTTPS, port numbers — any mismatch causes Twitter to reject the request with `redirect_uri not whitelisted`.

Environments to register:

| Environment | Callback URI to register |
| --- | --- |
| Production | `https://interlinedlist.com/api/auth/twitter/callback` |
| Vercel preview (per-branch) | `https://<branch>-<project>.vercel.app/api/auth/twitter/callback` |
| Local dev (direct) | `http://localhost:3000/api/auth/twitter/callback` |
| Local dev (ngrok) | `https://<tunnel-id>.ngrok.io/api/auth/twitter/callback` |
| Mobile (iOS custom scheme) | `interlinedlist://oauth/callback` |

The `/api/auth/twitter/status` route exposes the currently resolved redirect URI so you can verify what the server thinks it is without opening source code:

```http
GET /api/auth/twitter/status
```

Response:

```json
{ "configured": true, "redirectUri": "https://abc123.ngrok.io/api/auth/twitter/callback" }
```

#### Local Dev with ngrok

Twitter's OAuth 2.0 accepts `http://localhost` as a valid redirect URI, so ngrok is optional for most development work. Use it when you need to test mobile OAuth flows or when Twitter rejects localhost for a specific app configuration.

**Option A: Direct localhost (simplest)** — No extra setup required. Ensure the Developer Portal has `http://localhost:3000/api/auth/twitter/callback` registered.

```bash
# .env.local — no TWITTER_REDIRECT_URI override needed
TWITTER_CLIENT_ID="..."
TWITTER_CLIENT_SECRET="..."
APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Option B: ngrok tunnel**

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

Start the app with `npm run dev`. Important: ngrok free-tier URLs change on every restart. Each new URL must be re-registered in the Developer Portal and the env vars updated.

#### OAuth Flow Architecture

```text
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

#### Token Storage and Rotation

Tokens are persisted in the `linked_identities.providerData` JSON column (`prisma/schema.prisma`, model `LinkedIdentity`):

```json
{
  "access_token": "<bearer token>",
  "refresh_token": "<refresh token>",
  "expires_at": 1748000000000
}
```

`expires_at` is a Unix timestamp in milliseconds (`Date.now() + expires_in * 1000`). It is set at callback time only when the token response includes `expires_in`.

Current rotation behaviour: the callback handler (`app/api/auth/twitter/callback/route.ts`) writes new tokens on every sign-in, and the cross-post path refreshes on demand. `lib/twitter/token-refresh.ts` exports `getValidTwitterAccessToken()` and `forceRefreshTwitterAccessToken()`:

- **Proactive refresh.** `postToTwitter()` calls `getValidTwitterAccessToken()` before any tweet is created. If the cached token is still valid for more than 60 seconds (`EXPIRY_SKEW_MS`) it is reused; otherwise the stored `refresh_token` is exchanged at the Twitter token endpoint and the new pair is persisted back to `linked_identities.providerData` before the post call runs.
- **Refresh-on-401 fallback.** If a tweet `POST` returns 401 despite the proactive check (legacy row with no `expires_at`, or Twitter invalidated the token early), `postToTwitter()` calls `forceRefreshTwitterAccessToken()` and retries the tweet once with the new token before reporting failure.

The token endpoint contract used by both helpers:

```http
POST https://api.twitter.com/2/oauth2/token
Authorization: Basic <base64(client_id:client_secret)>
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&refresh_token=<stored_refresh_token>&client_id=<client_id>
```

The `getTwitterConfig()` function in `lib/auth/oauth-twitter.ts` provides the client credentials. After a successful refresh, the helper writes the new `access_token`, `refresh_token`, and updated `expires_at` back to `linked_identities.providerData`. There is intentionally **no background scheduled refresh job** — refresh-on-use is sufficient and avoids burning refresh tokens when a user is inactive.

Token rotation cadence from Twitter: access tokens expire in approximately 7200 seconds (2 hours) when `offline.access` is granted. Refresh tokens do not expire but are single-use — each refresh issues a new refresh token that replaces the previous one. If two cross-post requests race on the same identity, the second one's refresh attempt will fail with `invalid_grant`; in that case the cross-post will fall through to the stored (likely just-rotated) access token and either succeed or surface a 401 the operator can act on.

#### Cross-Posting: Threads and Media

`lib/twitter/post-status.ts` implements the posting logic.

**Character limit**: 280 (`TWITTER_CHAR_LIMIT`). Content exceeding 280 characters is split into a thread by `lib/crosspost/text-splitter.ts`. Each part except the last is posted as a reply to the previous tweet using `reply.in_reply_to_tweet_id`.

**Images**: up to 4 per tweet (`TWITTER_IMAGES_PER_TWEET`). Images are fetched from their URLs, converted to base64, and uploaded to `https://upload.twitter.com/1.1/media/upload.json`. Media IDs are attached to the tweet body via `media.media_ids`.

**Video**: uploaded via the chunked media upload protocol (INIT / APPEND in 5 MB chunks / FINALIZE) to the same endpoint with `media_category=tweet_video`. After FINALIZE, processing state is polled every 3 seconds (`VIDEO_POLL_INTERVAL_MS`) for up to 30 seconds (`VIDEO_POLL_MAX_MS`). Images and video cannot be mixed in a single tweet — the distributor assigns them to separate posts.

API endpoints used:

| Endpoint | Purpose |
| --- | --- |
| `https://upload.twitter.com/1.1/media/upload.json` | Image and video upload (media/upload v1.1) |
| `https://api.twitter.com/2/tweets` | Create tweet (v2) |
| `https://api.twitter.com/2/oauth2/token` | Token exchange and refresh (v2) |
| `https://api.twitter.com/2/users/me` | Fetch authenticated user profile (v2) |

All calls use the per-user `access_token` from `linked_identities.providerData`, not app-level credentials.

#### Common Errors and Remediation

| Symptom | Likely Cause | Fix |
| --- | --- | --- |
| Redirect to `/login?error=OAuth+configuration+error` at the start of the flow | `TWITTER_CLIENT_ID` or `TWITTER_CLIENT_SECRET` is not set | Set both env vars; verify with `GET /api/auth/twitter/status` |
| Twitter returns `redirect_uri not whitelisted` (400) | The resolved callback URL does not match any registered URI | Register the exact URL shown by `/api/auth/twitter/status` in the Developer Portal |
| `Invalid state` redirect to `/login` | The `oauth_state` cookie expired (10-minute window) or was cleared | Ask the user to retry; ensure cookies are not blocked for the domain |
| `Twitter token exchange failed: 401` in server logs | Client ID / secret are wrong, or the app was suspended | Verify credentials in Developer Portal; check app status |
| Cross-post fails with `401` after a long idle window | Proactive refresh was attempted but the stored `refresh_token` was rejected (`invalid_grant`) — typically because the user revoked the app in Twitter's settings, or two concurrent posts raced on the same single-use refresh token | Re-link the Twitter account from `/integrations` to issue a fresh refresh token |
| Cross-post fails with `403 Forbidden` | App permissions are set to **Read Only** in the Developer Portal | Change to **Read and Write** and re-authorize (existing tokens do not gain new scopes — users must re-link) |
| `This Twitter account is already linked to another user` | `providerUserId` exists under a different `userId` in `linked_identities` | The Twitter account can only be linked to one InterlinedList user at a time; the other user must unlink first |
| Video upload timeout | Video processing exceeds 30 seconds on Twitter's side | Retry; consider reducing video resolution/size before upload |
| New user gets username collision suffix (`_1`, `_2`, ...) | Another account already used the Twitter handle as a username | Expected behavior; the suffix is appended automatically |

### Mobile OAuth (Sync Token Handoff)

When the `authorize` endpoint is called with a custom-scheme `redirect_uri` (e.g. `interlinedlist://oauth/callback`), the callback handler detects it via `isMobileRedirectUri()` in `lib/auth/pkce.ts` and instead of setting a session cookie it:

1. Creates a `SyncToken` record in the database (hashed with SHA-256, model in `prisma/schema.prisma`).
2. Appends `?token=<raw_token>` to the custom-scheme redirect URI.
3. The native app captures the URI, extracts the token, and uses it as `Authorization: Bearer <token>` on subsequent API calls.

The sync token name for Twitter-originated mobile sign-ins is `"Mobile-Twitter"` (set in `createSyncTokenForUser` call in `app/api/auth/twitter/callback/route.ts`). The same pattern is used by every OAuth provider's mobile flow.

For the custom scheme to be accepted, it must appear in `OAUTH_ALLOWED_REDIRECT_URIS`:

```bash
OAUTH_ALLOWED_REDIRECT_URIS="https://interlinedlist.com/oauth/callback,interlinedlist://oauth/callback"
```

The full mobile setup (Xcode URL types, ASWebAuthenticationSession integration) is documented in `docs/mobile-client-setup.md`.

---

## Third-Party Services

### Apple Push Notification Service (APNs)

**Source files**

- `lib/push/apns.ts` — JWT signing, APNs HTTP/2 client, payload construction.
- `app/api/push/register/route.ts`, `app/api/push/unregister/route.ts` — device-token registration.

**Env vars:** `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`, `APNS_PRIVATE_KEY`, `APNS_PRODUCTION` (see [Environment Variables](#environment-variables)).

**Operational notes**

- The `.p8` private key contents go directly into `APNS_PRIVATE_KEY`. Vercel preserves multi-line PEM blocks; on other hosts replace literal newlines with `\n`.
- `APNS_PRODUCTION=false` targets the APNs sandbox (`api.sandbox.push.apple.com`) which is what TestFlight and Xcode debug builds use. Set to `true` only for App Store builds.
- A device token registered on a debug build will silently fail to receive notifications from a production-mode server — the most common cause of "push is broken" reports is a mismatched sandbox/production flag.

Mobile client setup (Xcode entitlements, capability registration, device-token flow) is documented in `docs/mobile-client-setup.md`.

### Resend (Transactional Email)

**Source files**

- `lib/email/resend.ts` — Resend client and `FROM_EMAIL`.
- `lib/email/webhook-verify.ts` — signature verification.
- `app/api/webhooks/resend/route.ts` — delivery event ingestion.
- `lib/email/log-email.ts`, `lib/email/templates/*` — outbound logging and HTML templates.

**Env vars:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET`.

**Operational notes**

- Every outbound email is recorded in `EmailLog` with the Resend message id. The admin dashboard at `/admin/email-logs` filters this table; see `GET /api/admin/email-logs` in `docs/api-reference.md`.
- The Resend webhook delivers `email.sent`, `email.delivered`, `email.bounced`, `email.complained`, `email.opened`, and `email.clicked` events. The handler updates `EmailLog.status` accordingly. Failed signature verification returns 401.

### Stripe (Subscriptions)

**Source files**

- `app/api/stripe/create-checkout-session/route.ts`, `app/api/stripe/create-portal-session/route.ts`.
- `app/api/webhooks/stripe/route.ts` — webhook handler.
- See `docs/stripe-setup.md` for the full Stripe Dashboard configuration walkthrough.

**Env vars:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`, `NEXT_PUBLIC_STRIPE_PRICE_MONTHLY`, `NEXT_PUBLIC_STRIPE_PRICE_ANNUAL`, and the two optional `_LABEL` vars.

**Webhook events handled:** `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. The handler updates `User.customerStatus` to `free` or `subscriber` as appropriate and stores the Stripe customer/subscription ids.

### Vercel Blob (Object Storage)

**Source files**

- `lib/blob.ts` — upload helpers.
- `app/api/messages/images/upload/route.ts`, `app/api/messages/videos/upload/route.ts`, `app/api/documents/[id]/images/upload/route.ts`, `app/api/user/avatar/upload/route.ts`.

**Env vars:** `BLOB_READ_WRITE_TOKEN`.

**Operational notes**

- Uploads are direct from the server to Vercel Blob; the client receives a public URL after the upload completes.
- Subscription is required for message image and video uploads (enforced in the route handlers).

---

## Database Schema Notes

### list\_folders Table

Prisma model: `ListFolder` — maps to the `list_folders` table (added via migration).

The model supports a self-referential tree via the `"ListFolderTree"` named relation: each `ListFolder` may have an optional `parentId` pointing to another row in the same table. The `List` model has a nullable `folderId` foreign key that references `list_folders.id` (cascade: `SetNull` on folder delete).

Relevant indexes in `prisma/schema.prisma`:

```prisma
@@unique([userId, parentId, name])   // prevents duplicate names within the same parent
@@index([userId, deletedAt])         // primary filtering index
@@index([parentId])                  // tree traversal
```

The `ListFolder` model is structurally parallel to the existing `Folder` model (for documents, mapped to `folders`). Both follow the same soft-delete pattern via `deletedAt`.

---

## Performance: ILIKE Query Considerations

The request/response shapes for `GET /api/documents/search` and `GET /api/lists/search` are documented in `docs/api-reference.md`. The notes below cover the runbook side — what the queries do at the database layer and how to make them scale.

### Current Behaviour

`GET /api/documents/search` and `GET /api/lists/search` both issue PostgreSQL `ILIKE` queries against the following columns:

| Table | Searched columns |
| --- | --- |
| `documents` | `title`, `content` |
| `lists` | `title`, `description` |

`ILIKE` does not use a standard B-tree index. Without a trigram or full-text index on these columns, each search requires a sequential scan of all rows that pass the `userId` and `deletedAt` filter. On large tables this will become a bottleneck.

### Partial Mitigation: userId Scoping

Both queries include `userId: user.id` and `deletedAt: null` in the `WHERE` clause. PostgreSQL can use the existing composite B-tree indexes to narrow the row set before applying the `ILIKE` filter:

- `documents`: `@@index([userId, deletedAt])` in `prisma/schema.prisma`
- `lists`: `@@index([userId, deletedAt])` in `prisma/schema.prisma`

For users with fewer than roughly 10 000 rows the index-narrowed scan is typically acceptable. Above that threshold a dedicated text index is recommended.

### Recommended Indexes for Tables Over ~10k Rows

Enable the `pg_trgm` extension and add GIN trigram indexes on the searched columns. These allow PostgreSQL to use the index for `ILIKE` and `~*` pattern matching without changing any application code.

```sql
-- Enable the extension once per database
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- documents: title and content
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_title_trgm
  ON documents USING gin (title gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_content_trgm
  ON documents USING gin (content gin_trgm_ops);

-- lists: title and description
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lists_title_trgm
  ON lists USING gin (title gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lists_description_trgm
  ON lists USING gin (description gin_trgm_ops);
```

Use `CONCURRENTLY` so the index builds without locking the table in production.

These indexes are not managed by Prisma migrations today. If they are added to the production database manually, document the commands in a `scripts/` runbook or add a raw SQL migration via `prisma migrate` using a custom SQL block so the change is tracked.

### Future Upgrade: Full-Text Search via tsvector

`ILIKE` substring matching is a useful short-term approach but does not rank results by relevance or handle stemming. The recommended longer-term path is PostgreSQL full-text search using `tsvector`.

Example index for `documents`:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_fts
  ON documents
  USING gin (to_tsvector('english', title || ' ' || coalesce(content, '')));
```

This would require changing the Prisma queries from `contains` / `mode: 'insensitive'` to a raw `$queryRaw` using `to_tsquery` or `plainto_tsquery`, which is a breaking change to the search routes. A phased approach is:

1. Add the `tsvector` GIN index alongside the existing `pg_trgm` indexes (no application change needed yet).
2. Measure query plan improvements with `EXPLAIN ANALYZE`.
3. Migrate the application queries to `plainto_tsquery` when ready, returning relevance-ranked results.

Until that migration is done, the `pg_trgm` GIN indexes described above are the lowest-effort way to make `ILIKE` searches index-backed.

### Folder Tree Query: GET /api/documents/folders

Source: `app/api/documents/folders/route.ts`

As of the folder nesting change, this endpoint returns **all** of the authenticated user's non-deleted folders in a single flat query — the previous filter on `parentId: null` (root-only) has been removed. The client is responsible for assembling the hierarchy from the flat list using the `parentId` field on each folder.

Operational implications:

- **Payload size**: The response grows linearly with the total number of folders a user has, not just the number of root folders. For users with up to a few hundred folders this is negligible, but it is worth monitoring if folder counts grow into the thousands.
- **Query cost**: The underlying Prisma query scans all `folders` rows matching `userId` and `deletedAt: null`. The existing `@@index([userId, deletedAt])` composite index on the `folders` table covers this filter, so no additional index is required at current scale.
- **No pagination**: The endpoint returns all folders in one response. If average folder counts grow significantly, consider adding `limit`/`offset` pagination or a cursor-based approach — the current design does not support it.
