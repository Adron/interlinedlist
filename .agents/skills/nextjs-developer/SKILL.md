---
name: nextjs-developer
description: >-
  Implements features on this Next.js 14 App Router codebase with lint and TypeScript
  checks, matching existing Prisma/auth/UI patterns. Use when building or changing
  app routes, components, lib modules, or API handlers in the InterlinedList repo.
---

# Next.js developer (InterlinedList)

## When this applies

Use for the main implementation pass: new pages, API routes, `lib/` logic, Prisma usage, and UI in `components/`.

## Before writing code

1. Read project rule **nextjs-project-standards** (`.cursor/rules/nextjs-project-standards.mdc`) when editing `**/*.{ts,tsx}`.
2. Skim nearby files for naming, imports (`@/…`), error handling, and Bootstrap patterns.

## Workflow

1. **Understand** the smallest change that satisfies the request.
2. **Implement** in `app/`, `components/`, `lib/`, or `app/api/` as appropriate; reuse helpers (e.g. `getCurrentUser`, `isSubscriber`, list/document query modules).
3. **Verify** locally:
   - `npm run lint`
   - `npx tsc --noEmit`
4. **Summarize** what changed and where; call out env or migration needs if any.

## Conventions

- **Auth**: Session via `@/lib/auth/session`; protect routes and APIs consistently with surrounding code.
- **Database**: Prisma client from `@/lib/prisma`; migrations belong under `prisma/migrations/`.
- **Lists DSL / documents**: Follow existing modules under `lib/lists/` and `lib/documents/` rather than duplicating logic.
- **No scope creep**: Do not add unrelated tests, docs, or refactors unless the user asked.

## Handoff

After implementation, suggest the **unit-testing** subagent (or run `npm run test`) for new pure logic; suggest **e2e-testing** for user-visible flows touched by the change.
