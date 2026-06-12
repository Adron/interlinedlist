# Documentation & Testing Plan — InterlinedList

Generated 2026-06-11 from a three-agent documentation review (docs-api, docs-devops, docs-user) of the current `main` branch (HEAD `73e2244`). Part 1 captures the findings and the prompts to launch each docs agent to execute the updates. Part 2 is the follow-on plan: prompts to launch the e2e-testing and unit-testing agents to audit coverage and add tests.

---

## Part 1 — Documentation updates

### 1A. API Reference (`docs/api-reference.md`) — findings

Doc exists (2,703 lines, last updated 2026-06-05). All documented endpoints still exist; the gaps are additions and drift.

**Priority 1 — LinkedIn org page cross-posting (commit `a562791`, entirely undocumented):**
- Missing endpoints: `GET /api/auth/linkedin/org-authorize`, `GET /api/auth/linkedin/org-callback`, `GET /api/organizations/:id/linkedin/status`, `PUT /api/organizations/:id/linkedin/assignments`, `DELETE /api/organizations/:id/linkedin/credential`, `POST /api/organizations/:id/linkedin/sync-pages`
- Drift: `POST /api/messages` `crossPostToLinkedIn` semantics changed — `lib/linkedin/resolve-linkedin-target.ts` now resolves an active `OrgLinkedInPage` assignment first (posts as `urn:li:organization:<pageId>`), falling back to personal LinkedIn. Same resolution applies to `GET /api/cron/publish-scheduled-messages` (`route.ts:149-153`).

**Priority 2 — ~40 missing endpoint/method entries:**
- Follow: `POST /api/follow/:userId/approve|reject`, `DELETE .../remove`, `GET .../counts|followers|following|mutual`
- Messages: `POST`/`DELETE /api/messages/:id/dig`, `POST /api/messages/:id/metadata`
- Lists: `POST /api/lists/:id/refresh`, `GET /api/lists/search`, watcher routes (`GET .../watchers/me|users`, `PUT`/`DELETE .../watchers/:userId`), `DELETE /api/lists/connections/:id`
- Organizations: `PUT`/`DELETE /api/organizations/:id/members/:userId`, `GET /api/organizations/:id/users`
- Notifications: `DELETE /api/notifications/:id`
- Documents: `POST /api/documents/templates/seed-defaults`
- GitHub: `PATCH /api/github/issues/:owner/:repo/:number`, `POST .../comments`, `GET .../assignees|labels|next-issue-number`
- Admin (entire group absent): users CRUD, password reset, bulk-clearance/delete/status, email-logs
- Utility: `POST /api/analytics/ingest`, `GET /api/images/proxy`, `GET /api/weather`, `GET /api/oauth/client-metadata`, `GET /api/architecture-aggregates/:table|/schema` (document or explicitly mark excluded; flag `GET /api/test-db` as dev-only)

**Priority 3 — stale content:**
- OAuth Provider Flows table (~line 2663): add LinkedIn org authorize/callback pair and `/api/oauth/client-metadata`
- Document the cross-post failure shape `{ providerId, instanceName, success: false, error, errorCode, statusCode }` (`app/api/messages/route.ts:318`) — examples currently show success only
- Consider relocating the "Branding & Style Guide" section (lines 450–644) out of the endpoint reference

#### Launch prompt — docs-api agent

