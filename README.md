# QA Portal

Internal portal for QA work: projects, test cases, test runs, defects and
(soon) dashboards and reports.

- **Web:** React + Vite (`apps/web`), http://localhost:5173
- **API:** Fastify (`apps/api`), http://localhost:3000 (`/api/health`, API docs at `/api/docs`)
- **Database:** PostgreSQL 17 in Docker, on port **5433**
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
