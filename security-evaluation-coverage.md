# Security Evaluation — InterlinedList

**Target (code):** `/Users/adron/Codez/interlinedlist` (Next.js 14 App Router, Prisma/PostgreSQL, Vercel)
**Target (live):** https://interlinedlist.com
**Date:** 2026-06-24
**Assessor:** Automated security review (Claude Code), authorized by the project owner
**Type:** White-box static review of the codebase + non-destructive black-box probing of the production deployment

> **Authorization & safety note.** All live testing was non-destructive and limited to the owner's own property. No third-party accounts were accessed and no user data was read or modified. One authenticated-by-design behavior (`/api/cron/publish-scheduled-messages`) was triggered once to confirm an access-control finding; because the same job runs every minute by schedule, the only effect was publishing messages that were already due. The marquee authentication-bypass finding (C1) was confirmed by code analysis and corroborated by negative-case live probes; the positive exploit was **not** run against real accounts — see C1 for a safe reproduction the owner can run.

---

## 1. Executive summary

InterlinedList is a mature, feature-rich micro-blogging/cross-posting platform with **134 API routes**. The codebase shows many good security habits: consistent use of the Prisma query builder (no raw SQL / no SQL injection found), bcrypt password hashing, properly signature-verified Stripe and Resend webhooks, hashed CLI sync-tokens, anti-enumeration on password reset, and per-resource ownership checks on the large majority of routes.

However, the review found **one critical authentication-bypass that allows full account takeover of any user (including administrators)**, plus a confirmed **fail-open authorization** issue on production cron endpoints and several SSRF / sensitive-data-exposure / hardening gaps.

### Risk summary

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| **C1** | 🔴 Critical | Authentication bypass / account takeover via "legacy cookie migration" (cookie = userId → valid session minted) | Code-confirmed; live negative cases verified |
| **H1** | 🟠 High | Cron endpoints fail **open** when `CRON_SECRET` is unset — unauthenticated trigger of cross-posting & GitHub sync | **Confirmed live** (HTTP 200, no auth) |
| **H2** | 🟠 High | SSRF in avatar-from-URL and link-preview metadata fetcher (no IP allowlist, follows redirects) | Code-confirmed |
| **H3** | 🟠 High | `architecture-aggregates/users` returns full user rows incl. `passwordHash`, reset/verification tokens, and API keys to the client | Code-confirmed |
| **M1** | 🟡 Medium | Missing security headers (no CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy; HSTS incomplete) | **Confirmed live** |
| **M2** | 🟡 Medium | No rate limiting / brute-force protection anywhere (login, register, password reset, etc.) | Code-confirmed |
| **M3** | 🟡 Medium | Unauthenticated debug endpoint `/api/test-db` discloses DB status, user count, and error messages | **Confirmed live** (`userCount: 19`) |
| **M4** | 🟡 Medium | Plaintext secrets at rest (user OpenAI/Anthropic keys, OAuth tokens); API keys returned to browser via `/api/user` | Code-confirmed |
| **M5** | 🟡 Medium | Session-management hardening gaps (raw session IDs used as bearer tokens, no rotation on auth, 30-day sessions) | Code-confirmed |
| **L1** | 🔵 Low | SVG uploads stored & served from public blob (limited stored XSS); object-key path traversal via filename | Code-confirmed |
| **L2** | 🔵 Low | Middleware cookie-name mismatch (`session` vs `interlinedlist_session`) weakens edge route gating | Code-confirmed |
| **L3** | 🔵 Low | Weak password policy (8 chars, no complexity/breach check) | Code-confirmed |
| **L4** | 🔵 Low | Verbose error messages leak internals (`architecture-aggregates`, `test-db`) | Code-confirmed |
| **L5** | 🔵 Low | Image proxy follows redirects → SSRF if an allowed CDN has an open redirect | Code-confirmed |
| **L6** | ⚪ Info | No `security.txt`; `x-powered-by: Next.js` header disclosure | Confirmed live |

---