> Update docs/api-reference.md in /Users/adron/Codez/interlinedlist. Work from this prioritized punch list (verified against code at HEAD 73e2244):
> 1. Add the LinkedIn org cross-posting endpoint group: GET /api/auth/linkedin/org-authorize (requires organizationId query param, admin/owner role check), GET /api/auth/linkedin/org-callback, GET /api/organizations/:id/linkedin/status, PUT /api/organizations/:id/linkedin/assignments, DELETE /api/organizations/:id/linkedin/credential, POST /api/organizations/:id/linkedin/sync-pages. Read the route handlers under app/api/auth/linkedin/ and app/api/organizations/[id]/linkedin/ for exact request/response shapes.
> 2. Fix the crossPostToLinkedIn description on POST /api/messages (~line 726): per lib/linkedin/resolve-linkedin-target.ts, an active OrgLinkedInPage assignment takes precedence (posts as urn:li:organization:<pageId>), falling back to the personal LinkedIn identity. Add the same note to GET /api/cron/publish-scheduled-messages.
> 3. Add missing endpoints for follow (approve/reject/remove/counts/followers/following/mutual), messages (dig, metadata), lists (refresh, search, watchers, connections delete), organizations (member PUT/DELETE, users), notifications (DELETE :id), documents (templates/seed-defaults), and GitHub (issue PATCH, comments, assignees, labels, next-issue-number). Read each handler for shapes.
> 4. Add an Admin section (mark admin-only): /api/admin/users CRUD, password, bulk-clearance, bulk-delete, bulk-status, /api/admin/email-logs.
> 5. Add or explicitly exclude utility routes: /api/analytics/ingest, /api/images/proxy, /api/weather, /api/oauth/client-metadata (add to OAuth Provider Flows table), /api/architecture-aggregates/:table and /schema; flag /api/test-db as dev-only.
> 6. Update the OAuth Provider Flows table with the LinkedIn org authorize/callback pair.
> 7. Document the crossPostResults failure entry shape { providerId, instanceName, success: false, error, errorCode, statusCode } (see app/api/messages/route.ts:318).
> Do not remove any existing accurate content. Verify every shape against the actual handler before documenting it.

---

### 1B. Operational docs (`docs/operational.md`) — findings

Doc exists but is ~90% a Twitter/X deep-dive plus search/ILIKE notes. The Twitter section is accurate and should be kept, restructured as one provider subsection. Nearly the entire operational surface is missing.

**P1 — missing sections:**
1. Env-var table — code reads ~45 vars; doc covers only Twitter's. Missing: `DATABASE_URL`, `CRON_SECRET`, `LINKEDIN_*` (incl. new `LINKEDIN_ORG_REDIRECT_URI`), `BLUESKY_CLIENT_ID`, `GITHUB_*`, `STRIPE_*` (8 vars), `RESEND_*`, `APNS_*` (5 vars), `BLOB_READ_WRITE_TOKEN`, `SESSION_*`, `APP_*`, `ANALYTICS_ENABLED`, `SKIP_DB_MIGRATE`, `TEST_USER_*`/`TEST_SUBSCRIBER_*`
2. Database/migration workflow — `npm run db:migrate` (`scripts/safe-migrate.js`), `db:migrate:deploy` (`scripts/migrate-deploy.js`), `db:migrate:diagnose`, additive-only policy, `npm run backup`/`restore` — highest-risk gap
3. Deployment — `vercel-build` (`prisma generate && node scripts/migrate-deploy.js && next build`), `SKIP_DB_MIGRATE` escape hatch, `vercel.json`, `scripts/deploy-all-production.js`
4. Cron — `vercel.json` defines `/api/cron/publish-scheduled-messages` (`* * * * *`) and `/api/cron/sync-github-lists` (`0 * * * *`), both gated by `CRON_SECRET`
5. Non-Twitter OAuth providers — `lib/auth/oauth-linkedin.ts`, `oauth-bluesky.ts` (+ stores), `oauth-mastodon.ts`, `oauth-github.ts` all undocumented
6. Third-party services — APNS (`lib/push/apns.ts`), Resend (`lib/email/resend.ts`, `/api/webhooks/resend`), Stripe (`/api/webhooks/stripe`; link existing `docs/stripe-setup.md`), Vercel Blob (`lib/blob.ts`)
7. Local dev setup — clone, `.env.example`, `scripts/setup-database.sh`, seeding scripts, `npm run dev`

