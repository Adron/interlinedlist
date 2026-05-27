# Testing Punch List

**Date:** 2026-05-27  
**Branch:** feature/fixes-crossposting  
**Status snapshot:** 247 unit tests passing (12 files), 16 e2e specs across auth + API.

---

## Current State

### Unit tests (Vitest) — 12 files, 247 tests, all green

| File | Tests | What it covers |
|---|---|---|
| `lib/lists/dsl-parser.test.ts` | 36 | DSL schema parsing (field types, validation) |
| `lib/lists/dsl-validator.test.ts` | 39 | Schema validation rules |
| `lib/lists/date-utils.test.ts` | 34 | Date parsing and formatting |
| `lib/lists/row-to-markdown.test.ts` | 30 | Row → Markdown serialization |
| `lib/lists/row-value-display.test.ts` | 16 | Display formatting for row values |
| `lib/lists/select-options.test.ts` | 3 | Dropdown option helpers |
| `lib/utils/relativeTime.test.ts` | 28 | Relative time formatting |
| `lib/auth/pkce.test.ts` | 22 | PKCE code challenge/verifier generation |
| `lib/bluesky/richtext-facets.test.ts` | 12 | Link facet byte-offset calculation |
| `lib/crosspost/text-splitter.test.ts` | 11 | Text chunking for platform char limits |
| `lib/email/webhook-verify.test.ts` | 13 | Resend webhook HMAC verification |
| `lib/messages/link-detector.test.ts` | 3 | Instagram URL normalization/extraction |

### E2E tests (Playwright) — 16 spec files, Chromium only

**Auth flows** (`tests/e2e/auth/`):
- `login.spec.ts` — form render, successful login redirect, bad credentials
- `register.spec.ts` — form render, successful registration
- `forgot-password.spec.ts` — form render, submit success message

**API security** (`tests/e2e/api/`):
- `lists-access-control.spec.ts` — 401 on all list endpoints when unauthenticated
- `list-cross-user-isolation.spec.ts` — IDOR prevention (User B can't read User A's lists)
- `list-connections-isolation.spec.ts` — connection creation ownership enforcement
- `public-list-data-boundary.spec.ts` — private lists not exposed via public endpoints
- `subscription-gate-list-create.spec.ts` — free tier blocked from creating lists
- `admin-access-control.spec.ts` — 403 for non-admin users on `/api/admin/*`
- `export-access-control.spec.ts` — 401 unauth, correct user data scoping on exports
- `session-lifecycle.spec.ts` — logout invalidates session, switch guard
- `sync-token-auth.spec.ts` — Bearer token issuance, auth, cross-user isolation
- `watcher-ownership-enforcement.spec.ts` — watcher routes owner-only
- `home.spec.ts` — title, unauthenticated nav links, no server errors

**Global setup:** creates two seeded users (`testuser` free, `testsubscriber` subscriber) via Prisma before any spec runs.

---

## Gaps — Unit / Pure Logic

These are testable without a database or network, currently have zero tests.

### High priority

| Module | Functions to cover | Why it matters |
|---|---|---|
| `lib/crosspost/media-distributor.ts` | `distributeMedia()` | Used in every cross-post; batching images 4-per-post, video isolation — wrong behavior breaks all threaded media posts silently |
| `lib/crosspost/thread-text.ts` | `getThreadPostText()` | Post suffix logic (🧵, "a few more.", ellipsis) has at least 8 branches; currently no tests despite being called on every cross-post |
| `lib/messages/link-detector.ts` | `detectPlatform()`, `extractUrls()`, `detectLinks()` | 3 functions exported and untested; test file exists but only covers Instagram helpers |
| `lib/auth/tokens.ts` | `isTokenExpired()`, `getTokenExpiration()`, `generatePasswordResetToken()` | Token expiry logic is a pure date calculation — easy to unit test, correctness is critical for password reset flow |
| `lib/organizations/utils.ts` | `generateSlug()`, `validateSlug()`, `hasPermission()`, `getRoleHierarchy()`, `generateUniqueSlug()` | Role hierarchy and permission checks are pure functions — testing costs almost nothing, bugs here affect org membership gates |

### Medium priority

| Module | Functions to cover | Why it matters |
|---|---|---|
| `lib/utils/message-extractor.ts` | `extractListNameFromMessage()`, `extractListNameFromMessageExcludingUrls()` | NLP-based naming has edge cases (empty input, URLs, non-English); used when creating lists from messages |
| `lib/messages/message-to-markdown.ts` | Full render output | Snapshot or structural tests — output feeds exports and documents; regressions are invisible otherwise |
| `lib/auth/password.ts` | `hashPassword()`, `verifyPassword()` | Async bcrypt wrappers — confirm round-trip works, wrong-password returns false; quick to write |

