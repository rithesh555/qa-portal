#!/bin/sh
# Runs Playwright while holding a machine-wide lock: the E2E stack has fixed
# ports and one database, so only one run at a time (several people or agents
# writing specs in parallel take turns). Usage: scripts/run-locked.sh <playwright args>
set -eu
cd "$(dirname "$0")/.."
exec flock /tmp/qa-portal-e2e.lock pnpm exec playwright test "$@"