**P2 — recent commits:**
- LinkedIn org cross-posting: new env var `LINKEDIN_ORG_REDIRECT_URI`, org scope set `openid profile email w_member_social rw_organization_admin`, org-callback redirect URI must be registered in the LinkedIn Developer Portal. **`LINKEDIN_ORG_REDIRECT_URI` is also missing from `.env.example`** — fix both.
- Bluesky OAuth: `duplex: 'half'` fetch fix (`lib/auth/oauth-bluesky.ts`) warrants a Node-runtime troubleshooting note; Bluesky setup (`BLUESKY_CLIENT_ID` as client-metadata URL) undocumented.

**P3 — `.env.example` drift:**
- Stale/unused vars to drop or not propagate: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `JWT_*` (4 vars), `STRIPE_PUBLISHABLE_KEY`
- Used in code but absent: `CRON_SECRET`, `LINKEDIN_ORG_REDIRECT_URI`, `SESSION_MAX_AGE`, `SESSION_COOKIE_NAME`, `APP_NAME`, `APP_USER_AGENT`, `APP_CONTACT_EMAIL`, `ANALYTICS_ENABLED`, `SKIP_DB_MIGRATE`
- `.env.example` references `documentation/mobile-client-setup.md`; actual path is `docs/mobile-client-setup.md`

**P4:** Move the "Search Endpoints" request/response content to `docs/api-reference.md`; keep ILIKE/index guidance as runbook material.

#### Launch prompt — docs-devops agent

> Rewrite/expand docs/operational.md in /Users/adron/Codez/interlinedlist into a full operational reference. Preserve the existing Twitter/X section (it is accurate) but restructure it as one provider subsection under a broader OAuth chapter. Add, verified against code at HEAD 73e2244:
> 1. A complete environment-variable table (~45 vars) built from actual process.env usage in lib/, app/, scripts/, middleware.ts — including DATABASE_URL, CRON_SECRET, LINKEDIN_CLIENT_ID/SECRET, LINKEDIN_REDIRECT_URI, LINKEDIN_ORG_REDIRECT_URI, BLUESKY_CLIENT_ID, GITHUB_CLIENT_ID/SECRET, all STRIPE_* and NEXT_PUBLIC_STRIPE_* vars, RESEND_*, APNS_* (5 vars), BLOB_READ_WRITE_TOKEN, SESSION_MAX_AGE, SESSION_COOKIE_NAME, APP_NAME, APP_USER_AGENT, APP_CONTACT_EMAIL, ANALYTICS_ENABLED, SKIP_DB_MIGRATE, TEST_USER_*/TEST_SUBSCRIBER_*. Do NOT document the stale vars in .env.example that no code reads (NEXTAUTH_*, JWT_*, STRIPE_PUBLISHABLE_KEY).
> 2. Database & migrations section: npm run db:migrate (scripts/safe-migrate.js), db:migrate:deploy (scripts/migrate-deploy.js), db:migrate:diagnose, the additive-only migration policy, and npm run backup/restore.
> 3. Deployment section: vercel-build script, SKIP_DB_MIGRATE escape hatch, vercel.json, scripts/deploy-all-production.js.
> 4. Cron section: the two vercel.json crons (publish-scheduled-messages every minute, sync-github-lists hourly), CRON_SECRET gating.
> 5. OAuth provider chapters for LinkedIn (member AND org flows — org scopes openid profile email w_member_social rw_organization_admin, LINKEDIN_ORG_REDIRECT_URI portal registration), Bluesky (client-metadata URL setup plus a troubleshooting note on the duplex:'half' streaming-body fetch requirement), Mastodon, GitHub.
> 6. Third-party services: APNS (lib/push/apns.ts), Resend (lib/email/resend.ts, webhook verification, /api/webhooks/resend), Stripe (webhook events handled in /api/webhooks/stripe; link docs/stripe-setup.md), Vercel Blob (lib/blob.ts).
> 7. Local dev setup: clone, env file, scripts/setup-database.sh, seed scripts (seed-initial-data.js, seed-test-users.ts, npm run test-data:seed), npm run dev.
> 8. Also fix .env.example: add CRON_SECRET, LINKEDIN_ORG_REDIRECT_URI, SESSION_MAX_AGE, SESSION_COOKIE_NAME, APP_NAME, APP_USER_AGENT, APP_CONTACT_EMAIL, ANALYTICS_ENABLED, SKIP_DB_MIGRATE; remove unused NEXTAUTH_*/JWT_*/STRIPE_PUBLISHABLE_KEY entries; correct the documentation/mobile-client-setup.md references to docs/mobile-client-setup.md.
> 9. Move the Search Endpoints request/response content toward docs/api-reference.md (or flag it for the docs-api agent); keep ILIKE/index performance guidance.

