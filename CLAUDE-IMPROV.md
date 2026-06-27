# Improving your Claude Code setup — InterlinedList

_Written 2026-06-27. Grounded in the actual `.claude/` config, `settings.local.json`, and repo conventions in `CLAUDE.md`._

Your setup is already well above average: 8 committed project agents (`.claude/agents/`), matching skills (`.claude/skills/`), a Cursor-style rules file (`.claude/rules/nextjs-project-standards.mdc`), a `.claude/README.md` explaining the layout, and even `.codex/agents/*.toml` mirrors so the same roles work in Codex. The gaps below are about **enforcement, automation, and reducing repeated friction** — turning conventions that currently live in prose into things the harness actually guarantees.

Items are ordered by leverage. Tier 1 is "do these first."

---

## Tier 1 — Highest leverage

### 1. Make the DB migration rule a *hard* guardrail, not a prompt

`CLAUDE.md` says the strict additive-only workflow "has broken production before," yet today it's enforced only by asking the model nicely and by agent routing. A model (or a hurried `Bash` call) can still run `prisma migrate dev` / `db push` / `$executeRawUnsafe`. Move that guarantee into the harness with a **PreToolUse hook** that blocks the command before it runs.

Create `.claude/hooks/guard-migrations.sh`:

```bash
#!/usr/bin/env bash
# Reads the tool call JSON on stdin; blocks destructive schema commands.
cmd="$(jq -r '.tool_input.command // empty')"
if printf '%s' "$cmd" | grep -Eq 'prisma +(migrate +dev|db +push)|\$executeRawUnsafe|migrate +reset'; then
  echo "BLOCKED: '$cmd' violates the additive-only migration workflow (CLAUDE.md)." >&2
  echo "Use npm run db:migrate / db:migrate:deploy with a hand-written migration.sql instead." >&2
  exit 2   # exit 2 = block the tool call and surface stderr to Claude
fi
exit 0
```

