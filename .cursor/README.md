# Cursor project config

This folder is committed so the team shares **subagents**, **skills**, and **rules**.

## Subagents (`.cursor/agents/`)

Invoke from chat, for example:

- `Use the nextjs-developer subagent to …` — main Next.js implementation; runs lint + `tsc`.
- `Use the unit-testing subagent to …` — Vitest unit tests after a change (`npm run test`).
- `Use the e2e-testing subagent to …` — Playwright browser tests (`npm run test:e2e`).

## Skills (`.cursor/skills/`)

Each skill is a `SKILL.md` with detailed procedures. Names align with agents: `nextjs-developer`, `unit-testing`, `e2e-testing`.

## Rules (`.cursor/rules/`)

- `nextjs-project-standards.mdc` — applies to `**/*.{ts,tsx}`; lint/tsc and scope expectations.

## Test scripts (repo root)

| Script            | Command              |
|-------------------|----------------------|
| Unit (Vitest)     | `npm run test`       |
| Unit watch        | `npm run test:watch` |
| E2E (Playwright)  | `npm run test:e2e` |

First-time Playwright: `npx playwright install chromium`.
