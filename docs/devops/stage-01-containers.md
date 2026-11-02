# Stage 1: Containers

**Goal:** the app runs as three small, non-root images that behave the same on any machine, and one command brings up the whole stack. Every later stage (CI, Kubernetes, GitOps) ships these images.

## What we built

| Piece                        | Where                           | Why it matters                                                                                                                                                               |
| ---------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One multi-stage `Dockerfile` | repo root                       | Build tools stay in early stages; the runtime images get only what runs. Three targets: `api`, `migrate`, `web`.                                                             |
| `.dockerignore`              | repo root                       | The build context excludes `.env*`, `.git`, tests, docs and `node_modules`. A file that never reaches the builder can't leak into a layer.                                   |
| nginx config                 | `docker/nginx/`                 | Serves the web build and proxies `/api` on the same origin, so session cookies stay first-party. Sets cache rules and security headers, and allows 12 MiB uploads (imports). |
| Compose stack                | `docker/compose.stack.yaml`     | Postgres → migrate (a one-off job) → API → web. Each waits for the previous one to be healthy or to finish.                                                                  |
| `stack.sh`                   | `docker/stack.sh`               | `init` (random secrets in `.env.stack`, never printed), `up`, `seed-admin`, `smoke`, `logs`, `down`.                                                                         |
| Smoke checks                 | `docker/smoke.ts`               | 12 named checks against the running stack. They prove the parts that only break once containers and a proxy are involved.                                                    |
| Store pruning                | `docker/prune-node-modules.mjs` | Removes the packages that pnpm links but the image never loads (see "Lessons" below). The API image shrank from 470 MB to 389 MB.                                            |

### The images

| Image     | Base                                  | User        | Size (uncompressed / compressed) | What's in it                                                                     |
| --------- | ------------------------------------- | ----------- | -------------------------------- | -------------------------------------------------------------------------------- |
| `api`     | `node:22.23.3-bookworm-slim` (digest) | 1000 (node) | 389 MB / 113 MB                  | Production dependencies, API and shared sources, the generated Prisma client     |
| `migrate` | same                                  | 1000 (node) | 655 MB / 180 MB                  | The above, plus the Prisma CLI and schema engine, migrations and the seed script |
| `web`     | `nginx-unprivileged:1.30.6-alpine`    | 101 (nginx) | 68 MB / 27 MB                    | nginx, its config and the Vite build                                             |

The users are numeric on purpose. Kubernetes' `runAsNonRoot` can only verify a numeric UID (Stage 5).

### Hardening, layer by layer

- **No secrets in the image.** Config comes from environment variables at run time. `.dockerignore` keeps `.env*` out, and Trivy's secret scanner confirms it.
- **Non-root, minimal runtime.** npm, npx and corepack are deleted from the Node runtime: nothing installs packages at run time, and the bundled npm is where most base-image CVEs live.
- **Read-only containers** in compose (`read_only`, `tmpfs: /tmp`), all Linux capabilities dropped, `no-new-privileges`. `init: true` gives the API a real PID 1 that forwards `SIGTERM`, so Fastify shuts down cleanly.
- **The database isn't published.** Only the stack network reaches Postgres; only nginx is published, on `127.0.0.1:8080`.
- **The client IP is trusted from exactly one hop.** The stack network is fixed (`172.30.0.0/24`), nginx is `172.30.0.10`, and `TRUST_PROXY` names only that address. A browser sending its own `X-Forwarded-For` is ignored (the `client-ip` smoke check proves it).
- **Pinned bases.** Versions are at least 14 days old; digests are pinned and Renovate refreshes them (see [versions.md](versions.md)).

## Run it

```bash
docker/stack.sh init         # once: writes .env.stack (mode 600) with random secrets
docker/stack.sh up           # build and start; waits until everything is healthy
docker/stack.sh seed-admin   # first admin; the password is in .env.stack
docker/stack.sh smoke        # 12/12 PASS expected
open http://localhost:8080   # sign in as admin
docker/stack.sh down         # keeps the data; `down -v` wipes it
```

