#!/usr/bin/env bash
# Run the containerised QA Portal locally. See docs/devops/stage-01-containers.md.
#
#   docker/stack.sh init        write .env.stack with random secrets (once)
#   docker/stack.sh up          build the images and start the stack
#                               (STACK_NO_BUILD=1: use images built already, as CI does)
#   docker/stack.sh seed-admin  create the first admin (SEED_ADMIN_* in .env.stack)
#   docker/stack.sh smoke       run the smoke checks against http://localhost:8080
#   docker/stack.sh logs [svc]  follow logs
#   docker/stack.sh down        stop (keeps the data volume); `down -v` wipes it
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
env_file="$root/.env.stack"
compose=(docker compose --env-file "$env_file" -f "$root/docker/compose.stack.yaml")

need_env() {
  [[ -f "$env_file" ]] || { echo "No .env.stack yet: run docker/stack.sh init" >&2; exit 1; }
}

cmd="${1:-}"
shift || true

case "$cmd" in
  init)
    if [[ -f "$env_file" ]]; then
      echo ".env.stack already exists; leaving it alone."
      exit 0
    fi
    # Random values, written straight to the file and never printed.
    umask 077
    {
      echo "POSTGRES_USER=qa_portal"
      echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)"
      echo "POSTGRES_DB=qa_portal"
      echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)"
      echo "SEED_ADMIN_USERNAME=admin"
      echo "SEED_ADMIN_NAME=Administrator"
      echo "SEED_ADMIN_EMAIL=admin@qa-portal.local"
      echo "SEED_ADMIN_PASSWORD=$(openssl rand -base64 18)"
    } >"$env_file"
    echo "Wrote .env.stack (mode 600). The admin password is in that file."
    ;;
  up)
    need_env
    build_flag=--build
    [[ "${STACK_NO_BUILD:-}" == 1 ]] && build_flag=--no-build
    "${compose[@]}" up "$build_flag" --detach --wait "$@"
    "${compose[@]}" ps
    ;;
  seed-admin)
    need_env
    # The migrate image has the seed script and its dev dependencies.
    set -a
    # shellcheck source=/dev/null
    source "$env_file"
    set +a
    "${compose[@]}" run --rm --no-deps \
      -e SEED_ADMIN_USERNAME -e SEED_ADMIN_NAME -e SEED_ADMIN_EMAIL -e SEED_ADMIN_PASSWORD \
      migrate node prisma/seed.ts
    ;;
  smoke)
    need_env
    set -a
    # shellcheck source=/dev/null
    source "$env_file"
    set +a
    STACK_URL="${STACK_URL:-http://localhost:8080}" node "$root/docker/smoke.ts"
    ;;
  logs)
    "${compose[@]}" logs --follow "$@"
    ;;
  down)
    "${compose[@]}" down "$@"
    ;;
  *)
    sed -n '2,11p' "$0"
    exit 1
    ;;
esac
