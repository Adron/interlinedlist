# InterlinedList — repo recap & next steps to increase value

_Written 2026-06-27 by direct source inspection. For exhaustive detail this defers to the two existing analyses in the repo:_
- `feature-evaluation.md` — what ships vs. what's partial (dated 2026-06-24).
- `security-evaluation-coverage.md` — the white-box + black-box security review (C1/H1–H3/M1–M4).

This document is the **prioritized "what next"** layer on top of those.

---

## 1. What this repo is

A **Next.js 14 (App Router) time-series micro-blogging + syndication platform**, PostgreSQL via Prisma 5, deployed on Vercel (Node 20.19). It is large and substantially feature-complete.

**By the numbers (today):**

| Dimension | Count |
|---|---|
| API route handlers (`app/api/**/route.ts`) | 137 |
| `lib/` modules | 133 |
| Prisma models | 28 |
| Migrations | 56 |
| Unit test files (`*.test.ts`, Vitest) | 50 |
| E2E specs (Playwright) | 31 |

**Core capabilities that actually ship:**

- **Auth**: email/password (bcrypt), DB-backed sessions with multi-account switching (cookie = comma-separated **session IDs**, never userId — that fallback was the C1 account-takeover and must never return), email verification / password reset / email-change re-verification, CLI/mobile **sync tokens** (sha256-hashed), cron-secret auth.
- **Cross-posting** to **Bluesky, Mastodon, LinkedIn, and X/Twitter** with automatic threading on char limits, media distribution, reply-threading and delete-propagation to external platforms. LinkedIn has the deepest target model (personal profile, org pages, personal company pages) resolved via `resolveLinkedInTarget`.
- **Structured Lists** with a user-defined **DSL** (typed properties, 9 conditional-visibility operators), JSONB row data, parent/child hierarchy (circular-ref checked), soft deletes, public/private, watcher/collaborator/manager roles, list-to-list graph + ERD view, and a `source: "github"` mode mirroring repo issues (`ListGitHubIssueCache`, hourly cron).
- **Long-form documents** (Markdown, folders, templates, content-hash tracking, server-side sync via `app/api/documents/sync`).
- **Organizations**, a **follow graph**, **digs** (likes) and **pushes** (re-shares), **scheduled posts** (per-minute publish cron), **in-app notifications + APNs push** (`DeviceToken`), first-party **analytics** (`AnalyticsEvent`), and a **Stripe subscriber tier** (`isSubscriber` → 403 gate for free users).
- **Encrypted user secrets** (user OpenAI/Anthropic keys, AES-256-GCM via `lib/crypto/` when `SECRETS_ENCRYPTION_KEY` is set).
- A companion **`il-sync` CLI** — source no longer in-repo; only prebuilt binaries under `public/downloads/`. Server side of sync remains.

**Recent trajectory** (git log): the last several commits are a focused **security-hardening push** — C1 auth-bypass fix, H1 cron fail-open, H3 aggregates data exposure, SSRF guards, security headers, rate limiting, secret handling, "stabilizing the build."

---

## 2. Health signals

**Strong:**
- Clear layering — business logic in `lib/<feature>/queries.ts`, routes thin, IDOR checks via `where: { id, userId }`.
- Disciplined, additive-only migration workflow with safety scripts (`safe-migrate.js`).
- Real, source-generated docs (`npm run docs:all` → `docs/*.md` + `openapi.json`) and dedicated docs agents.
- Security boundary tests exist as e2e specs (`tests/e2e/api/*` assert auth/IDOR/subscription).
- The recent security findings were largely remediated *carefully* (verified below), not just papered over.

**Watch items:**
- **No CI.** `.github/` has only issue templates — no workflow runs lint/`tsc`/tests on PRs. The security boundary specs only protect you when run manually.
- **Test ratio.** 50 unit + 31 e2e against 137 routes / 133 lib modules / 28 models — meaningful coverage, but plenty of surface is untested.
- **Lint doesn't gate the build** (`next.config.js`); only `tsc` does. Easy for lint debt to accumulate.

---

## 3. Next steps, prioritized

### Tier 1 — Close out the security review (highest value, lowest cost)

The hardening push is real, but a few `security-evaluation-coverage.md` items deserve an explicit verdict. I checked the current source:

