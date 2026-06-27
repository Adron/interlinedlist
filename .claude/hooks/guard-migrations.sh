#!/usr/bin/env bash
# PreToolUse(Bash) guard. Hard-blocks destructive Prisma schema commands so the
# additive-only migration workflow (CLAUDE.md / .claude/rules) is enforced by the
# harness, not just by prompt. Exit 2 = block the tool call and surface stderr to Claude.
set -euo pipefail

input="$(cat)"
if command -v jq >/dev/null 2>&1; then
  cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // empty')"
else
  # No jq: fall back to scanning the raw payload (conservative — may over-match).
  cmd="$input"
fi

# Catch the dangerous Prisma CLI forms in any invocation style (npx prisma …, ./node_modules/.bin/prisma …).
if printf '%s' "$cmd" | grep -Eiq 'prisma[[:space:]]+migrate[[:space:]]+(dev|reset)|prisma[[:space:]]+db[[:space:]]+push'; then
  {
    echo "BLOCKED by .claude/hooks/guard-migrations.sh:"
    echo "  '$cmd'"
    echo "violates the additive-only migration workflow (see CLAUDE.md and .claude/rules)."
    echo "Hand-write prisma/migrations/<timestamp>_<desc>/migration.sql (idempotent), then run"
    echo "'npm run db:migrate' (localhost) and 'npm run db:migrate:deploy' (remote)."
  } >&2
  exit 2
fi
exit 0
