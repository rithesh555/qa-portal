# QA Management Portal

Internal portal for managing QA work: login, home dashboard, projects, test cases, test runs, defects, reports, user management.

## Stack

- **Web:** React 19 + Vite + TypeScript, Tailwind v4, shadcn/ui, TanStack Query, React Router, React Hook Form + Zod (`apps/web`)
- **API:** Fastify 5 + TypeScript, Zod type provider, @fastify/swagger, pino, helmet, rate-limit, CORS (`apps/api`)
- **Auth:** Better Auth — username/password, roles (Admin, QA Lead, Tester, Viewer), DB sessions in httpOnly cookies. No public sign-up; admin creates users.
- **DB:** PostgreSQL 17 (Docker) + Prisma **7.10.0 pinned** — npm `latest` points at an 8.x release candidate; do not upgrade without asking.
- **Shared:** Zod schemas/types in `packages/shared`
- **Tests:** Vitest (unit + API integration against a separate test DB)
- **Monorepo:** pnpm workspaces. Node 22 LTS via nvm.

## Scope

- **Phases 1–8: the app only** (foundation, then one module per phase, then hardening). `compose.yaml` runs PostgreSQL only.
- **Phase 9 (last, only once the app is fully developed; do not start without the user):** app Dockerfiles/nginx, CI/CD, Playwright E2E suite, Locust load tests.

## Rules — no guesswork

1. **Look up docs before writing library code.** Use the Context7 MCP (`resolve-library-id` → `query-docs`) for Fastify, Prisma, Better Auth, React, Tailwind, shadcn, TanStack Query, Zod. Never rely on memory for APIs, flags or config.
2. **UI components come from the shadcn MCP/registry**, not hand-generated copies.
3. **Use the matching skill** in `.claude/skills/` for each layer (`fastify-best-practices`, `better-auth-*`, `prisma-*`, `supabase-postgres-best-practices`, `api-and-interface-design`, `security-and-hardening`, `vercel-react-best-practices`, `tanstack-query-best-practices`, `tailwind-design-system`, `frontend-design`, `web-design-guidelines`).
4. **TDD** (test-driven-development skill) for API services and shared logic.
5. **Never claim something works without evidence** (verification-before-completion skill): run lint, typecheck and tests, and show the output.
6. **Debug systematically** (systematic-debugging skill): find the root cause before fixing.
7. If something is unclear or a doc can't be found, **ask the user** instead of assuming.
8. Git: a hook blocks push, `reset --hard`, `clean -f`, `branch -D`, `checkout .`, `restore .`. The user pushes.
9. Secrets live only in `.env` (git-ignored); keep `.env.example` up to date.

## Phase gate (end of every phase)

`pnpm lint && pnpm typecheck && pnpm test` all green → walk through new screens with Playwright MCP → `/code-review` → `docker compose up` (Postgres) healthy and the app runs against it.
