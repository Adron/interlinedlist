# InterlinedList

A time-series micro-blogging platform with first-class **syndication** (cross-posting to Bluesky, Mastodon, LinkedIn, and X/Twitter), **dynamic user-defined lists** (built from a small DSL), **markdown documents** with local-filesystem sync, organizations, a follow graph, and a paid subscriber tier.

Built with Next.js 14 (App Router) + React 18 + TypeScript, PostgreSQL via Prisma, and deployed on Vercel. A companion iOS app and the `il-sync` document-sync CLI talk to the same HTTP API.

---

## Table of contents

- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [npm scripts](#npm-scripts)
- [Testing](#testing)
- [Architecture](#architecture)
- [Database & migrations](#database--migrations)
- [Authentication](#authentication)
- [Subscriptions](#subscriptions-free-vs-subscriber)
- [Cross-posting & integrations](#cross-posting--integrations)
- [Scheduled posts & cron](#scheduled-posts--cron)
- [Documents & the `il-sync` CLI](#documents--the-il-sync-cli)
- [Environment variables](#environment-variables)
- [Project structure](#project-structure)
- [Deployment](#deployment)
- [Documentation](#documentation)

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router, RSC), React 18, TypeScript (strict) |
| Database | PostgreSQL + Prisma 5 |
| Styling | Bootstrap 5 + the DarkOne SCSS theme (`styles/darkone/`), Sass |
| Hosting / infra | Vercel (build, hosting, Cron), Vercel Blob (image/video storage) |
| Email | Resend (transactional) + webhook delivery tracking |
| Payments | Stripe (Checkout + Billing Portal + webhooks) |
| Push | Apple Push Notification service (APNs) for the iOS app |
| OAuth providers | GitHub, Bluesky (AT Protocol), Mastodon, LinkedIn, X/Twitter |
| Diagrams / editors | ReactFlow + elkjs (ERD), swagger-ui-react (API docs), react-md-editor |
| Tests | Vitest (unit), Playwright (e2e) |
| CLI | `il-sync` (Go) — prebuilt binaries served from `public/downloads/` |

Node **20.19.0** is pinned in `.nvmrc`.

---

## Quick start

### Prerequisites

- **Node 20.19+** (`nvm use` honors `.nvmrc`)
- **PostgreSQL 14+** running locally
- PostgreSQL client tools (`psql`, `pg_dump`) for the backup/restore scripts

### Setup

```bash
# 1. Install (postinstall runs `prisma generate`)
npm install

# 2. Configure environment — copy the template and fill it in
cp .env.example .env.local
#   At minimum set DATABASE_URL. See "Environment variables" below.

# 3. Create the database + apply migrations
#    Automated (creates user/db, grants, migrates, seeds "The Public" org):
./scripts/setup-database.sh
#    …or manually:
createdb interlinedlist && npm run db:migrate

# 4. (Optional) seed local test data
node scripts/seed-initial-data.js        # "The Public" org + initial user
npx tsx scripts/seed-test-users.ts       # the two e2e test accounts
npm run test-data:seed                   # ~70 demo users + sample messages

# 5. Run it
npm run dev                              # http://localhost:3000
```

`npm run db:studio` opens Prisma Studio for browsing the database.

---

## npm scripts

```bash
# Dev / build
npm run dev                  # Next dev server
npm run build                # production build (also typechecks — see note below)
npm run start                # serve a production build
npm run lint                 # ESLint

# Tests
npm run test                 # Vitest (unit) — once
npm run test:watch           # Vitest watch mode
npm run test:e2e             # Playwright (auto-starts dev server, seeds test users)
npm run test:e2e:headed      # …with a visible browser
npm run test:e2e:ui          # interactive Playwright UI
npm run test:e2e:report      # open the last HTML report

# Database
npm run db:migrate           # safe local migrate (scripts/safe-migrate.js)
npm run db:migrate:deploy    # apply migrations to a remote DB (reads .env)
npm run db:migrate:diagnose  # diagnose migration-history drift
npm run db:generate          # regenerate Prisma Client
npm run db:studio            # Prisma Studio GUI
npm run backup               # pg_dump prod + local → ~/Downloads/BACKUP/
npm run restore              # restore local DB from the latest backup

# Docs generation
npm run docs:all             # regenerate docs/*.md + docs/openapi.json
npm run docs:api             # docs/api-reference.md
npm run docs:user            # docs/user-guide.md
npm run docs:devops          # docs/operational.md
npm run docs:openapi         # docs/openapi.json (powers /api-docs)
```

> **Build note:** `next.config.js` sets `eslint.ignoreDuringBuilds: true` but keeps `typescript.ignoreBuildErrors: false`. **TypeScript errors fail the build; lint errors do not.** Run `npm run lint` yourself — CI/build won't catch it for you.

---

## Testing

### Unit tests (Vitest)

Pure-function tests live next to the code as `*.test.ts` under `lib/` and `app/api/`. No database needed.

```bash
npm run test                                   # all
npx vitest run lib/lists/dsl-parser.test.ts    # one file
npx vitest run -t "splits a thread"            # one test by name
```

### End-to-end tests (Playwright)

Specs live in `tests/e2e/`. `playwright.config.ts` auto-starts `npm run dev` (reused if already running) and runs `tests/e2e/global-setup.ts`, which seeds two accounts via Prisma:

| Account | Default email | Tier |
|---------|---------------|------|
| Free user | `testuser@example.com` | `customerStatus: free` |
| Subscriber | `testsubscriber@example.com` | `customerStatus: subscriber` |

Override with `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` / `TEST_SUBSCRIBER_EMAIL` / `TEST_SUBSCRIBER_PASSWORD` / `PLAYWRIGHT_BASE_URL`. Many specs under `tests/e2e/api/` assert security boundaries (auth, IDOR/cross-user isolation, subscription gating) — keep them green.

```bash
npx playwright install                                # first run only
npm run test:e2e -- tests/e2e/auth/login.spec.ts      # a single spec
```

---

## Architecture

A single Next.js App Router application. Pages and API routes coexist under `app/`; shared logic lives in `lib/<feature>/`.

- **`app/`** — pages (RSC by default) and `app/api/**/route.ts` HTTP handlers. Marketing/content pages (`/about`, `/features`, `/pricing`, `/integrations`, `/products`, `/blog`, `/api-docs`) sit alongside the app proper.
- **`lib/<feature>/`** — business logic and Prisma access, grouped by domain (`auth`, `messages`, `lists`, `documents`, `organizations`, `follows`, `crosspost`, `bluesky`, `mastodon`, `linkedin`, `twitter`, `github`, `subscription`, `notifications`, `push`, `analytics`, `security`, `crypto`, `email`, …). API routes stay thin and delegate here; each domain typically has a `queries.ts`.
- **`components/`** — React components grouped by feature.
- **`middleware.ts`** — runs on the Edge runtime, so **it cannot use Prisma**. It only checks session-cookie *existence* for protected prefixes (`/dashboard`, `/settings`, `/lists`, `/admin`) and rewrites `/@username` → `/user/username`. Real session validation happens in page/route components.
- **`DSL/`** — the small schema language behind dynamic lists (docs + examples). Implementation is in `lib/lists/dsl-*.ts`.

### Core data model (Prisma)

28 models — highlights:

- **User / Session / SyncToken** — accounts, web sessions, and CLI/mobile bearer tokens.
- **Message / MessageDig** — time-series posts (replies via self-relation, scheduling, image/video URLs, tags, cross-post result URLs, "digs" and "pushes").
- **List / ListProperty / ListDataRow / ListWatcher / ListFolder / ListConnection / ListGitHubIssueCache** — dynamic lists: DSL-defined schema (`ListProperty`), JSONB rows (`ListDataRow`), shared access roles (`ListWatcher`: watcher/collaborator/manager), foldering, list-to-list connections, and a GitHub-issues-backed mode.
- **Organization / UserOrganization** — multi-tenant orgs with roles (owner/admin/member); "The Public" is a system org everyone joins.
- **Follow** — follower/following graph with pending/approved status.
- **Folder / Document** — markdown documents in nested folders, syncable via `il-sync`.
- **LinkedIdentity / OrgLinkedInCredential / OrgLinkedInPage / LinkedInPersonalPage / LinkedInPostingTargetPreference** — linked social accounts and the LinkedIn org/personal page posting model.
- **UserNotification / DeviceToken** — in-app notifications and APNs device registrations.
- **AnalyticsEvent / EmailLog** — first-party analytics and a log of every email sent.
- **Administrator** — marks platform admins.

Full schema: `prisma/schema.prisma`. Deeper docs: `docs/architecture/`.

---

## Database & migrations

> **Strict, additive-only, migration-file-only workflow.** Bypassing it has broken production before.

- Edit `prisma/schema.prisma` **and** hand-write `prisma/migrations/<timestamp>_<desc>/migration.sql`.
- **Never** run `prisma migrate dev`, `prisma db push`, or raw DDL against the database.
- Migration SQL must be **idempotent**: `ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, FKs wrapped in `DO $$ BEGIN … EXCEPTION WHEN duplicate_object THEN NULL; END $$`. No `DROP`/`TRUNCATE`/destructive `ALTER` without explicit approval.
- Apply to **both** databases when developing: `npm run db:migrate` (localhost, reads `.env.local`) and `npm run db:migrate:deploy` (remote, reads `.env`).
- After a schema change: `rm -rf .next && npm run db:generate && npm run dev`.

`npm run db:migrate` wraps `scripts/safe-migrate.js`, which checks status and refuses destructive resets. `db:migrate:force` (`prisma migrate dev`) exists as an escape hatch only — avoid it. On Vercel, migrations run automatically during build via the `vercel-build` script (set `SKIP_DB_MIGRATE=true` to bypass for a single deploy).

Backups: `npm run backup` writes verified `pg_dump`s (prod + local) to `~/Downloads/BACKUP/`; `npm run restore` drops and rebuilds the **local** DB from the newest backup.

---

## Authentication

Three mechanisms — pick the one the endpoint needs:

1. **Session cookie (web)** — `getCurrentUser()` in `lib/auth/session.ts`. Sessions are `Session` rows; the cookie holds a **comma-separated list of session IDs** for multi-account switching (up to 5 cached accounts; first = active). The cookie value is **only ever** validated as a Session ID, never as a user ID — do not reintroduce a userId fallback (it enabled account takeover).
2. **Sync token (CLI / mobile)** — `getCurrentUserOrSyncToken(request)` in `lib/auth/sync-token.ts` accepts `Authorization: Bearer <token>` (sha-256 hashed lookup in `SyncToken`) and falls back to the session cookie.
3. **Cron secret** — `isAuthorizedCronRequest(request)` in `lib/auth/cron.ts` constant-time-compares `CRON_SECRET`. All `app/api/cron/*` routes gate on it and **fail closed** when it is unset.

OAuth account linking is supported for GitHub, Bluesky, Mastodon, LinkedIn, and X/Twitter, including a mobile flow gated by the `OAUTH_ALLOWED_REDIRECT_URIS` allowlist. Admin status is the `Administrator` table (`isAdministrator()`).

---

## Subscriptions (free vs subscriber)

Two tiers via `User.customerStatus` (`free` | `subscriber` | `subscriber:monthly` | `subscriber:annual`), backed by Stripe. Gate subscriber-only actions (e.g. creating lists/documents) with `isSubscriber(user.customerStatus)` from `lib/subscription/is-subscriber.ts`, returning **403** for free users.

- Checkout & Billing Portal: `app/api/stripe/*`.
- Stripe webhook (`app/api/webhooks/stripe`) updates `customerStatus`/`stripeCustomerId` via `lib/subscription/`.
- Local setup: `docs/stripe-setup.md` (use the Stripe CLI to forward webhooks).

---

## Cross-posting & integrations

A message can fan out to **Bluesky, Mastodon, LinkedIn, and X/Twitter**. Each platform has `lib/<platform>/post-status.ts`; linked accounts are `LinkedIdentity` rows. `lib/crosspost/text-splitter.ts` handles per-platform character limits and threading.

LinkedIn has the richest target model: a personal profile, **organization pages** shared at the org level (`OrgLinkedInCredential` / `OrgLinkedInPage`, assignable to members), and **personal company pages** (`LinkedInPersonalPage`). A user's chosen default target is a `LinkedInPostingTargetPreference`.

**GitHub-backed lists:** with GitHub linked (Issues scope), a list with `source: "github"` mirrors a repo's issues into `ListGitHubIssueCache`, refreshed hourly by cron and on demand via `/api/lists/[id]/refresh`.

---

## Scheduled posts & cron

Posts can carry a `scheduledAt` plus a `scheduledCrossPostConfig`. Two Vercel Cron jobs (declared in `vercel.json`, implemented under `app/api/cron/`) drive background work — both require a valid `CRON_SECRET`:

| Route | Schedule | Purpose |
|-------|----------|---------|
| `publish-scheduled-messages` | every minute | publish due scheduled messages and run their cross-posts |
| `sync-github-lists` | hourly | refresh GitHub-issue-backed lists |

---

## Documents & the `il-sync` CLI

Documents are markdown files organized into nested folders, optionally shared publicly. The `il-sync` CLI (and the iOS app) authenticate with a **sync token** and use `app/api/documents/sync` plus `app/api/auth/sync-token` to keep a local folder in sync with the server. Prebuilt CLI binaries are served from `public/downloads/` (`darwin-arm64`, `darwin-amd64`, `linux-amd64`, `linux-arm64`, `windows`). Local-server testing notes: `docs/developer/cli-against-local-server.md`.

---

## Environment variables

`.env.example` is the source of truth — copy it to `.env.local` and fill in what you need. `.env` is used for remote/production tooling; `.env.local` for local dev (both are gitignored). Grouped overview:

| Group | Keys |
|-------|------|
| **Core** | `DATABASE_URL`, `APP_URL`, `NEXT_PUBLIC_APP_URL`, `NODE_ENV`, `APP_NAME`, `APP_USER_AGENT`, `APP_CONTACT_EMAIL` |
| **Session** | `SESSION_COOKIE_NAME`, `SESSION_MAX_AGE` |
| **Secrets at rest** | `SECRETS_ENCRYPTION_KEY` — AES-256-GCM key for user-supplied OpenAI/Anthropic API keys (unset = legacy plaintext) |
| **Cron / ops** | `CRON_SECRET`, `SKIP_DB_MIGRATE` |
| **Analytics** | `ANALYTICS_ENABLED` |
| **Email (Resend)** | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET` |
| **Payments (Stripe)** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`, `NEXT_PUBLIC_STRIPE_PRICE_*` |
| **Storage** | `BLOB_READ_WRITE_TOKEN` (Vercel Blob) |
| **OAuth** | `GITHUB_CLIENT_ID/SECRET`, `BLUESKY_CLIENT_ID`, `LINKEDIN_CLIENT_ID/SECRET`, `TWITTER_CLIENT_ID/SECRET`, `MASTODON_*`, `OAUTH_ALLOWED_REDIRECT_URIS` |
| **Push (APNs)** | `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`, `APNS_PRIVATE_KEY`, `APNS_PRODUCTION` |
| **E2E test users** | `TEST_USER_*`, `TEST_SUBSCRIBER_*` |

The app URL is auto-derived on Vercel from `VERCEL_URL` when `NEXT_PUBLIC_APP_URL` is unset. Bluesky OAuth requires its client-metadata URL (`/api/oauth/client-metadata`) to be publicly fetchable — use a tunnel (e.g. ngrok) for local OAuth testing.

---

## Project structure

```
app/                      # App Router pages + app/api/**/route.ts handlers
  api/                    # REST API (auth, messages, lists, documents, follow,
                          #   organizations, stripe, webhooks, cron, github,
                          #   linkedin, notifications, push, analytics, exports…)
  (marketing pages)       # /about /features /pricing /integrations /products /blog /api-docs
components/               # React components, grouped by feature
lib/                      # Domain logic + Prisma access, one folder per feature
DSL/                      # Dynamic-list schema language (docs + examples)
prisma/                   # schema.prisma + migrations/ (idempotent SQL)
scripts/                  # db migrate/backup/restore, seeds, doc generators
tests/e2e/                # Playwright specs + global-setup.ts
docs/                     # Generated + hand-written docs (see below)
public/downloads/         # Prebuilt il-sync CLI binaries
styles/darkone/           # DarkOne SCSS theme
middleware.ts             # Edge middleware (cookie check + /@username rewrite)
```

---

## Deployment

Deployed on **Vercel**. The build command is `npm run vercel-build`:

```
prisma generate && node scripts/migrate-deploy.js && next build
```

So Prisma Client is generated and migrations applied automatically on every deploy. Set all production environment variables in the Vercel dashboard (`DATABASE_URL`, `CRON_SECRET`, Stripe/Resend/OAuth/APNs keys, etc.). Cron schedules are declared in `vercel.json`. Use a managed Postgres (Neon, Supabase, Vercel Postgres, …); for Neon pooled connections the migrate scripts switch to a direct (non-`-pooler`) host to avoid advisory-lock timeouts.

---

## Documentation

Project docs live under `docs/`:

- `docs/api-reference.md` — HTTP API reference (also browsable at `/api-docs`, served from `docs/openapi.json` / `/api/openapi.json`)
- `docs/user-guide.md` — end-user guide
- `docs/operational.md` — DevOps / operations
- `docs/stripe-setup.md`, `docs/mobile-client-setup.md` — integration setup
- `docs/architecture/` — data model, auth flow, components, API design
- `docs/developer/` — contributor + integrator notes (incl. CLI vs local server)
- `docs/blog/` — published blog posts (rendered at `/blog`)

Regenerate the generated docs with `npm run docs:all`.
