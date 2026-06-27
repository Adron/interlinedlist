#!/usr/bin/env bash
# PostToolUse(Edit|Write|MultiEdit) hook. Auto-formats the file that was just
# edited with the project's local prettier, if installed. Skips silently when
# prettier is absent or the file type isn't formattable. Never blocks.
set -euo pipefail

input="$(cat)"
command -v jq >/dev/null 2>&1 || exit 0
f="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')"
[ -n "$f" ] || exit 0

case "$f" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.json|*.css|*.scss|*.md) ;;
  *) exit 0 ;;
esac

# Only use a locally-installed prettier — never trigger an on-the-fly npx download.
if [ -x node_modules/.bin/prettier ]; then
  node_modules/.bin/prettier --write "$f" >/dev/null 2>&1 || true
fi
exit 0
