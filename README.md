# QA Portal

[![CI](https://github.com/rithesh555/qa-portal/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/rithesh555/qa-portal/actions/workflows/ci.yml)
[![Security](https://github.com/rithesh555/qa-portal/actions/workflows/security.yml/badge.svg?branch=main)](https://github.com/rithesh555/qa-portal/actions/workflows/security.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/rithesh555/qa-portal/badge)](https://scorecard.dev/viewer/?uri=github.com/rithesh555/qa-portal)

Internal portal for QA work: projects, test cases, test runs, defects and
(soon) dashboards and reports.

- **Web:** React + Vite (`apps/web`), http://localhost:5173
- **API:** Fastify (`apps/api`), http://localhost:3000 (`/api/health`; API docs at `/api/docs` in development only)
- **Database:** PostgreSQL 18 in Docker, on port **5433**
- **Shared code:** Zod schemas and rules in `packages/shared`

## What you need

- WSL (Ubuntu) with Node 22 via nvm and pnpm. `which node` should print a
  `~/.nvm/...` path, not a Windows one.
- Docker Desktop, running.

## First time

```bash
cp .env.example .env                 # then set real passwords and secrets
pnpm install
docker compose up -d                 # Postgres
pnpm --filter @qa/api db:deploy      # create the tables
pnpm --filter @qa/api db:seed        # the admin account from .env
pnpm --filter @qa/api db:seed:demo   # optional: demo users, projects, cases, runs, defects
```

## Every day

```bash
docker compose up -d                 # wait for "(healthy)" in: docker compose ps
pnpm --filter @qa/api db:deploy      # only needed after pulling new migrations
pnpm dev                             # API + web together; Ctrl+C to stop
```

Sign in with the admin account, or the demo accounts `demo.admin`,
`demo.lead`, `demo.tester` and `demo.viewer` (password: `DEMO_USER_PASSWORD`
in `.env`).

Stop Postgres with `docker compose stop`; its data is kept.

## Checks

```bash
pnpm lint        # ESLint + Prettier
pnpm typecheck
pnpm test        # shared, API (against the test database), web; one at a time
```

The API tests reset one shared test database, so never run two API test runs
at once.

## Run the whole app in containers

The production-style images (API, migrate job, nginx + web) run as one stack
on http://localhost:8080, with their own database volume:

```bash
docker/stack.sh init        # once: .env.stack with random secrets
docker/stack.sh up
docker/stack.sh seed-admin  # the admin password is in .env.stack
docker/stack.sh smoke
```

How the images are built and hardened: `docs/devops/stage-01-containers.md`.

## Back up and restore the database

The data lives in the `pgdata18` Docker volume. Run these from the repository
root while the database is up. They read the user and database names from
`.env` inside the container, so nothing secret goes on the command line.

```bash
# Back up (custom format: compressed, restorable table by table)
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > qa-portal-$(date +%F).dump

# Check a backup restores, into a throwaway database
docker compose exec -T db sh -c 'createdb -U "$POSTGRES_USER" qa_portal_restore_check'
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d qa_portal_restore_check --no-owner' < qa-portal-2026-10-19.dump
docker compose exec -T db sh -c 'dropdb -U "$POSTGRES_USER" qa_portal_restore_check'

# Restore over the real database (stop `pnpm dev` first; this replaces everything)
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' < qa-portal-2026-10-19.dump
```

A backup includes the migration history, so after restoring an older backup
run `pnpm --filter @qa/api db:deploy` to bring it up to date. Keep backups
out of the repository: they hold every user's data and password hashes.

## Upgrading the database to Postgres 18

Postgres can't open another major version's data files, so a new major
means dump, then restore. `compose.yaml` uses a new volume (`pgdata18`) for
18 and leaves the old `qa-portal_pgdata` (Postgres 17) untouched, so nothing
is lost if a step goes wrong. Stop `pnpm dev` first.

```bash
# 1. Back up from the old Postgres 17 (an image tag, so it starts the old volume)
docker compose down
docker run -d --name pg17-old --env-file .env -v qa-portal_pgdata:/var/lib/postgresql/data postgres:17.11-alpine
until docker exec pg17-old pg_isready -q; do sleep 1; done
docker exec pg17-old sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > qa-portal-pg17.dump
docker rm -f pg17-old

# 2. Start Postgres 18 (creates pgdata18 with the main, test and E2E databases)
docker compose up -d --wait

# 3. Restore, then check
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --exit-on-error' < qa-portal-pg17.dump
pnpm --filter @qa/api db:deploy      # "No pending migrations"
pnpm dev                             # sign in, check your projects are there
```

Once you're happy: `docker volume rm qa-portal_pgdata` and delete the dump
(it holds every user's data and password hashes). The test and E2E databases
aren't restored: their suites reset them on every run.
The container stack (`docker/stack.sh`) starts empty on 18 too; its old
`qa-portal-stack_stackdata` volume can simply be removed.

## Database changes and demo data

- **New migration (developers):** edit `apps/api/prisma/schema.prisma`, then
  `pnpm --filter @qa/api db:migrate` and `pnpm --filter @qa/api db:generate`
  (Prisma 7 no longer regenerates the client on migrate).
- **Migrations aren't undone automatically.** To back one out, restore the
  backup taken before it, or write a new migration that reverses it.
- **Fresh demo data:** `docker compose down -v` deletes the database volume
  (everything in it), then follow "First time" again from `docker compose up -d`.
  `db:seed:demo` only runs with `NODE_ENV=development` against a database on
  this machine, so it can't create demo accounts on a real server.

## Troubleshooting

- **`node`/`pnpm` not found, or Windows Node is used:** open a new terminal
  (`~/.profile` loads nvm), or run `source ~/.nvm/nvm.sh`.
- **"Port 5173 (or 3000) is already in use":** the app is already running in
  another terminal or VS Code. Use that one, or stop it first.
- **Database connection errors:** check `docker compose ps`. The project
  database is on 5433 because a Windows PostgreSQL may hold 5432.
- **API stopped after a code change:** it restarts on every change; if it
  crashed mid-edit, save an API file again (`touch apps/api/src/server.ts`).

## Project notes

Working rules, the access model and the phase plan are in `CLAUDE.md`.