---

### 1C. User guide (`docs/user-guide.md`) — findings

Guide exists (752 lines), solid on posting, Twitter/X, lists, documents, branding.

**Missing features (priority order):**
1. LinkedIn org page cross-posting — `app/organizations/[slug]/linkedin/page.tsx`, `components/organizations/OrgLinkedInSettings.tsx`; an active org page assignment **overrides** personal LinkedIn cross-posting (changes existing "Cross-Posting to LinkedIn" section behavior); setup, assignment, disconnect-fallback all need coverage
2. Replies, threads, and Dig — `ReplyInput.tsx`, `MessageReplies.tsx`, `MessageThreadView.tsx` (`app/message/[id]/thread/`), `MessageDigButton.tsx` — zero coverage
3. Dashboard (`app/dashboard/page.tsx`) and the scheduled-posts page (`app/dashboard/scheduled/page.tsx`) where users actually edit/cancel scheduled posts
4. People page (`app/people/page.tsx`) — discovery entry point
5. Document templates (`NewFromTemplateButton.tsx`, seed defaults)
6. Follows export — Exports covers 4 data types (messages, lists, list rows, follows); guide lists only 2
7. Location features — Location Permission, Profile Location, `LocationWidget`/`WeatherWidget`, Clock page
8. Help Center (13 topics in `lib/help-config.ts`), Blog, Pricing page, Architecture Aggregates
9. Products dropdown (one-liner; items are "Coming Soon")

**Drift / accuracy:**
1. "Settings > Connected Accounts" is wrong in ~10 places — connected accounts live on the **Integrations** page (`app/integrations/`)
2. Exports location: actual page is `/exports`, reached from Dashboard, not "Settings > Export"
3. Subscription tiers diverge from `app/pricing/page.tsx` — Subscriber tier includes organizations (gated by `isSubscriber`) and longer posts; guide omits both, plus annual plan and cancellation behavior
4. Quote/Push: verify "Pushed posts are always public" against current `MessageInput.tsx`; explain where the Push button lives

**Thin sections:** Organizations (roles, member management, LinkedIn page), Lists (watchers, connections, row editing, public list view, DSL, templates), Notifications (mark-all-read, `/notifications` page vs bell tray), Following (follower/following pages, People page).

#### Launch prompt — docs-user agent

> Update docs/user-guide.md in /Users/adron/Codez/interlinedlist. Verified punch list (HEAD 73e2244); confirm each behavior in code/UI before writing — no fabricated claims:
> 1. Fix "Settings > Connected Accounts" everywhere (~10 occurrences): connected accounts live on the Integrations page (app/integrations/), linked from Settings.
> 2. Add a LinkedIn organization pages section: org owner/admin connects LinkedIn at /organizations/[slug]/linkedin, syncs Company Pages, assigns members; an active assignment overrides the member's personal LinkedIn so their cross-posts go to the company page; disconnecting falls back to personal LinkedIn. Update the existing "Cross-Posting to LinkedIn" section to mention this override.
> 3. Add Replies & Threads (ReplyInput, MessageReplies, thread view at /message/[id]/thread) and the Dig reaction (MessageDigButton, dig/un-dig with counts).
> 4. Add a Dashboard section (tiles: Scheduled, Exports, Settings, Architecture Aggregates) and point scheduling instructions at /dashboard/scheduled for editing/canceling.
> 5. Fix Exports: page lives at /exports via Dashboard; four export types (messages, lists, list data rows, follows).
> 6. Align the Subscriptions section with app/pricing/page.tsx: Free vs Subscriber feature split (Subscriber adds lists, documents/folders, organizations, longer posts, priority support), annual plan, public Pricing page, cancellation behavior (existing lists/documents stay readable). Note organization creation is Subscriber-only.
> 7. Add: People page (/people) for discovery; document templates (New from Template, Templates folder, seed defaults); location features (Location Permission, Profile Location, location/weather widgets, Clock page); Help Center, Blog, Pricing in a "Other pages" section; one-liner on the Products dropdown (items Coming Soon).
> 8. Expand thin sections: Organizations (creation Subscriber-only, roles owner/admin/member, member management, LinkedIn page), Lists (watchers, list connections, row editing, public list view at /user/[username]/lists/[id], templates), Notifications (mark-all-read, /notifications page vs bell tray), Following (followers/following pages, People page entry point).
> 9. Verify the Quote/Push claim "Pushed posts are always public" against MessageInput.tsx and correct or keep as appropriate; describe where the Push button is found.

