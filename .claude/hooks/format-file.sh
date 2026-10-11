#!/bin/bash
# PostToolUse (Edit/Write): run Prettier on the file that was just changed.
# Formatting problems never block the edit; lint at the phase gate still checks.

if ! command -v jq >/dev/null 2>&1; then
  echo "format-file hook: jq is not installed, so edited files aren't auto-formatted (pnpm lint still checks)." >&2
  exit 0
fi

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
[ -z "$FILE" ] && exit 0

# Only files inside this project that still exist.
case "$FILE" in
  "$CLAUDE_PROJECT_DIR"/*) ;;
  *) exit 0 ;;
esac
[ -f "$FILE" ] || exit 0

# Hooks don't load the shell profile; load nvm only if Node isn't on PATH.
if ! command -v node >/dev/null 2>&1; then
  export NVM_DIR="$HOME/.nvm"
  # shellcheck disable=SC1091
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" >/dev/null 2>&1
fi

cd "$CLAUDE_PROJECT_DIR" || exit 0
# --ignore-unknown skips files Prettier can't format; .prettierignore applies.
# The project's own Prettier, without pnpm's startup cost.
"$CLAUDE_PROJECT_DIR/node_modules/.bin/prettier" --write --ignore-unknown --log-level warn "$FILE" >&2 || true
exit 0