## 2. Critical findings

### C1 — Authentication bypass / full account takeover via "legacy cookie migration"  🔴 Critical

**Location:** `lib/auth/session.ts:166-176` (within `getCurrentUser()`)
**Affected:** Essentially every authenticated page and API route — `getCurrentUser()` (and its wrapper `getCurrentUserOrSyncToken()`) is the primary auth gate for the whole app.

**Description.**
The session cookie holds one or more comma-separated **session IDs**. `getCurrentUser()` looks each up as a session. If lookup fails and the cookie contains exactly one value, it falls into a "legacy migration" path that treats the value as a **user ID** and, if a matching user exists, **mints a brand-new valid session for that user and authenticates the request as them**:

```ts
// lib/auth/session.ts
if (!user && tokens.length === 1) {
  const legacyUser = await getUserWithFallbacks(tokens[0]);   // user.findUnique({ where: { id: tokens[0] } })
  if (legacyUser) {
    const newCookieValue = await createSession(legacyUser.id, []);  // real session created
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, newCookieValue, getSessionCookieOptions());
    user = legacyUser;
    return addIsAdministrator(user);   // request is now authenticated as the victim
  }
}
```

Both identifiers are the **same format** — `User.id` and `Session.id` are each `@default(uuid())` (`prisma/schema.prisma:11`, `:70`). So any value that is a valid user UUID satisfies the user lookup.

**Why this is exploitable.** User IDs are **not secret**. They are returned in API responses and embedded in routes throughout the app, e.g. the login response (`app/api/auth/login/route.ts:64`), follow endpoints (`/api/follow/[userId]/...`), and message-author objects. An attacker only needs to observe a single target user's UUID (trivial for any account they can see) and then:

```
Cookie: interlinedlist_session=<victim-user-uuid>
```

The next request is authenticated **as the victim**, and the server even sets a persistent real session cookie for the attacker — yielding durable account takeover, including of any account in the `administrators` table.

**Evidence.**
- Code path above is unambiguous.
- Live corroboration (safe negative cases): `GET /api/user` returns `HTTP 401` with no cookie and with a *random* UUID cookie (`11111111-2222-3333-4444-555555555555`) — exactly what the code predicts when the UUID matches **no** user. A UUID that *does* match a user would instead authenticate. The positive case was intentionally not run against real accounts.

**Safe reproduction for the owner (use a throwaway account):**
1. Register a test account; note its `user.id` from the login/register JSON response.
2. In a clean browser/`curl` jar with **no** session, send `GET /api/user` with `Cookie: interlinedlist_session=<that-user-id>`.
3. Observe HTTP 200 and the test user's profile returned — confirming a session was minted from a bare user ID.

**Impact.** Complete authentication bypass → takeover of any account (including admins) → read/modify all of a victim's data, post/cross-post as them, change email, delete account, and (via an admin account) reach admin functionality.

