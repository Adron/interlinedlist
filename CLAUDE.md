# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

InterlinedList is a Next.js 14 (App Router) time-series micro-blogging platform: cross-posting/syndication to Bluesky, Mastodon, LinkedIn, and X/Twitter; dynamic user-defined lists (via a DSL); markdown documents with filesystem sync; organizations; a follow graph; Stripe subscriptions; scheduled posts; in-app + APNs push notifications; first-party analytics; and a paid subscriber tier. PostgreSQL via Prisma 5. Deployed on Vercel. Node 20.19 (`.nvmrc`).

> `README.md` and `docs/` describe the product; for ground truth on actual behavior, prefer `prisma/schema.prisma`, `lib/`, and `app/api/`. The `il-sync` document-sync CLI source no longer lives in this repo — only its prebuilt binaries under `public/downloads/`. The server side of sync (sync tokens, `app/api/documents/sync`) is still here.

## Commands

```bash
npm run dev                 # Dev server (localhost:3000)
npm run build               # Production build
npm run lint                # ESLint

# Unit tests (Vitest, no DB needed — pure functions only)
npm run test                            # all
npm run test:watch                      # watch mode
npx vitest run lib/lists/dsl-parser.test.ts   # single file
npx vitest run -t "splits a thread"           # single test by name

# E2E (Playwright; auto-starts dev server, seeds two test users via global-setup)
npm run test:e2e                        # all (headless)
npm run test:e2e -- tests/e2e/auth/login.spec.ts   # single spec
npm run test:e2e:ui                     # interactive debugger

npm run docs:all            # regenerate docs/*.md + docs/openapi.json (powers /api-docs)
```

`*.test.ts` files live next to the code they cover (under `lib/` and `app/api/`). Tests run against `@`-aliased imports (`@/*` → repo root), configured in both `tsconfig.json` and `vitest.config.ts`. The two e2e accounts are seeded by `tests/e2e/global-setup.ts` (or `npx tsx scripts/seed-test-users.ts`); `tests/e2e/api/*` specs assert auth/IDOR/subscription boundaries — keep them green.

## Database & migrations — STRICT WORKFLOW

This project enforces an **additive-only, migration-file-only** schema workflow. Violating it has broken production before.

