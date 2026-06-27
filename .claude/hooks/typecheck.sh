#!/usr/bin/env bash
# Stop hook. When Claude finishes a turn, if any .ts/.tsx files have uncommitted
# changes, run `tsc --noEmit`. If it fails, exit 2 to push the type errors back to
# Claude so a turn never "finishes" with a broken build (the build gates on tsc).
# Incremental compilation (tsconfig.tsbuildinfo) keeps repeat runs fast.
set -uo pipefail

input="$(cat 2>/dev/null || true)"

# Avoid infinite loops: if we're already inside a Stop-hook continuation, don't re-block.
if command -v jq >/dev/null 2>&1; then
  active="$(printf '%s' "$input" | jq -r '.stop_hook_active // false')"
  [ "$active" = "true" ] && exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || echo .)}" || exit 0

# Only typecheck when TS source actually changed this session.
if ! git status --porcelain 2>/dev/null | grep -qE '\.(ts|tsx)$'; then
  exit 0
fi

out="$(npx tsc --noEmit 2>&1)" && exit 0

{
  echo "TypeScript errors remain (npx tsc --noEmit) — the build gates on these:"
  printf '%s\n' "$out" | grep -E 'error TS' | head -40
} >&2
exit 2