**Remediation.**
- **Remove the legacy-migration branch entirely.** Cookie values must only ever be validated as session IDs; never fall back to interpreting them as user IDs.
- If a one-time migration is genuinely required, gate it on a value that is cryptographically distinguishable from a session ID (e.g. a signed/HMAC'd legacy token) and time-box it.
- Defense in depth: use opaque, high-entropy session tokens that are **not** equal to any DB primary key (store a hash of the token, like the sync-token design already does in `lib/auth/sync-token.ts`).

---

## 3. High findings

### H1 — Cron endpoints fail **open** when `CRON_SECRET` is unset (confirmed live)  🟠 High

**Location:** `app/api/cron/publish-scheduled-messages/route.ts:24-31`, `app/api/cron/sync-github-lists/route.ts:14-21`

```ts
const cronSecret = process.env.CRON_SECRET;
if (cronSecret) {                       // <-- only checks auth IF the secret is set
  const authHeader = request.headers.get("authorization");
  const provided = authHeader?.replace(/^Bearer\s+/i, "") || request.headers.get("x-vercel-cron");
  if (provided !== cronSecret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
// ...runs regardless if CRON_SECRET is empty/undefined
```

The `.env.example` comment claims these routes "fail closed" without the secret — the code does the **opposite**.

**Confirmed live:** `GET https://interlinedlist.com/api/cron/publish-scheduled-messages` returned **HTTP 200** with **no** authorization header, i.e. `CRON_SECRET` is effectively not enforced in production.

**Impact.** Any unauthenticated party can:
- Trigger `publish-scheduled-messages` on demand — force-publishing users' scheduled posts and firing real cross-posts to Mastodon/Bluesky/LinkedIn/Twitter ahead of schedule.
- Trigger `sync-github-lists` repeatedly — driving GitHub API calls and DB writes for every GitHub-backed list (resource abuse / potential rate-limit exhaustion of stored GitHub credentials). *(Not triggered during this assessment to avoid side effects.)*

**Remediation.**
- **Fail closed:** if `CRON_SECRET` is missing, reject the request (`500`/`401`) instead of executing.
- Set `CRON_SECRET` (and/or rely on Vercel's `x-vercel-cron`/signed cron headers) in production and verify with a constant-time comparison.

---

### H2 — Server-Side Request Forgery (SSRF) in URL-fetching endpoints  🟠 High

**Locations:**
- `app/api/user/avatar/from-url/route.ts:31-34` — authenticated; fetches an arbitrary user-supplied URL.
- `lib/messages/metadata-fetcher.ts:18-25` (`isValidUrl`) — reachable via link previews on posted messages (e.g. `/api/messages/[id]/metadata`).

Both only validate the **protocol** (`http`/`https`) and apply **no host/IP allowlist or private-range blocking**, and `fetch()` follows redirects by default:

```ts
// metadata-fetcher.ts
function isValidUrl(url: string): boolean {
  const parsed = new URL(url);
  return parsed.protocol === 'http:' || parsed.protocol === 'https:';   // no SSRF guard
}
```

**Impact.** An authenticated attacker can make the server issue requests to internal addresses (`http://169.254.169.254/…` cloud metadata, `http://127.0.0.1`, RFC1918 hosts), enabling internal port/service discovery and, for the metadata fetcher, **exfiltration of internal HTTP responses** back through the returned `title`/`description`/`text` preview fields. The avatar endpoint requires the response to be `image/*`, which limits (but does not eliminate) blind SSRF and timing-based probing.

**Remediation.**
- Resolve the hostname and **reject private / link-local / loopback / metadata IP ranges** (both IPv4 and IPv6) *before* fetching, and re-validate on every redirect hop (or disable redirects with `redirect: 'manual'` and re-check each `Location`).
- Prefer an allowlist of expected providers where feasible (as the image proxy already does).
- Enforce timeouts (present) and maximum response sizes.

---

### H3 — Sensitive data exposure: full user rows (hashes, tokens, API keys) returned by the aggregates endpoint  🟠 High

**Location:** `app/api/architecture-aggregates/[table]/route.ts:50-58` (and the JSON serialization at `:285-309`)

The `users` branch calls `prisma.user.findMany({ take, skip, orderBy })` with **no `select`**, so every column is returned and serialized to the client — including `passwordHash`, `passwordResetToken`, `emailVerificationToken`, `emailChangeToken`, `openaiApiKey`, `anthropicApiKey`, and `stripeCustomerId`.

Access is gated to the **owner of the "The Public" organization**, so the audience is narrow. However: (1) password hashes and live secret tokens/keys should **never** leave the server; and (2) this chains directly with **C1** — an attacker who takes over that owner account can dump every user's hash and API keys.

**Remediation.** Apply an explicit `select` (or `omit`) excluding `passwordHash`, all `*Token` fields, and `*ApiKey` fields. Treat any "admin data browser" as a high-value surface and minimize columns.

---

## 4. Medium findings

### M1 — Missing HTTP security headers (confirmed live)  🟡 Medium

`next.config.js` defines no `headers()` and `vercel.json` sets none. Live response headers for `https://interlinedlist.com/` show:

- ✅ `strict-transport-security: max-age=63072000` — present, but **no `includeSubDomains`, no `preload`**.
- ❌ No `Content-Security-Policy` (primary defense against XSS/data-injection and clickjacking via `frame-ancestors`).
- ❌ No `X-Frame-Options` / CSP `frame-ancestors` → **clickjacking**.
- ❌ No `X-Content-Type-Options: nosniff` → MIME sniffing.
- ❌ No `Referrer-Policy`.
- ❌ No `Permissions-Policy`.
- ℹ️ `x-powered-by: Next.js` exposed (see L6).

**Remediation.** Add a `headers()` block in `next.config.js` (or `vercel.json`) setting a strict CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `frame-ancestors 'none'` (or `X-Frame-Options: DENY`), and extend HSTS with `includeSubDomains; preload`.

### M2 — No rate limiting / brute-force protection  🟡 Medium

A repository-wide search found **no** rate-limiting, throttling, or account-lockout logic. `app/api/auth/login/route.ts`, `register`, `forgot-password`, `reset-password`, `send-verification-email`, and the OAuth callbacks are all unthrottled.

**Impact.** Credential stuffing / password brute-forcing against `login`; password-reset and verification **email-bombing**; resource abuse. Login also has a minor user-enumeration timing side-channel (bcrypt runs only when the email exists — `login/route.ts:45-53`).

**Remediation.** Add IP- and account-keyed rate limiting (e.g. Vercel KV / Upstash Ratelimit or middleware) on all auth endpoints, with exponential backoff/lockout on repeated failures. Optionally normalize login timing.

### M3 — Unauthenticated debug endpoint discloses DB info (confirmed live)  🟡 Medium

`app/api/test-db/route.ts` is unauthenticated and returns DB connectivity plus the live user count, and on failure returns the raw `error.message`.

**Confirmed live:** `GET https://interlinedlist.com/api/test-db` → `{"success":true,"message":"Database connection successful","userCount":19}`.

**Remediation.** Remove this endpoint from production (or gate behind admin auth and strip error details). Treat it as a deploy-time smoke test only.

### M4 — Plaintext secrets at rest; API keys returned to the browser  🟡 Medium

- `User.openaiApiKey` / `User.anthropicApiKey` are stored as plain `String?` (`prisma/schema.prisma:40-41`); OAuth provider tokens are stored in `LinkedIdentity.providerData`.
- `GET /api/user` returns the full user object **including `openaiApiKey` and `anthropicApiKey`** to the browser (`app/api/user/route.ts:14`; fields selected in `lib/auth/session.ts:56-57` and `lib/auth/sync-token.ts:68-69`).

**Impact.** Any XSS, malicious extension, or shared-device cache can lift a user's third-party API keys; a DB compromise yields all keys/tokens in cleartext.

**Remediation.** Encrypt secrets at rest (envelope encryption / KMS). Never include `*ApiKey` (or OAuth tokens) in the `/api/user` payload; return only a boolean "is configured" flag and use the keys server-side only.

### M5 — Session-management hardening gaps  🟡 Medium

- The cookie value **is** the `Session.id` (a DB primary key) used directly as a bearer credential; a read-only DB leak immediately yields hijackable sessions.
- No session rotation on login/privilege change (session fixation hardening).
- 30-day (`SESSION_MAX_AGE=2592000`) sessions with no idle timeout and no server-side "logout everywhere" beyond the current cookie's tokens.

Cookie flags themselves are good: `httpOnly`, `secure` in production, `sameSite=lax` (`lib/auth/session.ts:137-145`).

**Remediation.** Store only a hash of a high-entropy random token (mirroring the sync-token design); rotate on authentication; add idle expiry; consider binding sessions to a device/UA fingerprint.

---

## 5. Low / informational findings

### L1 — SVG upload → public blob (limited stored XSS) + filename path traversal  🔵 Low
`app/api/documents/[id]/images/upload/route.ts:8,68-81` accepts SVG and stores the raw bytes with `content-type: image/svg+xml`, `access: 'public'`. SVGs can carry scripts; served from the Vercel blob origin (separate from `interlinedlist.com`), so direct-navigation script execution is confined to the blob domain rather than the app origin — but it still enables blob-hosted phishing/XSS shared across users. Separately, the storage key is built from the user-supplied filename (`originalName`, `:99-101`); only the extension is stripped, so `../` sequences pass into the object key (`documents/<uid>/<docId>/<basename>.svg`). **Remediation:** strip/reject SVG or sanitize it (e.g. DOMPurify/`svgo` server-side) and serve with `Content-Disposition: attachment` + `Content-Security-Policy: sandbox`; generate random object keys instead of using the client filename.

### L2 — Middleware cookie-name mismatch  🔵 Low
`middleware.ts:8` checks `request.cookies.get('session')`, but the configured cookie name is `SESSION_COOKIE_NAME` (`interlinedlist_session` per `.env.example`). If production uses the non-default name, the edge protected-route gate (`/dashboard`, `/settings`, `/lists`, `/admin`) never sees the cookie. Server components re-validate, so this is defense-in-depth only, but the check is currently unreliable. **Remediation:** import and use `SESSION_COOKIE_NAME` in middleware.

### L3 — Weak password policy  🔵 Low
`app/api/auth/register/route.ts:30` enforces only `length >= 8`; no complexity, length ceiling, or breached-password check. **Remediation:** raise minimums, add a breach check (e.g. HaveIBeenPwned k-anonymity), and add a server-side max length to bound bcrypt cost.

### L4 — Verbose error messages  🔵 Low
`architecture-aggregates/[table]/route.ts:313` returns `details: error.message`; `test-db` returns `error.message`. **Remediation:** log server-side, return generic messages to clients.

### L5 — Image proxy follows redirects  🔵 Low
`app/api/images/proxy/route.ts` has a solid host allowlist (Instagram/fbcdn) but the underlying `fetch()` follows redirects, so an open redirect on an allowed CDN could bounce to an internal target. **Remediation:** `redirect: 'manual'` and re-validate each hop against the allowlist.

### L6 — Information disclosure / hygiene  ⚪ Info
`x-powered-by: Next.js` is exposed; there is no `/.well-known/security.txt` (404). **Remediation:** set `poweredByHeader: false` in `next.config.js`; publish a `security.txt` with a disclosure contact.

---

## 6. Things done well (positive observations)

- **No SQL injection:** all data access uses the Prisma query builder; no `\$queryRawUnsafe`/`\$executeRawUnsafe`/raw SQL anywhere. The `architecture-aggregates/[table]` route maps `table` through a hardcoded `switch`, not string interpolation.
- **Webhooks verified:** Stripe (`stripe.webhooks.constructEvent`, `app/api/webhooks/stripe/route.ts:37`) and Resend (Svix signature, `app/api/webhooks/resend/route.ts:32`) both verify signatures and fail closed.
- **Password storage:** bcrypt (`lib/auth/password.ts`); hashes are not returned by the login/register selects.
- **CLI sync tokens:** stored as SHA-256 hashes of 32 random bytes, raw token shown once (`lib/auth/sync-token.ts`).
- **Anti-enumeration on password reset:** `forgot-password` always returns the same generic message (`app/api/auth/forgot-password/route.ts:34-41`).
- **Cryptographically secure tokens:** reset/verification tokens use `crypto.randomBytes(32)` with expirations (`lib/auth/tokens.ts`).
- **Per-resource ownership checks** are present and correct on the large majority of routes (lists, documents, folders, messages, notifications, organizations with role checks, exports, follows, user mutations). Admin routes use `checkAdminAndPublicOwner()`.
- **No user-controlled HTML sink:** the only `dangerouslySetInnerHTML` uses are a static theme bootstrap script (`app/layout.tsx`) and hardcoded marketing copy (`app/features/page.tsx`); markdown rendering runs without `rehype-raw`, so message/bio content is auto-escaped by React.
- **Cookie flags** are correct (`httpOnly`, `secure` in prod, `sameSite=lax`).
- **Secrets are not committed** — only `.env.example` is tracked; real `.env`/`.env.local` are git-ignored.

---

## 7. False positives investigated (and dismissed)

Surfaced during automated triage but **not** vulnerabilities after manual verification:

- **`/api/auth/remove-account` cross-user removal** — `removeSession(userId)` only deletes session tokens already present in the *caller's own* cookie, so a foreign `userId` is a no-op. Not exploitable.
- **`/api/analytics/ingest` userId spoofing** — `userId` is taken from the authenticated session (`getCurrentUser()`), not from the request body. (Endpoint is still unauthenticated for anonymous events / no rate limit — minor, folded into M2.)
- **`architecture-aggregates/[table]` SQL injection** — the dynamic `table` param only selects a hardcoded Prisma model via `switch`; unknown values return `400`.
- **Stripe webhook unverified** — it is verified; concern unfounded.

---

## 8. Methodology & coverage

**Static (white-box).** Reviewed authentication/session (`lib/auth/*`, `middleware.ts`), the Prisma schema, app/global config (`next.config.js`, `vercel.json`, `lib/config/app.ts`), and a representative + risk-prioritized set of the 134 API routes covering auth, admin, cron, webhooks, file uploads, SSRF-prone fetchers, analytics, and the aggregates/data-browse endpoints. Repository-wide greps were used for raw SQL, rate limiting, XSS sinks, and `fetch()` of user input.

**Dynamic (black-box, non-destructive) against production:**

| Probe | Result |
|-------|--------|
| `GET /` response headers | Missing CSP/XFO/nosniff/Referrer/Permissions; HSTS without `includeSubDomains` (M1) |
| `GET /api/test-db` | `200` — `{"userCount":19}` (M3) |
| `GET /api/user` (no cookie) | `401` (expected) |
| `GET /api/user` (random-UUID cookie, both cookie names) | `401` — corroborates C1 mechanism |
| `GET /api/cron/publish-scheduled-messages` (no auth) | **`200`** (H1) |
| `GET /api/analytics/ingest` | `405` (POST-only) |
| `GET /.well-known/security.txt` | `404` (L6) |

**Not exhaustively covered (recommended follow-ups):** per-route IDOR sweep of all 134 endpoints (only a prioritized subset verified by hand); private-account visibility enforcement on `users/[username]/messages` and `users/[username]/lists`; OAuth callback state/PKCE validation depth (`lib/auth/oauth-*`, partially covered by existing unit tests); `dependency` CVE audit (`npm audit`); mobile sync-token issuance flow; multi-tenant org permission edge cases.

---

## 9. Prioritized remediation plan

1. **Now (Critical):** Remove the legacy-cookie-migration branch in `lib/auth/session.ts` (C1). This is the single highest-impact fix.
2. **This week (High):** Make cron auth fail-closed and set `CRON_SECRET` in prod (H1); add SSRF guards to URL fetchers (H2); add a `select`/`omit` excluding secrets from the aggregates endpoint (H3).
3. **Soon (Medium):** Add security headers incl. CSP (M1); add rate limiting on auth endpoints (M2); remove/gate `/api/test-db` (M3); stop returning API keys to the client and encrypt secrets at rest (M4); harden session tokens/rotation (M5).
4. **Backlog (Low/Info):** Sanitize/sandbox SVG uploads and randomize blob keys (L1); fix middleware cookie name (L2); strengthen password policy (L3); generic error messages (L4); manual-redirect the image proxy (L5); `poweredByHeader: false` + publish `security.txt` (L6).

---

*Report generated for the project owner as an authorized security evaluation. C1's positive exploit and any DB/account-level confirmation were deliberately left for the owner to run in a controlled manner; offer available to perform a supervised live confirmation using a throwaway account on request.*
