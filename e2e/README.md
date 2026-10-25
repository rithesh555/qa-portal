# End-to-end tests (Playwright)

The E2E suite drives the real portal in Chromium: every module, every role,
phone width, dark mode and an axe accessibility sweep. Each case also lives in
the portal itself (project **QA Portal E2E**, `QAE2E`), and every run can be
recorded there as a test run.

## Run it

```sh
pnpm e2e                                   # everything (≈13 min, 4 workers)
pnpm --filter @qa/e2e e2e tests/runs       # one folder
pnpm --filter @qa/e2e e2e -g E2E-RUN-014   # one case
pnpm --filter @qa/e2e e2e:report           # open the last HTML report
```

When several people or agents work at once, use `e2e/scripts/run-locked.sh
<args>` instead: the stack uses fixed ports and one database, so runs must take
turns.

## What a run does

- Starts its **own** API (port `E2E_API_PORT`, 3101) and a production build of
  the web app (`vite preview`, `E2E_WEB_PORT`, 5174) against its **own**
  database (`E2E_DATABASE_URL`). Your dev portal on 5173/3000 and its data are
  never touched. Set `E2E_WEB_MODE=dev` to use the Vite dev server instead.
- `scripts/prepare-db.ts` creates that database if needed and migrates it;
  `scripts/guard.ts` refuses anything that isn't local, lacks "e2e" in its
  name, or equals the dev/test database.
- Global setup wipes it and runs `apps/api/prisma/seed-e2e.ts`: one set of
  accounts per worker slot — `e2e.admin.N`, `e2e.lead.N`, `e2e.tester.N`,
  `e2e.viewer.N`, `e2e.outsider.N` (on no project), `e2e.deactivated.N`.
  Passwords come from `E2E_ADMIN_PASSWORD` / `E2E_USER_PASSWORD` in `.env`.
- The `auth` project signs every account in once (saved to `e2e/.auth/`,
  git-ignored); `setup` builds the read-only **BASE** project
  (`fixtures/baseline.ts`).
- Projects: `chromium` (all tests), `mobile` (Pixel 7, tests tagged `@mobile`),
  `dark` (dark colour scheme, tests tagged `@dark` or `@a11y`).

## Writing tests

- Start each title with its catalogue id: `E2E-RUN-014 failing needs a note`.
  Add the case to `catalogue/<module>.ts` (default export). `pnpm --filter
@qa/e2e e2e:catalogue:check` fails if a case has no test or a test no case.
- `import { test, expect, BASE } from "../../fixtures/index.ts"`, then
  `test.use({ role: "lead" })`. Fixtures: `project` (a throwaway project with
  this slot's lead, tester and viewer, plus `PortalApi` clients to seed data
  fast), `as(role)` (a second signed-in user), `api`, `slot`.
- Never change BASE; anything that writes uses `project`. On pages that show
  everyone's data (Users, admin lists, All releases), search for your own names
  and never assert totals.
- Locators: `getByRole` / `getByLabel` only (the app has no test ids). Base UI
  checkboxes: `getByRole("checkbox", { name })`. Selects and menus can ignore a
  click while opening: use `choose()` / `pickMenu()` from
  `fixtures/cases-helpers.ts`.
- After typing in a search box, wait for the rendered list, not just the URL:
  React Router updates the URL first and re-renders a moment later.
- Rate limits are per user and per IP; each worker sends its own
  `X-Forwarded-For`, and imports (10/min) run serially.
- A confirmed app bug: `test.fail(true, "App bug: …")`, plus an entry in
  `findings/app-findings.md`. Don't silence accessibility violations.

## Recording runs in the portal

One-off, on the dev portal (needs `SEED_ADMIN_*` in `.env`):

```sh
pnpm --filter @qa/e2e e2e:portal:setup     # account e2e.reporter + project QAE2E
```

Then, after a run:

```sh
pnpm --filter @qa/e2e e2e:catalogue:push   # add new catalogue cases to QAE2E
pnpm --filter @qa/e2e e2e:publish          # record results/results.json as a run
```

Each case's result is folded across projects: any failure → Failed (note: the
first error line per project), a known bug (`test.fail`) → Blocked, all skipped
→ Skipped, otherwise Passed (a pass on retry is noted). Cases not run stay
Untested. `pnpm --filter @qa/e2e e2e:catalogue:csv` writes the same cases as a
file for the portal's import screen.

Opening the E2E portal (5174) in your own browser signs you out of the dev
portal: both use the same cookie names on `localhost`.
