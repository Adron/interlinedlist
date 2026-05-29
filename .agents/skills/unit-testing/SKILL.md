---
name: unit-testing
description: >-
  Adds and runs Vitest unit tests for logic introduced or changed after feature work.
  Use after the Next.js developer completes a change, or when the user asks for unit
  tests for lib utilities, validators, or pure functions.
---

# Unit testing (Vitest)

## When this applies

Run **after** a bounded implementation: new or changed pure logic in `lib/**`, small utilities, validators, parsers (e.g. list DSL helpers), not full E2E flows.

## Commands

- Run all unit tests: `npm run test` (alias for `vitest run`).
- Watch mode while iterating: `npm run test:watch`.

## Layout

- Colocate tests as `*.test.ts` or `*.spec.ts` next to the module or under a nearby `__tests__/` folder.
- Config: [`vitest.config.ts`](vitest.config.ts) — default environment `node`; path alias `@/` matches the app.
- **Exclude** Playwright specs under `tests/e2e/` (already excluded in Vitest config).

## What to test

- **Pure functions**: inputs → outputs, edge cases, errors.
- **Validators / parsers**: invalid input throws or returns structured errors as production code does.
- **Boundaries**: Mock Prisma or `fetch` only when testing a thin wrapper; prefer testing logic that does not hit the DB in unit tests.

## Process

1. Identify files changed in the feature; list public functions worth covering.
2. Add minimal tests that would fail if the behavior regressed.
3. Run `npm run test` and fix failures until green.
4. Report test file paths and a one-line summary per suite.

## What not to do here

- Do not replace E2E coverage: browser flows belong to Playwright (`npm run test:e2e`).
- Do not add heavy integration tests that require a real DB unless explicitly requested.