- **M3 — `/api/test-db` (was: discloses DB status + `userCount`).** ✅ *Effectively fixed.* The route now runs `SELECT 1` and returns only `{ status: 'ok' | 'error' }` — no counts, no error details. **Recommendation:** still consider deleting it or gating it behind the cron/health secret; an unauthenticated reachability probe is low-risk but unnecessary public surface.
- **M2 — Rate limiting.** ⚠️ *Implemented but not production-grade.* `lib/security/rate-limit.ts` is an **in-process, per-instance** fixed-window limiter with an explicit code comment: on Vercel serverless it's best-effort and "not a substitute for a shared store." **Recommendation:** back it with **Vercel KV / Upstash Redis** behind the existing interface so limits actually hold across serverless instances. This is the single most impactful remaining security item.
- **M4 — Secrets at rest.** Partially addressed: `lib/crypto/secrets.ts` does AES-256-GCM **only when `SECRETS_ENCRYPTION_KEY` is set** (unset = legacy plaintext). **Recommendation:** make the key required in production, write a one-time migration to encrypt any legacy plaintext rows, and audit that no endpoint (e.g. `/api/user`) returns decrypted keys to the browser.
- **H3 — `architecture-aggregates`.** The route still exists (`app/api/architecture-aggregates/[table]`). **Recommendation:** confirm it's admin-gated and that it can never select sensitive columns (`passwordHash`, reset/verification tokens, API keys) — column allowlist, not table-level.
- **CSP.** `next.config.js` still allows `unsafe-inline`/`unsafe-eval` for scripts (acknowledged/tracked). **Recommendation:** move toward nonce-based CSP; it's the largest remaining header gap.
- **Regression lock-in.** Add an explicit e2e/unit test that asserts the **C1 path stays closed** (a cookie containing a userId must never mint a session). This is the one bug you most cannot afford to reintroduce.

### Tier 2 — Reliability & delivery

- **Add GitHub Actions CI.** Run `npm run lint`, `npx tsc --noEmit`, and `npm run test` on every PR; run Playwright e2e (`tests/e2e/api/*` especially) nightly or on `main` since it needs a DB + dev server. This is the highest-leverage *non-security* change — it makes the boundary specs continuously protective.
- **Error tracking / observability.** No Sentry-equivalent is wired in. For a 137-route app handling billing, OAuth, and cross-posting to four external APIs, server-side error capture + alerting is overdue. Add structured logging around the cross-post fan-out and the publish cron specifically.
- **Cross-post resilience.** The per-minute publish cron and four-platform fan-out are the failure-prone hot path (external rate limits, token expiry, partial-success). Verify: retry/backoff, idempotency (no double-posts on cron overlap), and per-platform failure isolation so one dead provider doesn't block the others. Surface failures to the user, not just logs.

### Tier 3 — Test & quality depth

- **Expand boundary coverage** to the routes added since the last test pass — every new `app/api/**` handler should get an auth + IDOR + (where relevant) subscription-403 assertion, matching the existing `tests/e2e/api/*` pattern.
- **DSL hardening.** The lists DSL is the most complex pure-logic surface (`lib/lists/dsl-*.ts`, 9 operators, conditional visibility). It's ideal for Vitest property/edge-case tests — malformed schemas, circular parent/child refs, operator combinations.
- **Coverage reporting** in CI (`vitest --coverage`) so gaps are visible rather than guessed.

### Tier 4 — Product value & growth

Pull the specifics from `feature-evaluation.md` §"missing/partial," but the themes that most increase user-facing value:

- **Finish partially-wired features** before adding new ones — a half-connected integration is worse than none for trust.
- **Onboarding & activation.** A platform this capable has a steep first-run; a guided "connect an account → post → cross-post → make a list" flow converts the breadth into perceived value.
- **Reliability as a feature.** For a cross-posting tool, "it always posts, to every platform, exactly once" *is* the product. Investment in Tier 2 cross-post resilience is also product investment.
- **CLI provenance.** The `il-sync` source left the repo; only binaries remain under `public/downloads/`. Document the build/signing provenance — a binary users run with their sync token needs a verifiable supply chain.

### Tier 5 — Scaling & performance

- **List query performance.** Row data is JSONB in `ListDataRow.rowData`; watch for N+1s and unindexed filters as lists grow. Confirm pagination on list/message/feed endpoints and add GIN indexes where DSL queries filter JSONB.
- **Follow-graph & feed fan-out.** As the follow graph grows, feed assembly is the classic scaling cliff — measure before it bites.

---

## 4. Suggested sequencing

1. **This week:** durable rate-limit store (M2), C1 regression test, CI workflow. _(security + safety net, ~2–3 days)_
2. **Next:** Sentry/observability + cross-post retry/idempotency hardening. _(reliability of the core product loop)_
3. **Then:** required secrets encryption + legacy-data migration (M4), CSP tightening, expanded boundary/DSL tests.
4. **Ongoing:** onboarding flow, finish partially-wired features (per `feature-evaluation.md`), perf indexing as data grows.

The repo is in good shape and clearly maturing. The biggest value unlock right now is **continuous enforcement** (CI + durable rate limiting + error tracking) so the strong security and structure you've built keeps holding as the surface area grows.