Wire it in `.claude/settings.json` (see #3) under `hooks.PreToolUse` with `"matcher": "Bash"`. Now the rule is real even if the model forgets it.

### 2. Auto-run typecheck/lint/format after edits

`CLAUDE.md` is explicit: the build fails on **TypeScript** errors but *not* lint, so "always keep `tsc` clean; run `npm run lint` yourself." That's a manual step that's easy to skip. A **PostToolUse hook** on `Edit|Write` can run it automatically and feed failures straight back to Claude.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          { "type": "command", "command": "npx tsc --noEmit 2>&1 | head -40" },
          { "type": "command", "command": "npx prettier --write \"$CLAUDE_FILE_PATHS\" 2>/dev/null || true" }
        ]
      }
    ]
  }
}
```

`tsc --noEmit` on a large project is a few seconds; if that's too slow per-edit, gate it to a `Stop` hook so it runs once when Claude finishes a turn instead of after every file. Prettier auto-format keeps diffs clean against your `.prettierrc.json`.

### 3. Commit a shared `.claude/settings.json` and prune the local allowlist

Right now all permissions live in `.claude/settings.local.json` (per-machine, gitignored), and it has drifted into ~50 entries — many of them **one-off, hyper-specific commands** captured during past sessions, e.g.:

```
"Bash(sed -n 420,430p tests/e2e/bluesky-integration.spec.ts)"
"Bash(ESLINT_USE_FLAT_CONFIG=false npx eslint \"app/api/linkedin/posting-targets/route.ts\" ...)"
"Bash(perl -pi -e \"s/...\" components/MessageInput.tsx ...)"
```

Those will never match again. Two fixes:

- Run **`/fewer-permission-prompts`** — it scans your transcripts and proposes a clean, generalized allowlist.
- Split the result: durable, **team-shareable** rules (`Bash(npm run *)`, `Bash(npx tsc *)`, `Bash(npx vitest *)`, `Bash(npx prisma generate)`, `Bash(gh pr *)`) go in a committed **`.claude/settings.json`**; machine-specific noise stays in `settings.local.json`. Then delete the dead one-off entries.

A committed `settings.json` is also where the hooks from #1 and #2 belong, so the whole team (and Codex parity) inherits them.

---

## Tier 2 — Workflow accelerators

### 4. Add project slash commands (`.claude/commands/`)

You have rich skills but no custom commands for the multi-step rituals you repeat. Each is just a markdown file. Good candidates for this repo:

- **`/ship`** — `npm run lint` → `npx tsc --noEmit` → `npm run test` → `/code-review high` → commit + PR (you already have the `comment-and-commit-and-push-for-pr` skill to chain into).
- **`/pre-deploy`** — confirm migrations are present for any `schema.prisma` change, both DBs reachable, `npm run build` clean, no new `unsafe-*` CSP regressions.
- **`/regen-docs`** — wrap `npm run docs:all` and sanity-check the diff (your docs are generated from source; they drift if forgotten).
- **`/new-route`** — scaffold an `app/api/**/route.ts` with the canonical `getCurrentUserOrSyncToken` → 401 → `isSubscriber` → 403 → `lib/<feature>/queries.ts` shape from `CLAUDE.md`, so new endpoints can't forget the auth/ownership/IDOR pattern.

### 5. Add CI — and the `@claude` GitHub Action

`.github/` only has issue templates; there are **no workflows**. Your most security-sensitive guarantees (the `tests/e2e/api/*` IDOR/subscription-boundary specs, the auth-bypass regression) are only enforced when someone remembers to run them locally. Add a GitHub Actions workflow that runs `npm run lint`, `npx tsc --noEmit`, and `npm run test` on every PR (e2e on a nightly/`main` schedule since it needs a DB + dev server). Ask Claude to generate it. Optionally add the **Claude Code GitHub Action** so you can `@claude` on PRs/issues for reviews and small fixes — a natural extension of the agents you already maintain.

### 6. Nested `CLAUDE.md` files for the dense subsystems

Your root `CLAUDE.md` is excellent but carries a lot. Claude auto-loads a `CLAUDE.md` from the directory it's working in, so push subsystem-specific detail down to where it's used and keep the root lean:

- `lib/linkedin/CLAUDE.md` — the three target types, `resolveLinkedInTarget`, "treat malformed stored targets as no-explicit-target."
- `app/api/CLAUDE.md` — the route shape + the three auth mechanisms, restated tightly.
- `prisma/CLAUDE.md` — the additive-only checklist + the `npm run db:migrate` / `db:migrate:deploy` two-DB step.
- `lib/lists/CLAUDE.md` — the DSL flow (`validateDSLSchema` → `parseDSLSchema` → `dsl-validator`).

### 7. Grow the memory file

`memory/MEMORY.md` has only two entries (migrations + agent routing). Worth capturing as durable memories: the **three auth mechanisms** and the "never reintroduce a userId cookie fallback" rule (it caused the C1 account-takeover); the **subscription-gating 403 boundary**; that **lint doesn't fail the build but `tsc` does**; and that **e2e tests need `.env.local` + seeded users**. These are exactly the facts that, when forgotten mid-task, cause regressions.

---

## Tier 3 — Optional, higher-ceiling

### 8. MCP servers for first-class context

- **Read-only Postgres MCP** pointed at your *local* DB — lets Claude inspect real schema/row shapes instead of inferring from `schema.prisma`. Keep it read-only and never point it at production.
- **GitHub MCP** — richer issue/PR context than shelling out to `gh`.
- **Playwright MCP** — drive real browser flows when debugging the e2e specs.
- **Sentry / Stripe MCPs** — if/when you add error tracking and want billing context in-loop.

(Security note that fits this repo: you already harden against SSRF in `lib/security/` — apply the same instinct to MCP. Only connect servers you trust, prefer read-only, and remember interactively-authenticated MCP servers may be absent in headless/cron runs.)

### 9. Scheduled & looping agents for maintenance

Use `/schedule` or `/loop` for the recurring chores that otherwise rot:

- Weekly `npm audit` + dependency-update triage (you're on Next 14 / Prisma 5 — worth tracking).
- Post-merge `npm run docs:all` regeneration so `/api-docs` never drifts from source.
- A periodic "security sweep" running `/security-review` over recent diffs (you clearly value this given the recent hardening commits).

### 10. A status line

No `statusLine` is configured. A small one showing branch + model + token/cost is handy on a repo this size where context fills up. `/statusline` (or the `statusline-setup` agent) sets it up in a minute.

### 11. Keep the `.codex/` mirrors honest

You maintain `.codex/agents/*.toml` as Codex equivalents of `.claude/agents/*.md`. Today they can silently diverge. A tiny `/sync-codex-agents` command (or a `Stop` hook) that regenerates the TOMLs from the canonical markdown keeps both toolchains in lockstep.

### 12. Promote security review to a wired-in step

The recent commit history (`security: SSRF guards…`, `security: fix auth bypass (C1)…`) shows security review is a real part of your process, but it's ad-hoc. Bake `/code-review high` or `/security-review` into the `/ship` command (#4), and consider a dedicated `security-reviewer` agent so the diff gets an adversarial pass before every PR — not just when you remember.

---

## Quick reference

| Improvement | Effort | Payoff |
|---|---|---|
| PreToolUse hook blocking `migrate dev`/`db push` | 15 min | Removes a documented prod-breakage class entirely |
| PostToolUse `tsc`/prettier hook | 15 min | Build-breaking type errors caught at edit time |
| Commit `settings.json`, prune local allowlist (`/fewer-permission-prompts`) | 30 min | Fewer prompts, shared with team + Codex |
| Project slash commands (`/ship`, `/pre-deploy`, `/new-route`) | 1–2 hr | Encodes the canonical route/migration rituals |
| GitHub Actions CI + `@claude` action | 1–2 hr | IDOR/subscription specs run on every PR |
| Nested `CLAUDE.md` per subsystem | 1 hr | Leaner root, sharper local context |
| Expand `MEMORY.md` | 20 min | Fewer forgotten-rule regressions |
| MCP (read-only Postgres, GitHub, Playwright) | varies | Real schema/PR/browser context in-loop |
| Scheduled `npm audit` / docs-regen / security sweeps | 30 min | Maintenance that doesn't depend on memory |

**Start with #1, #2, #3** — they convert your three most important written conventions (migration safety, `tsc`-clean, permission hygiene) into harness-enforced guarantees, which is where the largest reliability gain is.
