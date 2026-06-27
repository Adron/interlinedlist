---
description: Pre-deploy go/no-go safety check (migrations, build, headers, cron, secrets)
---

Verify this branch is safe to deploy to Vercel. Check each item and end with an explicit **GO / NO-GO** plus reasons:

1. **Migrations** — any `prisma/schema.prisma` change has a committed, additive, idempotent migration under `prisma/migrations/`. (`vercel-build` applies migrations automatically on deploy, so a missing migration ships a broken schema.)
2. **Build** — `npx tsc --noEmit` is clean and `npm run build` succeeds.
3. **Security headers / CSP** — no regression in `next.config.js`; no new `unsafe-*` directives beyond what's already tracked.
4. **Cron** — every `app/api/cron/*` route still gates on `isAuthorizedCronRequest` and fails **closed**.
5. **Secrets** — no `.env*` values, tokens, or keys committed in the diff.

Report findings concisely; do not deploy anything yourself.
