#!/usr/bin/env bash
# Status line: "<dir> · <branch> · <model>". Reads the session JSON on stdin.
set -uo pipefail
input="$(cat 2>/dev/null || true)"

if command -v jq >/dev/null 2>&1; then
  model="$(printf '%s' "$input" | jq -r '.model.display_name // "Claude"')"
  dir="$(printf '%s' "$input" | jq -r '.workspace.current_dir // .cwd // "."')"
else
  model="Claude"; dir="."
fi

branch="$(git -C "$dir" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '-')"
printf '%s · %s · %s' "$(basename "$dir")" "$branch" "$model"