---

## Part 2 — Testing review (follow-on)

After (or in parallel with) the documentation updates, launch the two testing agents below to audit coverage. They should first REVIEW what is and isn't tested, report gaps, then add the highest-value tests. The documentation findings above point at the riskiest untested surfaces: LinkedIn org target resolution, cross-post result shapes, follow sub-routes, list watchers, admin routes, and the scheduled-publish cron path.

#### Launch prompt — unit-testing agent

> In /Users/adron/Codez/interlinedlist, audit Vitest unit-test coverage, then add high-value tests. Phase 1 (review): inventory existing unit tests (tests/ or __tests__/, *.test.ts) and map them against pure logic in lib/ — validators, parsers, and resolvers. Report what is covered and what isn't. Phase 2 (write): prioritize tests for (a) lib/linkedin/resolve-linkedin-target.ts — org page assignment precedence over personal LinkedIn, fallback when no active assignment, urn:li:organization formatting; (b) cross-post result construction in app/api/messages handling — failure entries carrying { providerId, instanceName, success: false, error, errorCode, statusCode }; (c) lib/auth/oauth-linkedin.ts scope selection (member vs org scope sets); (d) any untested validators/parsers found in Phase 1 (e.g., lib/lists/dsl-*). Run npm run test and report pass/fail results. Do not touch the database or write integration tests — pure logic only.

#### Launch prompt — e2e-testing agent

> In /Users/adron/Codez/interlinedlist, audit Playwright e2e coverage, then add regression tests for under-covered critical paths. Phase 1 (review): inventory existing Playwright specs and map them against the critical user flows: login/session, posting (incl. cross-post toggles), scheduling (create/edit/cancel at /dashboard/scheduled), replies/threads/Dig, lists (create, rows, watchers), documents (incl. New from Template), organizations (create — Subscriber-gated, members, LinkedIn org settings page at /organizations/[slug]/linkedin), following (follow/approve/reject, People page), notifications (bell tray, mark-all-read), Integrations page connect/disconnect entry points, exports (/exports, four types), and pricing/subscription gating. Report covered vs uncovered. Phase 2 (write): add specs for the highest-risk uncovered flows, prioritizing (a) the LinkedIn org settings UI (recently added — page load, role gating, assignment UI rendering), (b) the Integrations page (recently the source of doc drift), (c) scheduled-post edit/cancel, (d) Dig and reply flows. Use existing test-user seeding (TEST_USER_*/TEST_SUBSCRIBER_* env vars, scripts/seed-test-users.ts). Run the suite and report results; note any flows that can't be tested e2e (e.g., real OAuth handshakes) and how the specs stub or skip them.

### Suggested execution order

1. docs-devops agent (also fixes `.env.example`) — independent
2. docs-api agent — independent
3. docs-user agent — independent (the three can run in parallel)
4. unit-testing agent — after code review of Part 1 confirms no code changes are needed
5. e2e-testing agent — last; needs a running dev server and seeded test users