Stop the dev Postgres (`docker compose stop`) first if RAM is tight. The stack uses about 300 MB while idle.

## How we verified it

| Check                                                          | Result                                                   |
| -------------------------------------------------------------- | -------------------------------------------------------- |
| `docker/stack.sh smoke`, on a fresh volume and on a reused one | 12/12 PASS                                               |
| A second `up` re-runs migrate                                  | `No pending migrations to apply.` (a no-op)              |
| `seed-admin` twice                                             | `created`, then `exists` (idempotent)                    |
| `hadolint` v2.15.1                                             | no findings                                              |
| `shellcheck` v0.11.0 on `stack.sh`                             | no findings                                              |
| `trivy image` 0.76.0, HIGH/CRITICAL with a fix, plus secrets   | api, web, migrate: clean                                 |
| `dive` v0.13.1                                                 | api 99.0 %, migrate 99.4 %; web 84.5 % (explained below) |

## Lessons worth remembering

1. **`--prod` doesn't mean "only what runs".** `@prisma/client` and Better Auth list the `prisma` CLI as an _optional peer_. Because the API has the CLI as a dev dependency, the lockfile resolves that peer, and pnpm links the CLI, Prisma Studio and an embedded Postgres (about 200 MB) even into a production install. `prune-node-modules.mjs` walks the dependency graph from the API, skips those edges, and deletes the rest. The smoke checks prove nothing needed was removed.
2. **A filtered install still brings the workspace root.** `pnpm install --filter @qa/api...` also links the root's dev tools (eslint, lefthook, commitlint). Trivy found CVEs in lefthook's Go binary and in the shadcn CLI's dependencies, inside the migrate image, which never uses either. The same prune step removes them.
3. **Most "image CVEs" are in tools you don't run.** Every API finding was inside the npm bundled with Node. Removing what you don't need beats patching it.
4. **Patching on top of a base costs space.** The web image runs `apk upgrade` because the current nginx build still ships a vulnerable brotli and curl. That rewrites those files in a new layer, which is why dive scores it at 84.5 %. The fix is upstream: when Renovate proposes a newer base digest, the upgrade becomes a no-op and the wasted bytes disappear.
5. **`add_header` in nginx doesn't inherit.** A location with any `add_header` drops the server-level ones. The security headers live in a snippet that each static location includes, and `/api` gets none, because helmet in the API already sets them (the `security-headers` smoke check catches duplicates).

## Exercise (about 30 minutes)

1. **Read the layers.** Run `docker history qa-portal-api:local`. Find the largest layer and say which `COPY` made it. Then run `docker run --rm -it -v /var/run/docker.sock:/var/run/docker.sock wagoodman/dive:v0.13.1 qa-portal-api:local` and browse `/app/node_modules`.
2. **See what pruning saves.** In the `Dockerfile`, comment out `&& node /tmp/prune-node-modules.mjs prisma`, rebuild with `docker build --target api -t api-unpruned .`, and compare `docker image ls`. Put the line back.
3. **Break a healthcheck.** In `compose.stack.yaml`, override the API's healthcheck to fetch `/api/nope`. Run `docker/stack.sh up` and watch it time out: `web` never starts, because it waits for a healthy API. Read `docker inspect --format '{{json .State.Health}}' qa-portal-stack-api-1`. Revert.
4. **Prove the proxy trust.** Set `TRUST_PROXY: 127.0.0.1` for the API, run `up` and `smoke`, and watch `client-ip` fail: every client now looks like nginx, so they would all share one sign-in rate limit. Revert.
5. **Find a CVE yourself.** Run `docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:0.76.0 image node:22.23.3-bookworm-slim`. Compare it with the scan of `qa-portal-api:local`, and explain why the API image has fewer findings than its own base.

**What you learned:** an image is a stack of layers you can inspect and measure. Small and non-root isn't a style preference; every package you don't ship is a CVE you never have to patch.