---

## Gaps — Integration / API

These require a running app + database. Currently the e2e suite covers security gates well but **has no happy-path coverage for the core posting workflow**.

### High priority

| Area | Missing coverage | Notes |
|---|---|---|
| **Messages POST** | Creating a message succeeds, content saved, returned to caller | `/api/messages` is the most used endpoint; no test exists for the golden path |
| **Cross-posting** | Posting a message with Mastodon/Bluesky identities linked; error returned correctly on bad credentials | Cross-post logic is entirely untested end-to-end; the "expected non-null body source" bug had no regression test |
| **Messages GET** | Feed pagination, own vs. public visibility | Currently no coverage |
| **List data CRUD** | Create row, read rows, update row, delete row | Entire list-data API (`/api/lists/[id]/data`) uncovered |

### Medium priority

| Area | Missing coverage | Notes |
|---|---|---|
| **Password reset flow** | Request token → receive email → reset with token | Auth e2e covers login/register but not reset |
| **Follow system** | Follow request, approve, mutual follow visibility | Security tests exist for watchers but not the follow API |
| **Organization membership** | Invite, join, role change | Zero coverage |
| **Document CRUD** | Create, read, update for `/api/documents` | Entirely uncovered |

---

## Gaps — UI / Browser flows

The e2e suite hits the DOM only for auth pages. These page flows have no test:

| Page | Key flows |
|---|---|
| `/dashboard` | Renders after login, shows messages feed |
| `/lists` | List management (create, view, edit schema) |
| Message composer | Post with/without images, cross-post toggle |
| Settings / Integrations | Link a social account, view linked accounts |
| Public profile (`/@username`) | Renders public messages, correct visibility |

---

## Not worth testing (skip for now)

- `lib/lists/queries.ts`, `lib/organizations/queries.ts`, `lib/follows/queries.ts` — pure DB calls; covered transitively by e2e and prohibitively expensive to mock correctly
- `lib/auth/session.ts` — cookie/session management; Prisma + crypto integration; the e2e session tests already cover observable behavior
- OAuth flows (Bluesky, GitHub, Mastodon, LinkedIn) — require real external OAuth providers; manual or mocked integration tests only
- `lib/push/apns.ts` — requires Apple Push certificate; smoke-test manually
- `lib/analytics/track.ts` — fire-and-forget; not worth asserting

---

## Recommended order of work

1. **Unit: `media-distributor` + `thread-text`** — two small files, high call frequency, zero tests. Together ~40 tests, one afternoon.
2. **Unit: `tokens` + `organizations/utils`** — pure functions, 20 minutes each.
3. **Unit: `link-detector` remaining functions** — test file already exists; add `detectPlatform`, `extractUrls`, `detectLinks`.
4. **E2E: messages golden path** — POST a message as subscriber, GET it back in feed. Anchors the most-used code path.
5. **E2E: cross-posting error path** — stub or real linked identity, assert error propagates correctly to API response (regression for the Bluesky body-source bug).
6. **E2E: list data CRUD** — create list (subscriber), add row, update row, delete row.
7. **E2E: password reset** — extend auth suite.

---

## Open questions for you

1. **Cross-post e2e**: Do you have a test Bluesky/Mastodon account we can wire into the e2e seed, or should the cross-post test stub the outbound HTTP calls at the API boundary?

2. **Mastodon vs. Bluesky priority**: The code paths are similar but Mastodon uses a different library. Which platform is more actively used / more important to regression-test first?

3. **Snapshot tests for message-to-markdown**: The output is moderately complex (thread rendering, link previews, quoted blocks). Should we assert exact output strings (brittle but precise) or structural properties only?

4. **E2E database state**: The global setup currently creates two seeded users but no messages or lists. Are you OK with tests creating their own data (and cleaning up), or do you want a richer seed with pre-existing content?

5. **CI environment**: Are the e2e tests currently running in CI? The Playwright config has `CI`-specific settings but I want to confirm before tying new tests to infrastructure that may not exist yet.

6. **Coverage threshold**: Any minimum bar you want to enforce (e.g., `npx vitest --coverage` with a threshold in `vitest.config.ts`)? Or keep it qualitative for now?
