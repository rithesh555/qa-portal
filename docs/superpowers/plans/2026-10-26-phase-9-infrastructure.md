> **Superseded (2026-11-02)** by [`2026-11-02-phase-9-devops.md`](2026-11-02-phase-9-devops.md). Its container, nginx, smoke and Locust design is reused there as Stages 1 and 8.

# Phase 9 Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the QA Portal as production-like containers (API, migrations, nginx web) in a self-contained compose stack, prove it with a smoke check, load-test it with Locust, and gate every change with GitHub Actions.

**Architecture:** One multi-stage `Dockerfile` at the repo root builds three targets: `api` (Node 22 running the TypeScript sources directly, as today), `migrate` (full deps, runs `prisma migrate deploy` and the admin seed), and `web` (nginx serving the Vite build and proxying `/api`). `docker/compose.stack.yaml` runs them with its own Postgres and volume on `http://localhost:8080`, separate from the dev `compose.yaml`. Locust runs as a `load` profile service inside the stack network. CI runs the existing gate plus the stack smoke check.

**Tech Stack:** Docker 29 / Compose, `node:22.23.3-bookworm-slim`, nginx (alpine), pnpm 12.11.2 via corepack, Prisma 7.10.0, Locust (official image), GitHub Actions, actionlint.

**Spec:** `CLAUDE.md` § Scope (Phase 9) and § Rules; E2E background in `~/.claude/plans/zippy-marinating-wombat.md`. User decisions are **assumed** (the questions were interrupted). Confirm them before execution:

- **D1 CI:** GitHub Actions, private repo the user creates and pushes.
- **D2 Deploy:** images + compose only. No deploy step and no registry push yet.
- **D3 CI scope:** fast checks on every push; E2E, image build and stack smoke on PRs to `main` and nightly.
- **D4 Load:** 50 concurrent users for 10 min; pass if p95 < 500 ms and failures < 1 %.

## Global Constraints

- Prisma stays **7.10.0** (`pnpm-workspace.yaml` allowBuilds); no dependency upgrades.
- Every new version (image tag, pip/npm package, GitHub action) must be **at least 2 weeks old**. Pin exact versions. Pin actions by full commit SHA with the tag in a comment.
- Node **22** only (`engines: >=22.13 <23`). The image uses `node:22.23.3-bookworm-slim`, the same patch as local.
- The API runs `.ts` with Node type stripping, and `@qa/shared` exports `./src/index.ts`. Node refuses to strip types under `node_modules`, so **never `pnpm deploy`** or otherwise copy workspace packages into `node_modules`. Keep the workspace layout so symlinks resolve outside `node_modules`.
- `prisma` is a devDependency, and the API's `postinstall` runs `prisma generate`. The runtime stage installs prod deps with `--ignore-scripts` and copies `apps/api/src/generated/` from the build stage.
- The API must listen on `API_HOST=0.0.0.0` in the container (the default `127.0.0.1` is unreachable).
- `NODE_ENV=production` requires https origins except on `localhost` (`apps/api/src/env.ts`). The stack uses `WEB_ORIGIN=BETTER_AUTH_URL=http://localhost:8080`.
- Unsafe requests need `Origin` equal to `WEB_ORIGIN` (`apps/api/src/app.ts` onRequest hook). nginx must pass `Origin` through unchanged.
- Per-user report/export/import limits are in memory (`apps/api/src/lib/rate-limits.ts`), so run **one API replica**.
- Import bodies go up to **12 MiB** (`IMPORT_BODY_LIMIT`), so nginx needs `client_max_body_size 12m`.
- Secrets live only in git-ignored env files. The stack reads `.env.stack` (matches the existing `.env.*` ignore). Add `!.env.stack.example` to `.gitignore` and commit `.env.stack.example` with names only.
- Never print `.env*` values. CI generates throwaway secrets per run (`openssl rand -hex 32`).
- The git hook blocks push. The user creates the remote and pushes. Commit only with the user's approval, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- The dev `compose.yaml` stays Postgres-only and unchanged.
- Never run two API vitest runs at once. E2E runs only through `e2e/scripts/run-locked.sh`.
- Use the `docker-patterns`, `multi-stage-dockerfile` and `security-and-hardening` skills. Look up nginx, Compose, Locust and Actions docs with Context7 before writing config.

