# QA Management Portal

Internal portal for managing QA work: login, home dashboard, projects, test cases, test runs, defects, reports, user management.

## Stack

- **Web:** React 19 + Vite + TypeScript, Tailwind v4, shadcn/ui, TanStack Query, React Router, React Hook Form + Zod (`apps/web`)
- **API:** Fastify 5 + TypeScript, Zod type provider, @fastify/swagger, pino, helmet, rate-limit, CORS (`apps/api`)
- **Auth:** Better Auth — username/password, DB sessions in httpOnly cookies. No public sign-up; admin creates users.
- **Access model:** portal role `admin` | `user`. Admin sees and manages everything and is the only one who creates/archives projects. Everyone else sees only projects they are members of, with a **per-project role** (`lead` | `tester` | `viewer`); project leads manage that project's members. The permission matrix lives in `packages/shared` — the web hides, the API enforces (inaccessible ids → 404). Users are deactivated, never deleted.
- **DB:** PostgreSQL 17 (Docker) + Prisma **7.10.0 pinned** — npm `latest` points at an 8.x release candidate; do not upgrade without asking.
- **Shared:** Zod schemas/types in `packages/shared`
- **Tests:** Vitest (unit + API integration against a separate test DB). The API suite resets that one test DB, so never run two API test runs at once (e.g. from parallel agents) — they break each other.
- **Monorepo:** pnpm workspaces. Node 22 LTS via nvm.

## Scope

- **Phases 1–8: the app only.** Order: 1 Foundation → 2 Access model & User management → 3 Projects, members & releases → 4 Test cases → 5 Test runs → 6 Defects → 7 Dashboard & Reports → 8 Hardening. `compose.yaml` runs PostgreSQL only. No file attachments in v1.
- **Phase 8.5 (UI refresh, before Phase 9):** the "Warm paper" look and design system, behaviour frozen. Plan: `docs/superpowers/plans/2026-10-26-phase-8-5-ui-refresh.md`.
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

## Phase workflow

- **Start:** for a phase with complex screens (test case editor, run execution, dashboard), publish a clickable design mockup, then have it reviewed in parallel by the `ux-reviewer` agent (source review of the mockup files: usability, a11y, consistency) and a general-purpose agent acting as an experienced QA manager (domain fit, open questions, missing features, risks for later phases). Merge their findings into one list, get the user's approval, update the mockup, and only then build.
- **Gate (end of every phase):** `pnpm lint && pnpm typecheck && pnpm test` all green (including authorization tests for every new endpoint: admin / lead / tester / viewer / non-member / deactivated) → walk through new screens with Playwright MCP → `ux-reviewer` agent on new/changed screens → `authz-auditor` agent on new/changed API routes → `/code-review` (plus `/security-review` in Phases 3 and 8) → `docker compose up` (Postgres) healthy and the app runs against it → commit with the user's approval.
- A PostToolUse hook runs Prettier on every edited file (`.claude/hooks/format-file.sh`).
