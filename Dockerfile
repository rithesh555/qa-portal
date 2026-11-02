# QA Portal images, from one multi-stage build. See docs/devops/stage-01-containers.md.
#
#   docker build --target api     -t qa-portal-api .
#   docker build --target migrate -t qa-portal-migrate .
#   docker build --target web     -t qa-portal-web .
#
# Base images are pinned by digest. Renovate refreshes them (security patches).
ARG NODE_IMAGE=node:22.23.3-bookworm-slim@sha256:3ed98443660ff48413b5af19ecefce3b9d50845a901a43420d47cc63a9fddbe9
ARG NGINX_IMAGE=nginxinc/nginx-unprivileged:1.30.6-alpine@sha256:f5116ed4606f3eb015dd4a8e28cb9b351476dc0ad4bc6e9f93b19cec130cdf03

# ---------------------------------------------------------------- base
# Node + pnpm (the version from package.json "packageManager").
FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm \
    COREPACK_HOME=/corepack \
    PATH=/pnpm:$PATH \
    CI=true
RUN corepack enable && corepack prepare pnpm@12.11.2 --activate
WORKDIR /app

# ---------------------------------------------------------------- manifests
# Only what pnpm needs to resolve dependencies. This layer changes only when
# dependencies change, so the install below stays cached across code edits.
FROM base AS manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY e2e/package.json e2e/

# ---------------------------------------------------------------- build
# Every dependency (dev included), the Prisma client, and the web bundle.
FROM manifests AS build
# --ignore-scripts: the root `prepare` (lefthook) needs a git repo. Run only
# the install scripts we need: Prisma's engines (for `migrate deploy`).
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts \
      --filter "@qa/api..." --filter "@qa/web..." \
 && pnpm rebuild prisma @prisma/engines
COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/
COPY apps/web/ apps/web/
COPY tsconfig.base.json ./
RUN pnpm --filter @qa/api db:generate \
 && pnpm --filter @qa/web build

# ---------------------------------------------------------------- api-deps
# Production dependencies of the API and @qa/shared only, minus the Prisma
# CLI that optional peers drag in (see docker/prune-node-modules.mjs).
FROM manifests AS api-deps
COPY docker/prune-node-modules.mjs /tmp/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --ignore-scripts \
      --filter "@qa/api..." \
 && node /tmp/prune-node-modules.mjs prisma

# ---------------------------------------------------------------- migrate-deps
# The API's dependencies plus its dev tools the migrate job needs (the Prisma
# CLI and its schema engine, dotenv for the seed). Not the web app's tooling.
FROM manifests AS migrate-deps
COPY docker/prune-node-modules.mjs /tmp/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts --filter "@qa/api..." \
 && pnpm rebuild prisma @prisma/engines \
 && node /tmp/prune-node-modules.mjs vitest pino-pretty @types/node

# ---------------------------------------------------------------- runtime
# Node without npm, npx or corepack: nothing at runtime installs packages, and
# the bundled npm is where most base-image CVEs live.
FROM ${NODE_IMAGE} AS runtime
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
      /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
WORKDIR /app

# ---------------------------------------------------------------- migrate
# One-off job: `prisma migrate deploy` (default), or the admin seed:
#   docker run … qa-portal-migrate node prisma/seed.ts
FROM runtime AS migrate
COPY --from=migrate-deps /app/node_modules ./node_modules
COPY --from=migrate-deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=migrate-deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/shared/src packages/shared/src
COPY apps/api/package.json apps/api/prisma.config.ts apps/api/
COPY apps/api/prisma apps/api/prisma
COPY apps/api/src apps/api/src
COPY --from=build /app/apps/api/src/generated apps/api/src/generated
WORKDIR /app/apps/api
USER 1000:1000
CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]

# ---------------------------------------------------------------- api
# Runtime: Node runs the TypeScript sources directly (type stripping), so
# there is no compile step and no pnpm. Files stay root-owned and read-only
# for the `node` user that runs the server.
FROM runtime AS api
ENV NODE_ENV=production \
    API_HOST=0.0.0.0 \
    API_PORT=3000
COPY --from=api-deps /app/node_modules ./node_modules
COPY --from=api-deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=api-deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/shared/src packages/shared/src
COPY apps/api/package.json apps/api/
COPY apps/api/src apps/api/src
COPY --from=build /app/apps/api/src/generated apps/api/src/generated
WORKDIR /app/apps/api
USER 1000:1000
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
# Fastify closes cleanly on SIGTERM (src/server.ts). Compose and Kubernetes add an init.
CMD ["node", "src/server.ts"]

# ---------------------------------------------------------------- web
# nginx (non-root, port 8080) serving the Vite build and proxying /api.
FROM ${NGINX_IMAGE} AS web
# Security fixes Alpine has published since the base image was built.
# Renovate's digest updates make this a no-op once the base catches up.
USER 0
RUN apk upgrade --no-cache
USER 101:101
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY docker/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/healthz"]