## Review Focus

1. **Client IP behind nginx:** if `TRUST_PROXY` is too narrow, every user shares nginx's IP and the 1000/min/IP global limit and the 30/min sign-in limit pool across the office. If it's too wide, a client can spoof `X-Forwarded-For` to dodge both. Expected: the session's `ip_address` is the real client address, neither nginx's nor a spoofed one. Covered by smoke check `client-ip` (Task 2).
2. **Deep links and refresh:** `GET /projects/QA/runs/QA-R-1` must return `index.html` (200), while `GET /api/nope` returns the API's JSON 404, never `index.html`. Covered by smoke checks `spa-fallback` and `api-404` (Task 2).
3. **Stale app after a rebuild:** `index.html` must be `Cache-Control: no-cache`, and `/assets/*` `public, max-age=31536000, immutable`. Covered by smoke check `cache-headers` (Task 2).
4. **Large imports:** a 5 MiB `POST /api/.../imports/check` must reach the API (any non-413 status from Fastify), not get nginx's 413. Covered by smoke check `upload-size` (Task 2).
5. **Restart order and re-runs:** a second `docker compose up` on an existing volume must re-run `migrate` as a no-op and start `api` only after it succeeds. Covered by the Task 1 step that runs `up` twice.

---

## File Structure

| Path                        | Responsibility                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `Dockerfile`                | Multi-stage: `deps` → `build` → targets `migrate`, `api`, `web`                                                     |
| `.dockerignore`             | Keeps `node_modules`, `.env*`, `e2e/results`, `.git`, dist folders out of the context                               |
| `docker/compose.stack.yaml` | Project `qa-portal-stack`: `db`, `migrate`, `api`, `web`, profile `load` → `locust`                                 |
| `docker/nginx/default.conf` | Static files, SPA fallback, `/api` proxy, cache and security headers, body size                                     |
| `docker/smoke.ts`           | Node script: named HTTP checks against a base URL; exits 1 on any failure                                           |
| `docker/stack.sh`           | `up` / `down` / `seed-admin` / `smoke` / `load` wrapper (sets `--env-file .env.stack -f docker/compose.stack.yaml`) |
| `.env.stack.example`        | Variable names for the stack                                                                                        |
| `load/locustfile.py`        | User behaviour, thresholds → exit code                                                                              |
| `load/seed_load.py`         | Creates load users, a project, cases and a run through the stack's API                                              |
| `.github/workflows/ci.yml`  | `checks` on push; `e2e` and `stack` on PR and nightly                                                               |
| `README.md`                 | New sections: Production-like stack, Load tests, CI                                                                 |

---

### Task 1: API and migration images in a compose stack

**Files:**

- Create: `Dockerfile` (stages `deps`, `build`, targets `migrate`, `api`), `.dockerignore`, `docker/compose.stack.yaml` (services `db`, `migrate`, `api`), `docker/smoke.ts`, `docker/stack.sh`, `.env.stack.example`
- Modify: `.gitignore` (add `!.env.stack.example`)

**Interfaces:**

- Produces: image targets `migrate` and `api`; compose services `db` (`postgres:17.11-alpine`, volume `stackdata`, not published), `migrate` (one-off), `api` (port 3000 on network `stack`). The network uses a fixed subnet `172.30.0.0/24` with fixed addresses: `web` (nginx) `172.30.0.10`, `locust` `172.30.0.50`. `TRUST_PROXY=172.30.0.10`, i.e. nginx only: the subnet also holds the Docker gateway (`172.30.0.1`), which carries every host connection, so trusting the whole subnet would let any client spoof `X-Forwarded-For`. `docker/smoke.ts <baseUrl> [--only a,b]` with `check(name: string, fn: () => Promise<void>)`, printing `PASS name` / `FAIL name: reason`. `docker/stack.sh {up|down|seed-admin|smoke|load}`.
- `.env.stack.example` names: `POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB BETTER_AUTH_SECRET SEED_ADMIN_USERNAME SEED_ADMIN_NAME SEED_ADMIN_EMAIL SEED_ADMIN_PASSWORD LOAD_USER_PASSWORD`. `DATABASE_URL` is composed inside the compose file from the `POSTGRES_*` values, with host `db`.

