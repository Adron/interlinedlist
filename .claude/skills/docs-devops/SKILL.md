---
name: docs-devops
description: >-
  Writes and maintains docs/operational.md — the DevOps/operational reference
  for InterlinedList. Use when the user asks to generate, update, or review
  operational documentation covering deployment, environment variables, database,
  cron jobs, OAuth setup, APNS, Stripe, Resend, or local dev workflow.
---

# docs-devops skill (InterlinedList)

## When this applies

Use this skill whenever the task involves the **operational documentation** for InterlinedList:

- Generating `docs/operational.md` from scratch
- Updating it after infra changes (new env var, new cron, new OAuth provider, etc.)
- Answering "how do I deploy this?" or "what env vars does this need?"
- Reviewing or extending an existing draft

## Two modes of operation

### Mode 1 — Automated (recommended for initial generation or full refresh)

Run the generator script:

```bash
node scripts/generate-docs.js --perspective devops
```

This uses the Anthropic API (requires `ANTHROPIC_API_KEY`) to explore the codebase and write `docs/operational.md` autonomously. It calls up to 60 tool calls to read files, search code, and list directories before writing the final document.

**When to use:** First-time generation, or after significant infrastructure changes that require a comprehensive re-scan.

### Mode 2 — Interactive (this Claude Code session)

Work directly in the current session. Follow the research checklist below, then write or update `docs/operational.md`.

## Research checklist for interactive mode

Work through these in order:

1. **Environment variables**
   ```
   find . -name '.env*' -not -path '*/node_modules/*'
   grep -r 'process\.env\.' app/ lib/ scripts/ --include='*.ts' --include='*.js' -h | grep -oP "process\.env\.\w+" | sort -u
   ```

2. **Database & migrations**
   - Read `prisma/schema.prisma`
   - Read `scripts/safe-migrate.js` and `scripts/migrate-deploy.js`
   - Note the `db:migrate` vs `db:migrate:deploy` distinction

3. **Deployment**
   - Read `package.json` → `vercel-build` script
   - Check for `vercel.json`

4. **Cron jobs**
   - List `app/api/cron/`
   - Read each `route.ts` for schedule and CRON_SECRET usage

5. **OAuth providers**
   - `lib/auth/oauth-linkedin.ts`
   - `app/api/auth/mastodon/`
   - `app/api/auth/bluesky/`
   - `app/api/auth/github/`

6. **APNS / push**
   - `app/api/push/`
   - Search for `APNS` or `apns` in `lib/`

7. **Stripe / Resend / Vercel Blob**
   - Search for `stripe`, `resend`, `@vercel/blob` usage

## Output requirements

Write `docs/operational.md` with:

| Section | Contents |
|---------|----------|
| Overview | One-paragraph service description |
| Prerequisites | Node version, required global tools |
| Local Development Setup | Step-by-step from clone to `npm run dev` |
| Environment Variables | Full table: Name, Required, Purpose, Example |
| Database | Schema overview, migration commands, backup/restore |
| Deployment | `vercel-build` sequence, Vercel project settings |
| Cron Jobs | Each cron route, recommended schedule, securing with CRON_SECRET |
| OAuth Providers | Per-provider: credentials needed, redirect URIs, setup steps |
| Push Notifications (APNS) | Certs/keys, env vars, registration flow |
| Email (Resend) | Env vars, email types sent |
| Payments (Stripe) | Env vars, webhook events, portal setup |
| Blob Storage | Env vars, what is stored |
| npm Scripts Reference | All ops-relevant scripts in a table |

## Constraints

- Document only what exists in the code — do not invent.
- Use accurate script names and file paths.
- Keep the operational.md focused on infrastructure — no UI flows, no API endpoint shapes.
