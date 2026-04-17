---
name: e2e-testing
description: >-
  Writes and runs Playwright end-to-end tests for user-visible features. Use when
  verifying flows in the browser after implementation, or when adding regression
  coverage for pages and critical paths in this Next.js app.
---

# E2E testing (Playwright)

## When this applies

After a feature changes UI or server-rendered pages, or when the user requests browser-level regression tests.

## Commands

- Install browsers (once per machine / CI image): `npx playwright install chromium`
- Run E2E: `npm run test:e2e` (uses [`playwright.config.ts`](playwright.config.ts)).
- Optional base URL override: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run test:e2e`

The config starts `npm run dev` as a **webServer** unless `CI` is set; locally it reuses an existing server when possible.

## Layout

- Specs live under [`tests/e2e/`](tests/e2e/) with `*.spec.ts`.

## Standards

1. **Locators**: Prefer `getByRole`, `getByLabel`, `getByText` (exact/regex) in that order. Add `data-testid` only where the DOM is unstable or roles are ambiguous.
2. **Assertions**: Use Playwright `expect` auto-waiting; avoid fixed `waitForTimeout`.
3. **Structure**: One logical feature per `test.describe`; keep tests independent (no shared mutable state).
4. **Auth**: Document skipped logins or use `storageState` / a dedicated login helper once test accounts exist; do not hardcode real passwords in the repo.
5. **Stability**: Use relative URLs with `page.goto('/')` so `baseURL` applies; avoid flaking on animation by asserting stable outcomes (URL, heading, network idle only when necessary).

## Process

1. Map user-visible steps for the feature (happy path + one failure mode if valuable).
2. Add or extend specs under `tests/e2e/`.
3. Run `npm run test:e2e` and fix until green.
4. Note any env vars or seed data required for CI later.

## Artifacts

- Traces: `trace: 'on-first-retry'` in config — inspect on failure.
- HTML report: `playwright-report/` (gitignored).