- [ ] **Step 1: Write the failing smoke checks** in `docker/smoke.ts`:
  - `api-health`: `GET {base}/api/health` → 200 `{status:"ok"}`
  - `api-ready`: `GET {base}/api/ready` → 200 `{status:"ok",database:"up"}`
  - `sign-in`: `POST {base}/api/auth/sign-in/username` with `Origin: {base}` and the `SEED_ADMIN_*` creds from env → 200, and `set-cookie` contains `HttpOnly`, `Secure`, `SameSite=Lax`
  - `origin-check`: same POST with `Origin: https://evil.example` → 403
  - `no-docs`: `GET {base}/api/docs` → 404 (swagger is dev-only)
- [ ] **Step 2: Run it with no stack** — `node docker/smoke.ts http://localhost:3000` → every check FAILs and the exit code is 1.
- [ ] **Step 3: Write `Dockerfile` stages `deps`/`build`/`migrate`/`api` and the compose services.**
  - `deps`: corepack pnpm 12.11.2, `pnpm fetch` on the lockfile.
  - `build`: `pnpm install --frozen-lockfile --offline` (runs `prisma generate`).
  - `migrate`: from `build`, `WORKDIR /app/apps/api`, `CMD ["pnpm","db:deploy"]`.
  - `api`: a fresh slim image; `pnpm install --prod --frozen-lockfile --offline --ignore-scripts --filter @qa/api...`; copy `apps/api/src`, `apps/api/prisma`, `packages/shared/src` and `apps/api/src/generated` from `build`; run as user `node`; `init: true` in compose; `CMD ["node","src/server.ts"]`; healthcheck `node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1))"`.
  - `api` gets `depends_on: migrate: condition: service_completed_successfully`, and `migrate` depends on `db: service_healthy`.
  - Env: `NODE_ENV=production`, `API_HOST=0.0.0.0`, `API_PORT=3000`, `WEB_ORIGIN=BETTER_AUTH_URL=http://localhost:8080`, `TRUST_PROXY=172.30.0.10`, `LOG_LEVEL=info`.
  - For this task only, publish `api` on `127.0.0.1:3000` (Task 2 removes it).
- [ ] **Step 4: Bring it up and seed the admin.** `cp .env.stack.example .env.stack`, then fill it with generated values from a script that prints nothing. Run `docker/stack.sh up`, then `docker/stack.sh seed-admin` (`compose run --rm migrate node prisma/seed.ts`). Expected: `Admin "<name>": created`.
- [ ] **Step 5: Run the smoke** — `docker/stack.sh smoke` (against `http://localhost:3000`) → 5 PASS, exit 0. Before running, temporarily set `WEB_ORIGIN` to `http://localhost:3000` (Task 2 moves it back to 8080).
- [ ] **Step 6: Re-run check (Review Focus 5)** — `docker/stack.sh up` again. `migrate` exits 0 with "No pending migrations to apply", `api` comes up healthy, and smoke still passes.
- [ ] **Step 7: Check the image** — `docker image ls` shows the `api` target under 400 MB. `docker run --rm --entrypoint id <api>` prints uid 1000 (`node`). `docker history` shows no `.env` layer.
- [ ] **Step 8: Commit** — `git add Dockerfile .dockerignore docker/compose.stack.yaml docker/smoke.ts docker/stack.sh .env.stack.example .gitignore`, then commit `"Phase 9: API and migration images, stack compose, smoke checks"` after the user approves.

### Task 2: nginx web image and the full stack on :8080

**Files:**

- Create: `docker/nginx/default.conf`
- Modify: `Dockerfile` (target `web`), `docker/compose.stack.yaml` (service `web` on `127.0.0.1:8080:8080`, `ipv4_address 172.30.0.10`; drop the `api` port; restore `WEB_ORIGIN` 8080), `docker/smoke.ts` (new checks; default base `http://localhost:8080`)

**Interfaces:**

- Consumes: the `build` stage and `api` service from Task 1.
- Produces: the `web` target running nginx as non-root on port 8080, and a stack reachable at `http://localhost:8080`.

