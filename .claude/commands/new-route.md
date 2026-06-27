---
description: Scaffold an API route with the canonical auth / IDOR / subscription shape
argument-hint: <METHOD> <path> [--subscriber]
---

Create a new `app/api/<path>/route.ts` following the project's standard handler shape (see `app/api/CLAUDE.md`):

- `export const dynamic = "force-dynamic";`
- Auth: `getCurrentUserOrSyncToken(request)` (CLI/mobile-reachable) or `getCurrentUser()` (web-only) → return **401** if missing.
- If subscriber-gated (`--subscriber`), `isSubscriber(user.customerStatus)` → return **403** for free users.
- Validate the request body. Put the actual work in `lib/<feature>/queries.ts`, **not** inline in the route.
- Ownership/IDOR filters everywhere: `where: { id, userId: user.id }`.
- Any external fetch goes through the SSRF guards in `lib/security/`.
- Match the JSON error shape used by neighboring routes.

Use `$ARGUMENTS` for the method and path. After scaffolding, add a matching `tests/e2e/api/*` spec that asserts the auth (401), IDOR, and — if gated — the subscription (403) boundaries.