- **Never** run `prisma migrate dev`, `prisma db push`, or raw DDL/`$executeRawUnsafe` against the database. Schema changes go through migration files only.
- All schema changes = edit `prisma/schema.prisma` **and** hand-write `prisma/migrations/<timestamp>_<desc>/migration.sql`.
- Migration SQL must be **idempotent**: `ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, FKs wrapped in `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$`. No `DROP`/`TRUNCATE`/destructive `ALTER` without explicit user approval.
- Apply to **both** databases: `npm run db:migrate` (localhost, reads `.env.local`) **and** `npm run db:migrate:deploy` (remote, reads `.env` only). `db:migrate` wraps `scripts/safe-migrate.js`, which refuses destructive resets.
- After a schema change, regenerate the client and clear the Next cache: `rm -rf .next && npx prisma generate && npm run dev`.
- **Agent routing:** route all schema/migration work to the **db-migrations** agent (or `/db-migrations` skill), never the nextjs-developer agent. For a feature needing both schema + routes, run db-migrations first, then nextjs-developer.

`npm run db:studio` opens Prisma Studio. `npm run backup` / `npm run restore` handle pg_dump backups to `~/Downloads/BACKUP/`.

## Authentication & authorization

Three distinct auth mechanisms — match the one the endpoint needs:

1. **Session cookie (web).** `getCurrentUser()` in `lib/auth/session.ts`. Sessions are rows in the `Session` table keyed by UUID. The cookie holds a **comma-separated list of session IDs** (multi-account support, up to 5 cached accounts; first = active). `switchSession`/`removeSession`/`getCachedAccounts` manage the list. Security note in that file: the cookie value is **only ever** validated as a Session ID — never as a userId. Do not reintroduce a userId fallback (it allowed account takeover).
2. **Sync token (CLI / mobile).** `getCurrentUserOrSyncToken(request)` in `lib/auth/sync-token.ts` accepts `Authorization: Bearer <token>` (sha256-hashed lookup in `SyncToken`) and falls back to the session cookie. Use this for any endpoint the `il-sync` CLI or native app calls.
3. **Cron secret.** `isAuthorizedCronRequest(request)` in `lib/auth/cron.ts` checks `CRON_SECRET`. All `app/api/cron/*` routes must gate on it first.

`middleware.ts` runs on the **Edge runtime and cannot use Prisma** — it only checks cookie *existence* for `/dashboard`, `/settings`, `/lists`, `/admin`, and rewrites `/@username` → `/user/username`. Real session validation happens in page/route components. Admin checks use the `Administrator` table (`isAdministrator()`); these are wrapped in try/catch for `P2021`/`P2022` so a missing column/table degrades gracefully rather than 500ing.

## Subscription gating (free vs subscriber)

Two tiers via `User.customerStatus`, backed by Stripe (`stripeCustomerId`, `lib/subscription/`). Gate subscriber-only actions with `isSubscriber(user.customerStatus)` from `lib/subscription/is-subscriber.ts` (true for `'subscriber'` or any `'subscriber:*'`), returning **403** for free users (e.g. creating lists/documents). E2E specs in `tests/e2e/api/` assert these boundaries — keep them passing.

## API route conventions

Routes live in `app/api/**/route.ts` (App Router handlers). The standard shape:

```ts
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  const user = await getCurrentUserOrSyncToken(request);   // or getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSubscriber(user.customerStatus)) return NextResponse.json({ error: "..." }, { status: 403 });
  // ... validate body, do work via lib/<feature>/queries.ts, return NextResponse.json
}
```

Business logic and Prisma queries belong in `lib/<feature>/queries.ts`, not inline in routes (lists, messages, follows, organizations, documents each have one). Ownership/IDOR checks are done with `where: { id, userId: user.id }` filters — preserve them. External-fetch code (link metadata, OAuth, image proxy) must use the SSRF guards in `lib/security/`.

## Dynamic Lists DSL

Lists have user-defined schemas described by a DSL (`DSL/` for docs/examples; `lib/lists/dsl-*.ts` for the implementation). Flow: `validateDSLSchema` → `parseDSLSchema` turns DSL into `ListProperty` rows; `dsl-validator.ts` drives form rendering, conditional field visibility (9 operators), and row validation. A list's schema is stored as properties; row data is JSONB in `ListDataRow.rowData`. Lists also support parent/child hierarchy (circular-ref checked), soft deletes (`deletedAt`), public/private, watchers/roles (`ListWatcher`: watcher/collaborator/manager), and a `source: "github"` mode backed by `ListGitHubIssueCache`.

## Cross-posting

A message can fan out to Bluesky, Mastodon, LinkedIn, and X/Twitter. Each platform has `lib/<platform>/post-status.ts`; linked accounts are `LinkedIdentity` rows (provider-specific data in `providerData`). Scheduled posts store `scheduledAt` + `scheduledCrossPostConfig` and are published by the `publish-scheduled-messages` cron (runs every minute). `lib/crosspost/text-splitter.ts` handles per-platform character limits / threading.

LinkedIn has the most complex target model (`lib/linkedin/`): a personal profile, **org pages** shared at the organization level (`OrgLinkedInCredential`/`OrgLinkedInPage`, assignable to members), and **personal company pages** (`LinkedInPersonalPage`). The user's default target is a `LinkedInPostingTargetPreference`; resolve via `resolveLinkedInTarget` and treat malformed stored targets as "no explicit target" so they never block publishing.

## Other subsystems (where things live)

- **Digs & pushes** — `MessageDig` (likes; `digCount`) and message "pushes" (re-shares via `pushedMessageId`/`pushCount`). `app/api/messages/[id]/dig`.
- **Notifications** — in-app `UserNotification` (`app/api/notifications/*`, `lib/notifications/`) with per-user `notificationPreferences`; iOS push via APNs + `DeviceToken` (`lib/push/`, `app/api/push/*`).
- **Analytics** — first-party `AnalyticsEvent` via `lib/analytics/track.ts` → `/api/analytics/ingest` (gated by `ANALYTICS_ENABLED`); admin views under `/admin/analytics`.
- **User secrets** — user-supplied OpenAI/Anthropic API keys are encrypted at rest with AES-256-GCM via `lib/crypto/` when `SECRETS_ENCRYPTION_KEY` is set (unset = legacy plaintext). Encrypt on write, decrypt on read through those helpers — never store raw.
- **GitHub-backed lists** — `lib/github/` + `lib/lists/github-list-adapter.ts`; a `source: "github"` list mirrors repo issues into `ListGitHubIssueCache`.

## Cron jobs

Defined in `vercel.json`, implemented under `app/api/cron/`:
- `publish-scheduled-messages` — every minute; publishes due scheduled messages and runs their cross-posts.
- `sync-github-lists` — hourly; refreshes GitHub-backed lists.

Both fail **closed** (401 without a valid `CRON_SECRET`).

## Build & CI notes

- `next.config.js` sets `eslint.ignoreDuringBuilds: true` but `typescript.ignoreBuildErrors: false` — **TypeScript errors fail the build; lint errors do not.** Always keep `npx tsc`/types clean; run `npm run lint` yourself since the build won't.
- Security headers (CSP, HSTS, X-Frame-Options DENY, etc.) are set globally in `next.config.js`. The CSP allows `unsafe-inline`/`unsafe-eval` for scripts (Next bootstrap + UI libs) — tightening is tracked separately.
- Vercel build runs `vercel-build`: `prisma generate && node scripts/migrate-deploy.js && next build` — migrations apply automatically on deploy.
- Styling is the DarkOne SCSS theme (`styles/darkone/`) + Bootstrap 5; React components in `components/` grouped by feature.

## Specialized agents & skills

This repo ships project agents (`.claude/agents/`) and matching skills (`.claude/skills/`): **db-migrations** (all schema work — see above), **nextjs-developer** (feature implementation), **unit-testing** (Vitest), **e2e-testing** (Playwright), **docs-api/docs-user/docs-devops** (generate `docs/*.md`), and **blog-writer**. Prefer routing work to the matching agent.