- [ ] **Step 1: Add the failing smoke checks:**
  - `index`: `GET /` → 200, `content-type` text/html, body contains `<div id="root">`
  - `spa-fallback`: `GET /projects/QA/runs/QA-R-1` → 200 html
  - `api-404`: `GET /api/nope` → 404 with JSON content-type
  - `cache-headers`: `/` has `cache-control: no-cache`; the first `/assets/*.js` referenced by index.html has `public, max-age=31536000, immutable`
  - `security-headers`: `/` has `x-content-type-options: nosniff`, `referrer-policy: strict-origin-when-cross-origin`, `x-frame-options: DENY`, and a `content-security-policy` containing `default-src 'self'`
  - `upload-size`: a signed-in POST of a 5 MiB body to `/api/projects/<any>/imports/check` → status ≠ 413
  - `client-ip`: sign in with an extra `X-Forwarded-For: 203.0.113.9` header, then read `select ip_address from session order by created_at desc limit 1` through `docker compose exec -T db psql -tAc` (wrapped in `stack.sh`). The address must be neither `172.30.0.10` (nginx) nor `203.0.113.9` (spoofed); from the host it is the gateway `172.30.0.1`.
- [ ] **Step 2: Run** — `docker/stack.sh smoke` → the new checks FAIL (connection refused on 8080).
- [ ] **Step 3: Write the `web` target and `default.conf`.**
  - Build with `pnpm --filter web build` in `build`; copy `apps/web/dist` into `nginxinc/nginx-unprivileged:<stable-alpine ≥2 weeks old>`.
  - `location /api/`: `proxy_pass http://api:3000`, with `Host`, `X-Forwarded-For $proxy_add_x_forwarded_for`, `X-Forwarded-Proto $scheme` and `Origin` passed through.
  - `location /assets/`: immutable cache. `location /`: `try_files $uri /index.html`, with `no-cache` on index.html.
  - Add the security headers listed in Step 1, plus `client_max_body_size 12m` and `server_tokens off`.
  - CSP values come from what the built app loads: check `index.html` and the fonts. Verify in the browser console that there are no CSP violations.
- [ ] **Step 4: Run** — `docker/stack.sh up && docker/stack.sh smoke` → all 12 checks PASS.
- [ ] **Step 5: Browser check** with Playwright MCP at `http://localhost:8080`: sign in as the seeded admin, open Users, create a project, refresh on a deep link, and confirm the console shows no CSP errors.
- [ ] **Step 6: Commit** — `"Phase 9: nginx web image; full stack on :8080"`, after approval.

### Task 3: Locust load tests

**Files:**

- Create: `load/locustfile.py`, `load/seed_load.py`, `load/README.md` (short: how to run, what passes)
- Modify: `docker/compose.stack.yaml` (service `locust`, profile `load`, image `locustio/locust:<exact ≥2 weeks old>`, mounts `../load`, network `stack` with `ipv4_address 172.30.0.50`; `web` gets `ipv4_address 172.30.0.10` in Task 2), `docker/stack.sh` (`load` runs the seed, then a headless Locust)

**Interfaces:**

- Consumes: the stack on network `stack`. The `load` profile overrides `api`'s `TRUST_PROXY` to `172.30.0.10,172.30.0.50` (nginx and Locust; set through `docker/stack.sh load`, never the default), so each simulated user's `X-Forwarded-For: 10.88.<i/250>.<i%250>` becomes `request.ip`. This keeps the per-IP limits per simulated user, with no app change. `stack.sh load` restores the default `TRUST_PROXY` when it finishes.
- Produces:
  - `seed_load.py --base http://web:8080 --users 50`: idempotent.
    - As the seeded admin, it creates `load-user-01..50` with `LOAD_USER_PASSWORD`, signs each in once and changes their password away from the admin-chosen one, as the API requires.
    - It creates project `LOAD` (lead `load-user-01`, the rest testers), 300 Ready cases in 3 suites, and one open run of all cases.
    - It writes `load/.users.json` (git-ignored).
  - `locustfile.py`: `QaUser(HttpUser)` with `wait_time = between(1, 3)`. Each user signs in on start with its own `X-Forwarded-For` and sends `Origin: http://localhost:8080` on writes. Task weights (keeps reports under the 30/min/user `REPORT_LIMIT`):
    - home 3
    - case list with search 4
    - case page 3
    - run page 3
    - record a result 5
    - defect list 2
    - log defect 1
    - report 1
