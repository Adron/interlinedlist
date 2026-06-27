---
title: "Stop Asking the Model Nicely"
date: 2026-06-27
excerpt: My CLAUDE.md said "never run prisma migrate dev — it has broken production before." So why was that rule still just a polite request?
---

There's a line in my `CLAUDE.md` that I wrote after a bad afternoon. It says, more or less, never run `prisma migrate dev` or `db push` against the database — schema changes go through hand-written, additive migration files only. And then, in case the point wasn't landing: *violating this has broken production before.*

I've been staring at that line for a while. It's good advice. It's also a sticky note on a loaded gun. The rule lived in prose, which means it lived entirely on the goodwill and attention of whoever — or whatever — was reading the prompt at that moment. A tired me. A confident model three turns deep in a refactor. The rule was real, but its enforcement was a vibe.

That's a slow-moving disaster. So I spent a session fixing not the code, but the *setup* — the layer of agents, skills, hooks, and settings that decides what my tooling is even allowed to do. Here's what I changed, and the one place the harness told me no.

## Prose Is a Suggestion. A Hook Is a Wall.

The core move is boring and it is the whole game: take the conventions you've already written down and move them out of the prompt, where they're advisory, and into the harness, where they're enforced.

Claude Code has hooks — little scripts that fire on events. A `PreToolUse` hook runs *before* a tool call and can veto it. So the migration rule stopped being a paragraph and became `.claude/hooks/guard-migrations.sh`:

```bash
if printf '%s' "$cmd" | grep -Eiq 'prisma[[:space:]]+migrate[[:space:]]+(dev|reset)|prisma[[:space:]]+db[[:space:]]+push'; then
  echo "BLOCKED: this violates the additive-only migration workflow." >&2
  exit 2   # exit 2 = veto the command, hand the reason back to the model
fi
```

The model can forget my CLAUDE.md. It cannot forget a wall. I tested it, and then it tested me back — more on that in a second.

The same logic covers the other thing I was doing by hand. My build fails on TypeScript errors but happily ignores lint, which means "keep `tsc` clean" was another rule I enforced with hope and memory. Now a `Stop` hook runs `tsc --noEmit` when a turn ends, and if there are type errors it pushes them straight back into the conversation. It only fires when `.ts` files actually changed, and it leans on incremental compilation so it isn't slow. A `PostToolUse` hook runs prettier on every file the moment it's edited. I stopped being the linter.

## What I Actually Wired Up

The hooks were the headline, but the session turned into a full pass over the `.claude/` directory.

I gave myself **slash commands** for the rituals I kept retyping. `/ship` runs the whole pre-PR gate — lint, typecheck, tests, a code review — and only then commits and opens the PR. `/new-route` scaffolds an API handler in the exact auth-then-IDOR-then-subscription shape this codebase insists on, because the failure mode for a new endpoint here isn't a crash, it's a quiet missing ownership check. `/pre-deploy`, `/security-sweep`, `/dep-audit`, and a little `/sync-codex-agents` to keep my Codex mirrors honest round it out.

I pushed context **down to where the work happens**. My root CLAUDE.md was carrying everything, so I split off nested `CLAUDE.md` files: one in `app/api/` with the three auth mechanisms restated tight, one in `prisma/` with the migration checklist, one in `lib/linkedin/` for that gnarly three-kinds-of-posting-target model, one in `lib/lists/` for the DSL. The model reads the right rules in the right room instead of the whole house every time.

And I finally added **CI**. This is the embarrassing one. My `.github/` had issue templates and not a single workflow — the e2e specs that assert my auth and IDOR boundaries only ran when I remembered to run them. There's now a workflow that runs lint, `tsc`, and the unit suite on every PR. The security tests that protect me are no longer protected by my memory.

There's a `security-reviewer` agent now too, pointed straight at the findings from my last hardening pass, and a placeholder `.mcp.json` for a read-only Postgres connection so the model can look at real schema instead of guessing from the Prisma file. I pointed it at local only. I am not handing an LLM a pipe to production, no matter how good the afternoon is going.

## The Guardrail That Told Me No

Here's the part I didn't plan, and the part I like most.

I'd decided the cleaned-up permission rules should live in a committed `.claude/settings.json`, shared with the team. So I asked Claude to write that file — hooks, plus a generalized allowlist with entries like `Bash(curl *)` and `Bash(node *)` and `Bash(git *)`.

The harness refused. Flat out. The auto-mode classifier looked at an agent trying to write broad shell-execution permissions into a committed config and called it what it was: self-modification, permission widening, denied.

And — good. That is *exactly right.* I told it to. It said no anyway, because "the user told me to grant myself broad shell access" is precisely the sentence you'd want a coding agent to be suspicious of. The whole point of this session was that some rules shouldn't depend on anyone in the loop staying sharp. I built walls for my own database commands and then walked face-first into one built for me.

So I adjusted. The committed file holds the hooks, the status line, and the *narrowing* deny rules. The broad allowlist stays in my personal `settings.local.json`, where I approved each entry myself, pruned down from the fifty-odd dead one-off permissions that had silted up in there — single-use `sed` and `eslint` invocations from sessions six weeks gone. If I want the durable rules shared, I add them through `/permissions`, with my own hands. That's the deal. The agent doesn't get to widen its own cage, and it turns out it won't even when asked.

## Where This Goes Next

The migration guard is deliberately blunt — it matches that dangerous string anywhere in a command, so it once blocked a command of mine that merely *echoed* the words `prisma migrate dev` in a test. False positives are the tax you pay for a wall instead of a fence, and I'll take that trade every time over the alternative I wrote the rule about.

The next layer is moving that in-process rate limiter onto a real shared store, wiring the e2e suite into a scheduled run with a Postgres service container, and letting the `security-reviewer` agent loose on every diff before it ever reaches me. Same principle, one rung up: stop trusting attention, start building the thing that doesn't need it.

*— Adron*
