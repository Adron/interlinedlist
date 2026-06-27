---
description: Run the full pre-PR gate (lint, typecheck, test, review) then commit + open a PR
argument-hint: [PR topic/title]
---

Run the complete pre-PR gate for this repo. Stop and report if any step fails — do not paper over a failure.

1. `npm run lint` — report issues; non-blocking per `next.config.js`, but fix any you introduced.
2. `npx tsc --noEmit` — **must be clean.** The build fails on TypeScript errors.
3. `npm run test` — Vitest unit tests must pass.
4. If `prisma/schema.prisma` changed, confirm a matching additive, idempotent `prisma/migrations/<timestamp>_<desc>/migration.sql` exists. If not, **STOP** and route to the `db-migrations` skill — never bundle schema work into a feature commit.
5. Run `/code-review high` on the diff and address real findings.
6. Use the `comment-and-commit-and-push-for-pr` skill to commit, push, and open the PR.

Never skip steps 2 and 3. If `$ARGUMENTS` is provided, use it as the PR title/topic.