- [ ] **Step 1: Write the threshold check first.** In `locustfile.py`, a `@events.quitting.add_listener` sets `environment.process_exit_code = 1` when `stats.total.fail_ratio > 0.01` or `stats.total.get_response_time_percentile(0.95) > 500`, and prints which one failed.
- [ ] **Step 2: Prove the check trips** — run `docker/stack.sh load --users 2 --run-time 30s` with `LOAD_P95_MS=1` (an env override read by the listener) → exit 1 with "p95 … > 1 ms".
- [ ] **Step 3: Write `seed_load.py` and the user tasks** to the interfaces above. Recording a result uses the case's current `version` as `expectedVersion`. A 409 is retried once after re-reading the case and counted as success, since conflicts are expected when users share a run.
- [ ] **Step 4: Smoke the load run** — `docker/stack.sh load --users 5 --run-time 1m` → exit 0, no 429s, and no 403 Origin errors in the Locust failures table.
- [ ] **Step 5: Full run (D4)** — `docker/stack.sh load --users 50 --spawn-rate 5 --run-time 10m --csv load/results/run` → exit 0. Record p50/p95/p99 and the failure ratio per endpoint in `load/README.md` § Last result, with the date and commit.
- [ ] **Step 6: Commit** — `"Phase 9: Locust load tests against the stack"`, after approval. If Step 5 fails, report the slow endpoints to the user before tuning anything (no guesswork; a fix is an app change).

### Task 4: GitHub Actions CI

**Files:**

- Create: `.github/workflows/ci.yml`
- Modify: `README.md` (sections Production-like stack, Load tests, CI)

**Interfaces:**

- Consumes: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `e2e/scripts/run-locked.sh`, `docker/stack.sh up|seed-admin|smoke`.
- Produces three jobs:
  - `checks`, on `push` and `pull_request`: Postgres 17.11 service, running lint, typecheck and test.
  - `e2e`, on `pull_request` to `main`, `schedule` nightly `0 2 * * *` and `workflow_dispatch`: Playwright chromium + deps, full suite with `--retries=1`; uploads `e2e/results/html` as an artifact.
  - `stack`, on the same triggers as `e2e`: `docker/stack.sh up`, `seed-admin`, `smoke`, then `down -v`.
- Every job uses `permissions: contents: read` and `concurrency: ${{ github.workflow }}-${{ github.ref }}` with cancel-in-progress.

- [ ] **Step 1: Write the workflow.**
  - Every job generates its `.env` / `.env.stack` with `openssl rand -hex 32` for each secret, plus fixed non-secret values copied from `.env.example`.
  - `E2E_PORTAL_*` is left unset: CI never publishes to the dev portal.
  - Node is set from `.nvmrc`; pnpm comes from `packageManager` via corepack; cache the pnpm store with `actions/cache` keyed on `pnpm-lock.yaml`.
- [ ] **Step 2: Lint the workflow** — `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:<exact ≥2 weeks old>` → no output, exit 0.
- [ ] **Step 3: Run each job's commands locally the way CI would.** Use a fresh clone in the scratchpad with the generated env files, run each job's commands in order, and expect the same green results as the local gate. This catches anything that depends on local state (e.g. the e2e DB already existing, or Playwright browsers already installed).
- [ ] **Step 4: Write the README sections:** the stack commands; that the stack has its own DB and doesn't touch dev data; the load command and pass criteria; what CI runs and when; that the user adds the remote and pushes.
- [ ] **Step 5: Commit** — `"Phase 9: GitHub Actions CI"`, after approval. Then hand over to the user: create the private GitHub repo, `git remote add origin …`, push, and confirm the first `checks` run is green in the Actions tab.

---

## Gate (end of plan)

`pnpm lint && pnpm typecheck && pnpm test` green → full E2E through `run-locked.sh` green → `docker/stack.sh up && docker/stack.sh smoke` all PASS → `/code-review` and `/security-review` on the branch (focus: Dockerfile user and secrets, nginx headers and proxying, CI permissions and secret handling) → secret scan of the staged diff → commit with the user's approval.
