# Phase 8.5: UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `apps/web` a distinctive, consistent visual identity ("Warm paper") and a strict design system, without changing what any screen does.

**Architecture:** Look and feel live in one token layer (`apps/web/src/index.css`, CSS variables mapped through Tailwind v4 `@theme inline` onto shadcn's variable names), so every shadcn primitive restyles at once. Shared composites (PageHeader with FactPills, CaseLane, DataError, and the result-status pieces) sit between the primitives and the features. Screens then move over one at a time behind the existing E2E and axe gates.

**Tech Stack:** React 19, Vite, TypeScript, Tailwind v4, shadcn/ui on Base UI 1.9.0, TanStack Query, React Router 8.4.0, `@fontsource-variable` packages for self-hosted fonts.

**Spec:**

- The user's brief (2026-10-26): it must look really interesting, with clean borders and colours; Claude may pitch the direction.
- The user chose Direction B, "Warm paper" (2026-10-26).
- CLAUDE.md § Rules and § Phase workflow.
- Mockups: https://claude.ai/artifact/CbrzKhPRkF78YwAkMWhcx8. The B row is the visual spec: B Projects, B Run execution, B Defects list, B Sign in and B Design system. The A row stays on the canvas for reference only.

## Open questions and assumptions (answer before Task 1)

1. **Direction:** B "Warm paper" (chosen by the user, 2026-10-26).
2. **Global search:** dropped for now (user, 2026-10-26). It is a feature plus an API change, not part of this phase.
3. **Sidebar:** light, `--paper-2` with an ink-filled current item (user, 2026-10-26, after comparing it with an ink sidebar).
4. **Dark mode:** assumed to stay a user choice (the existing theme menu), with B's warm dark palette.
5. **Coral and fail red sit close in hue** (`#B8432F` vs `#B42318`). Kept as is (user, 2026-10-26): they stay apart by role. Coral is never a fill, only a ring, underline or focus outline, and a failed result is always filled with an icon and the word.
6. **Labels and copy:** assumed unchanged. A visible label that changes on purpose updates `e2e/catalogue` and the specs in the same task.
7. **Phase order:** Phase 8.5 runs before the Phase 9 infrastructure plan (user, 2026-10-26). CLAUDE.md § Scope gains the line in Task 1.
8. **Execution:** native, in this session, with one fresh reviewer on the whole branch at the end (user, 2026-10-26).
9. **Browser checks:** a short Playwright MCP walkthrough at the end of each task group. The user asked for it per phase, which replaces the 2026-10-19 "one pass at the end" decision for this phase. The memory note gets updated.

## Global Constraints

- **Behaviour is frozen:** no API, DB schema, auth flow, route or permission-rule change. Out of scope: Phase 9 items.
- **Dependencies:** new npm packages only `@fontsource-variable/instrument-sans` 5.3.0 and `@fontsource-variable/geist-mono` 5.3.0 (both published 2026-07-19, checked with `npm view <pkg> time`). `@fontsource-variable/ibm-plex-sans` is removed. Fonts are self-hosted, so no Google Fonts at runtime. Prisma stays 7.10.0. No other upgrades.
- **Components:** UI primitives come from the shadcn MCP/registry. Restyle through tokens first. Where a primitive must change, re-pull it from the registry and carry over local fixes: tabs `text-foreground/70` (F2), `ButtonLink` (F1).
- **Look vs rules (the brief's conflict rule):** Hallmark decides the look. Accessibility, consistency and usability win over it. Each overruled Hallmark rule is listed under Trade-offs below.
- **Colour:** every colour is a token in `index.css`. No literal colour, raw palette class (`amber-500`) or `text-[#…]` in `.tsx`.
- **Contrast and focus:** text 4.5:1, large text and UI parts 3:1, in both modes. `--ring` is coral. shadcn primitives keep their focus pattern (a solid `border-ring` plus a 3px `ring-ring/50` halo; the solid border alone is 4.9:1 on paper). Custom focusable elements use `outline: 2px solid var(--ring)` at 2px offset, shown instantly.
- **Status is never colour alone:** a result is icon + word + colour; severity is bar count + word; defect status is a word in a keyline, with no result hues.
- **Motion:** `transform`, `opacity` and colour only, 150–300 ms, never `transition-all`. The existing `prefers-reduced-motion` rule stays.
- **E2E stability:** all 311 E2E cases and the axe sweep (light and dark) stay green after every task. Roles and accessible names are the contract.
- **Permissions:** role-aware UI goes through `useCan()` (Task 2). There are no `role === …` checks in components.
- **Process:** TDD for shared logic and composites. Never run two API test runs at once. E2E only through `e2e/scripts/run-locked.sh`. Commit only with the user's approval; the user pushes.

## Discovery (done 2026-10-26)

- **Routes (20):** sign-in, home, projects, all releases, users, print report, and inside a project: overview, cases (list, new, import, page, edit), runs (list, new, execution), defects (list, new, page), releases, reports, members, plus the not-found pages.
- **Components:**
  - 33 shadcn primitives in `components/ui`
  - 14 shared components in `components`
  - feature modules under `features/{auth,cases,defects,projects,reports,runs,users}`
- **Largest files** (refactor candidates, split only where a task touches them):
  - `cases/import-page.tsx` 1358 lines
  - `reports/reports-page.tsx` 1143
  - `runs/run-page.tsx` 934
  - `runs/run-case-pane.tsx` 934
  - `cases/case-editor-page.tsx` 886
- **Tokens** are already centralised in `index.css`, including status, defect and chart tokens. The refresh changes values and adds roles; it doesn't restructure.
- **Hard-coded styles:**
  - literal colours in 3 files: `reports/print-page.tsx` (17), `components/project-tile.tsx` (8), `runs/run-status.tsx` (4)
  - raw `amber-*` classes in `cases/case-editor-page.tsx` (5)
  - arbitrary values: 37 `text-[…]` (e.g. `text-[10px]`, `text-[#5a6270]`), 15 `grid-cols-[…]`, 13 `max-h-[…]`
- **Ad-hoc role checks:** `reports/home-page.tsx:106,112`, `reports/releases-overview-page.tsx:93,165`, `projects/project-layout.tsx:91,128`. Project-level checks already use `allowed()` from `project-layout.tsx:115`.
- **Query keys:** already one factory per feature (`caseKeys`, `runKeys`, `defectKeys`, `projectKeys`, `reportKeys`, `usersKeys` in each `features/*/api.ts`). That convention is kept and documented, not rebuilt.

### Hallmark audit summary

`sloplint --scope app` over `apps/web/src`, static tier. The render tier needs `puppeteer-core`, which isn't installed by choice.

| Gate                 | Count              | What                                                                                     | Plan                                                                |
| -------------------- | ------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 48 colour literal    | 17 real + 52 false | print-page literals; the 52 are `.dark` tokens the linter doesn't treat as a token block | Task 1                                                              |
| 67 tracked caps      | 16                 | `tracking-widest` shortcut hints in command/dropdown, uppercase labels                   | Task 1                                                              |
| 63 middle-dot meta   | 11                 | "No release · PAY-R-12" style strings                                                    | Task 4 onward, per screen: FactPills or line breaks; see Trade-offs |
| 19 dash in copy      | 12                 | ranges such as "1–20 of 40"                                                              | waived, see Trade-offs                                              |
| 10a `transition-all` | 8                  | shadcn badge, button, sidebar                                                            | Task 1                                                              |
| 29 glass scrim       | 3                  | `backdrop-blur` on dialog, alert-dialog, sheet overlays                                  | Task 1                                                              |
| 54 eyebrow           | 2                  | print report "Release report" kicker; case-details label                                 | Task 7 / Task 5                                                     |
| 64 mono label        | 2                  | "Editing · version" in mono                                                              | Task 6                                                              |
| 74 default palette   | 1                  | amber classes in the case editor                                                         | Task 1                                                              |
| 20 / F16             | 2                  | no stamp; `::selection` and scrollbar unthemed                                           | Task 1                                                              |

UI UX Pro Max (`--design-system`, "QA test management enterprise dashboard data dense") agrees on the essentials:

- style "Data-Dense Dashboard", blue for data with amber highlights
- 4.5:1 text contrast, visible focus, reduced motion, checks at 375/768/1024/1440

Its "Enterprise Gateway" pattern and Fira fonts are for marketing sites and are not used.

## Design direction

**B: Warm paper (chosen).** Calm enough for all-day sessions, with one memorable object:

- **Ground and surfaces:** warm grey paper (`#F6F3EF`), a sidebar one step darker, white-warm cards (`#FFFDFB`) in 1px rules at 8px radius. No shadows on surfaces, only on popovers. No cards in cards.
- **Ink and accent:** charcoal ink (`#221B17`) fills primary buttons and the current nav item. One coral accent (`#B8432F`) is used only for focus, the current case ring, link underlines and the "New" defect status.
- **Shape:** pills (999) for buttons, nav items, segmented tabs and status; 8px surfaces; 6px inputs.
- **Fonts:** Instrument Sans for everything you read, Geist Mono for keys and counts, with tabular numerals.
- **Signature, the case lane:** a run shows as a row of case pills, filled by result, with the current one ringed in coral. It appears on run execution, and a small static lane on sign-in. Progress elsewhere is a rounded ProgressBar.
- **Dark mode:** warm near-black paper (`#1B1714`), lighter status hues, coral lifts to `#F08A72`.
- **Why it fits:** status hues stay reserved for results, so the identity lives in shape (pills, ink fills) and one accent, which keeps dense tables quiet.

**A: Drafting table (not chosen).** Prussian ink, a grid ground, a TitleBlock header and a DimensionBar. Kept on the canvas for reference.

### Trade-offs (accessibility and usability over Hallmark)

- **Gate 9/67** (no tracked caps): kept as Hallmark says, since it helps readability. No trade-off.
- **Gate 10** (no middle-dot meta strings): page headers use FactPills instead. Dense table cells and the case pane's meta line (key, version, result) keep one "·", because breaking them costs a row of height in tables people scan all day.
- **Gate 19** (no dashes): numeric ranges keep the en dash ("1–20 of 40"), the standard notation.
- **Gate 26a** reported "no `:focus-visible` anywhere" in single folders. Focus lives in the shadcn primitives (`focus-visible:` utilities), so that was a false positive. Task 1 still unifies the focus colour into one `--focus` token.
- **Coral theme rules:** pills everywhere. Table rows, inputs and surfaces stay square-ish (6–8px), because pill inputs waste width and pill rows scan badly. Status pills shrink to 12.5px text in tables.
- **App type scale:** 14px body in tables and forms (Hallmark's page rule says 16px). Its app-screen branch allows the 1.125–1.2 scale, and density is the design here.
- **Case lane at scale:** a pill per case reads well up to about 60 cases. Above that the lane wraps inside a capped, scrollable box and the ProgressBar carries the summary (see Review Focus 3).

## Target structure (`apps/web/src`)

```
index.css                 tokens (single source) → @theme inline → shadcn variables
components/ui/            shadcn primitives (registry), themed by tokens only
components/composites/    new: page-header.tsx (PageHeader, FactPills), case-lane.tsx,
                          result-status.tsx (ResultStatus, ResultIcon), severity-mark.tsx,
                          data-state.tsx (DataError); result-status.tsx (moved from features/runs)
components/               existing shared pieces (button-link, search-box, list-pagination, ...)
hooks/use-can.ts          new: the one permission helper
features/<module>/        unchanged layout; api.ts keeps the <module>Keys factory + hooks
app/                      shell (app-shell.tsx, nav), router, guards
```

TanStack Query convention (documented in `apps/web/README.md`, enforced in review):

- Keys come only from the feature's `<module>Keys` factory.
- Hooks are `use<Thing>` (query) and `use<Verb><Thing>` (mutation) in that `api.ts`.
- Mutations invalidate through the factory.
- Toasts that must survive unmount go after `mutateAsync` (F6).

## Review Focus

1. **Contrast regressions on secondary text** (muted ink on the sidebar `--paper-2`, captions on `--paper-3` selected rows, white text on the blocked fill) in either mode. Expected: 4.5:1. Task 1 adds axe checks of the table header and caption states; the existing sweep covers 22 pages in both modes.
2. **Current case vs failed case in the lane:** a failed case that is also the current one. Expected: it stays filled red with its icon and word, and gains the coral ring with a card-coloured gap, so both read. Task 3 adds a unit test; Task 6 a screenshot check in both modes.
3. **CaseLane with a big run** (300 cases) and at 375px. Expected: the lane wraps inside a box capped at about four rows that scrolls on its own, the current pill is scrolled into view, and the page never scrolls sideways. Task 3 adds unit tests; Task 6 a phone-width E2E assertion.
4. **ProgressBar at the extremes:** 0 cases, all untested, a single case, all passed. Expected: no NaN or zero-width artefacts, and its label reads "— complete: 0 passed, …" (current wording, kept while behaviour is frozen). Task 3 adds unit tests.
5. **Print report** (`/projects/:key/reports/print`) after its literal colours move to tokens. Expected: still black on white when printed, whichever theme the screen is in. Task 7 adds an E2E check with `emulateMedia({ media: "print" })` in dark mode.

---

### Task 1: Tokens, fonts and global fixes (every screen changes at once)

**Files:**

- Modify:
  - `apps/web/src/index.css` (values for every token; new `--paper-2`, `--paper-3`, `--rule-strong`, `--focus`, `--on-status`, `--print-*`; `::selection`, `scrollbar-color`; a Hallmark check stamp on line 1)
  - `apps/web/package.json` (the two new `@fontsource-variable` packages in, Plex Sans out)
  - the shadcn primitives that `transition-all` (`components/ui/{badge,button,sidebar}.tsx`): named transitions instead
  - the `components/ui/{dialog,alert-dialog,sheet}.tsx` overlays: solid scrim, no `backdrop-blur`
  - `components/ui/{command,dropdown-menu}.tsx` shortcut hints: untracked, sentence case
  - `features/cases/case-editor-page.tsx:211` (amber classes → `warning` tokens)
  - `CLAUDE.md` § Scope (the Phase 8.5 line)
- Test: `e2e/tests/a11y/pages.spec.ts` (two new states, below); `apps/web/src/index.css` is checked by the sloplint run in Step 4.

**Interfaces:**

- Produces Tailwind utilities through `@theme inline`. The surfaces keep shadcn's names (no aliases): `bg-background` is paper, `bg-card` is the card, `bg-muted`/`bg-accent` is paper-3, `bg-sidebar` is paper-2.
  - new roles: `border-rule-strong`, `text-brand`/`text-brand-ink` (coral, never a fill), `text-on-status` (text on a filled result), `warning`, `warning-ink`, `warning-surface`
  - results: the existing `status-{pass,fail,blocked,skipped}` and `status-*-ink`
  - severity: `text-severity-{critical,major,minor,trivial}`
- `font-sans` (Instrument Sans Variable) and `font-mono` (Geist Mono Variable). No display face.
- Radii: `--radius` 8px for surfaces, inputs 6px, and buttons, badges, tabs and nav items `rounded-full`.
- Values are the B boards' `:root` and `.dark` values, converted to OKLCH:
  - light: paper `#F6F3EF`, paper-2 `#EFEBE6`, paper-3 `#E7E2DC`, card `#FFFDFB`, ink `#221B17`, ink-2 `#3B322C`, muted `#675D56`, rule `#DED7CF`, rule-strong `#CFC6BC`, accent and focus `#B8432F`, pass `#2F7D4F`, fail `#B42318`, blocked `#9A5B06`, skipped `#675D56`, untested `#A79C93`, on-status `#FFFFFF`, severity critical `#B42318`, major `#B4501A`, minor `#9A5B06`, trivial `#675D56`
  - dark: paper `#1B1714`, paper-2 `#221D19`, paper-3 `#2B2520`, card `#241F1B`, ink `#F3EDE7`, ink-2 `#DCD3CA`, muted `#B3A79C`, rule `#3A322C`, rule-strong `#4A4038`, accent and focus `#F08A72`, pass `#6FCF97`, fail `#FF8A80`, blocked `#F2B84B`, skipped `#B3A79C`, untested `#7E726A`, on-status `#1B1714`, severity critical `#FF8A80`, major `#FDBA74`, minor `#F2B84B`, trivial `#B3A79C`
- shadcn mapping: `--primary` is ink (primary buttons are ink-filled), `--ring` is focus, `--accent` keeps shadcn's meaning (hover surface, paper-3); coral is `--brand`, never `--primary`.

- [ ] **Step 1: Add the two failing a11y states** to `pages.spec.ts`: `E2E-A11Y-023 table header and captions keep contrast: test case list` and `E2E-A11Y-024 dialog over the page keeps contrast: new run`, in light and dark. Add both to `e2e/catalogue/a11y.ts`. Run them on the current tokens; record whether they pass. They guard the new values, so a pass now is fine, but they must pass after Step 3.
- [ ] **Step 2: Install the fonts** (`pnpm --filter web add -E @fontsource-variable/instrument-sans@5.3.0 @fontsource-variable/geist-mono@5.3.0`, then remove Plex Sans). Replace the Plex Sans import in `index.css`.
- [ ] **Step 3: Rewrite the token values** in `:root` and `.dark`, add the new roles, and apply the primitive fixes listed above.
- [ ] **Step 4: Verify.**
  - `node .claude/skills/hallmark/scripts/sloplint.mjs apps/web/src --scope app --genre modern-minimal` reports 0 FAIL for gates 10a, 29, 48 (excluding the known `.dark` false positives, which the stamp's `waive` line records), 67 and 74.
  - `pnpm lint && pnpm typecheck && pnpm test` are green.
  - The full E2E suite through `run-locked.sh` is green, including the axe sweep in both modes.
- [ ] **Step 5: Browser walkthrough** (Playwright MCP) of sign-in, projects and one run at 375, 768 and 1440, in light and dark: screenshots, no layout breakage, focus ring visible on Tab.
- [ ] **Step 6: Bundle check.** Run `pnpm --filter web build` and compare total gzip JS and CSS with the build before this phase (record both in the commit message). Budget: JS +0 %, CSS +15 %, fonts latin subset only.
- [ ] **Step 7: Commit** "Phase 8.5: Warm paper tokens and global fixes", after approval.

### Task 2: One permission helper

**Files:**

- Create: `apps/web/src/hooks/use-can.ts`, `apps/web/src/hooks/use-can.test.tsx`
- Modify: `features/reports/home-page.tsx`, `features/reports/releases-overview-page.tsx`, `features/projects/project-layout.tsx` (the six `role ===` sites from Discovery)

**Interfaces:**

- Produces `useCan(): (action: Action) => boolean`. It reads the session user and, inside a project, `useProjectContext()`, and calls `can()` from `@qa/shared`. Outside a project it answers portal-level actions only.
- `project-layout.tsx` keeps `allowed` as an alias of `useCan()`, so existing call sites need no change in this task.

- [ ] **Step 1: Write the failing tests:**
  - `useCan` returns `true` for `projects:manage` as admin and `false` for a user.
  - Inside a project, a viewer gets `false` for `runs:execute` and a tester `true`.
  - A deactivated or absent user gets `false` for everything.
- [ ] **Step 2: Run** `pnpm --filter web test use-can`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement `useCan`** and replace the six ad-hoc checks. Use the existing shared actions (`projects:manage`, `users:manage`, `reports:workload`, `members:manage`, `runs:execute` and so on, from `packages/shared/src/permissions.ts`). The admin-only wording on Home and All releases maps to `projects:manage`. If a site needs an action the matrix lacks, **stop and ask**: adding one changes the shared matrix.
- [ ] **Step 4: Run** the web tests, and the authz E2E folder through `run-locked.sh`. Expected: PASS.
- [ ] **Step 5: Commit**, after approval.

### Task 3: Shared composites

Built 2026-10-27. Existing pieces are moved or reused, not duplicated (DRY):

- `components/composites/result-status.tsx`: the result pieces moved from `features/runs/run-status.tsx` (which re-exports them): `STATUS_FILL`, `STATUS_ICON`, `STATUS_PRESSED`, `ProgressBar` (the rounded progress track; its aria-label stays "N% complete: …" because E2E and screen-reader users rely on it), `StatusLegend`, `RunCaseStatusBadge`, `RunCaseStatusIcon`.
- Severity stays `SeverityIndicator` in `features/defects/defect-badges.tsx`; loading stays `PageLoading`; empty states stay shadcn `Empty`. Each is restyled with its screen in Tasks 5 and 6.

New:

- `PageHeader({ title, description?, facts?, actions?, className? })`: h1 (30px, 600, tight), description, actions; `facts: { label, value }[]` render `FactPills`, a `role="group"` named "{title} details" with one keyline pill per fact, wrapping.
- `CaseLane({ cases: { id, key, status }[], currentId, onPick, label?, className? })`: buttons named "{key}, {result}", `aria-current="true"` on the current one (coral ring with a card-coloured gap), filled by result with `text-on-status`; wraps inside a `max-h-40` scroll box and scrolls the current pill into view.
- `DataError({ title, error, onRetry })`: the "Couldn't load …" alert with "Try again" that 19 files build by hand today.

Tests (`components/composites/composites.test.tsx`, 8): PageHeader heading and actions; facts group keeps a 60-character value whole; no group without facts; CaseLane has exactly one current case; a failed current case keeps "Failed" in its name; picking calls `onPick(id)`; 300 cases in one scroll box with `scrollIntoView` on the current one; DataError text and retry.

### Task 4: Pilot: sign-in, app shell, then the projects list

**Files:**

- Modify:
  - `features/auth/login-page.tsx`: the B Sign in board. Left: an ink brand panel with the logo, a feature tour of five slides (headline + one sentence) that advances every 5 s, a case lane that fills as it advances, step buttons, and a Pause/Play button (WCAG 2.2.2). The tour starts paused under `prefers-reduced-motion`, and the panel stacks above the form under 60rem. Right: the form on paper.
  - Create `components/brand/logo.tsx`: `Logo({ size?, withWordmark? })`, the inline SVG mark (a Q made of a ring and a check, with a coral tail) using tokens only. Also export it as `public/favicon.svg`, replacing the current favicon.
  - `app/app-shell.tsx`: paper-2 sidebar, `Logo` (Q check) with the wordmark, project switcher as a pill button, ink-filled `aria-current` item, user block
  - `features/projects/project-switcher.tsx`
  - `components/ui/breadcrumb.tsx` (styling via tokens only)
  - `features/projects/projects-page.tsx`: PageHeader, the Active/Archived segmented tabs and the table from the B Projects board, with ProgressBar in "Latest run"
  - `components/project-tile.tsx`: delete if the table replaces it, otherwise tokenise its 8 literals
- Test: the existing `e2e/tests/{auth,shell,projects}` specs; new phone-width checks below.

**Interfaces:**

- Consumes: Task 3 composites and Task 2 `useCan`.
- The "New project" action renders only when `useCan()("projects:manage")`.

- [ ] **Step 1: Write the failing E2E checks:**
  - `E2E-SHELL-013 the sidebar marks the current page and collapses to a sheet under 60rem @mobile`
  - `E2E-PROJ-020 the projects table shows each latest run's progress and fits phone width @mobile`: every row's progress `img` has a label ending in "untested", and the page has no horizontal scroll at 375px (the table scrolls inside its panel)
    Add both to the catalogue.
- [ ] **Step 2: Run** them through `run-locked.sh -g "E2E-SHELL-013|E2E-PROJ-020"`. Expected: FAIL, since the projects list has no progress `img` yet.
- [ ] **Step 3: Build** the sign-in page, the shell and the projects list as listed above. Keep every accessible name.
- [ ] **Step 4: Run the gate:** lint, typecheck, `pnpm test`, the full E2E suite, and the browser walkthrough at 375/768/1440 in light and dark, keyboard only (Tab from the skip link through the nav to the first project).
- [ ] **Step 5: Run the `ux-reviewer` agent** on sign-in, shell and projects. Fix what it finds, or list the fixes for approval.
- [ ] **Step 6: Commit**, after approval. **Stop here for the user's sign-off on the pilot** before rolling the look out further.

### Task 5: Simple screens

Screens: Home, All releases, Project overview, Releases, Members, Users, Test cases list and case page, Import, Defects list and page (the B Defects list board), New defect, New run.

**Files:**

- Modify: the page component of each screen. Each adopts PageHeader (FactPills replace the middle-dot meta strings), ProgressBar or RunCaseStatusBadge/SeverityIndicator where status shows, the DataState components for its loading, empty and error branches, and tokens for every arbitrary `text-[…]`.

**Interfaces:**

- Consumes: Tasks 1–3 only. No new composites; anything missing goes back to Task 3 as an amendment.

- [ ] **Step 1: Write the failing test(s) for each screen group.** For each group, add one phone-width E2E assertion that the page header's facts group is visible and the page doesn't scroll sideways. The groups:
  - home and releases
  - project overview, members and releases
  - users
  - cases
  - defects
  - new run
- [ ] **Step 2: Restyle one group, then run that group's E2E folder** through `run-locked.sh` and the web unit tests. Expected: PASS before starting the next group.
- [ ] **Step 3:** After the last group, run `grep -rnE "text-\[#|oklch\(|\b(bg|text|border)-(amber|red|green|blue|slate|gray)-[0-9]" apps/web/src --include=*.tsx`. Expected: no output, except `print-page.tsx`, which Task 7 covers.
- [ ] **Step 4: Run the full gate**, the browser walkthrough and `ux-reviewer`, then commit after approval (one commit per group is fine).

### Task 6: Complex screens through the mockup review

Screens: test case editor, run execution, dashboard/reports.

For each screen, follow CLAUDE.md's workflow:

1. A clickable mockup board on the same canvas (run execution already has B Run execution).
2. Then, **in parallel**, the `ux-reviewer` agent (source review of the board) and a general-purpose agent acting as a QA manager (domain fit, missing states, risks).
3. Merge their findings into one list and get the user's approval.
4. Update the board, then build.

**Files:**

- Modify: `features/cases/case-editor-page.tsx` (and `steps-editor.tsx`), `features/runs/run-page.tsx`, `features/runs/run-case-pane.tsx`, `features/reports/reports-page.tsx`, `features/reports/charts.tsx`.
- Split a file only where the screen's restyle touches it and it is over 800 lines, along existing seams (e.g. `run-case-pane.tsx` → `result-buttons.tsx`, `case-steps-table.tsx`).

- [ ] **Step 1: Mockup and parallel reviews** for each screen. The merged findings go to the user, and the user approves.
- [ ] **Step 2: Write the failing checks:**
  - `E2E-RUN-048 the current case and result buttons show a focus ring on Tab`: the computed `outline-style` is `solid`.
  - `E2E-RUN-049 the case lane fits phone width and keeps the current case in view @mobile`: no horizontal page scroll at 375px, and the `aria-current` pill is inside the lane's visible box.
  - Chart colours: run `node <dataviz skill>/scripts/validate_palette.js "<result hues>" --mode light` and the same with `--mode dark`. Expected: PASS, or contrast WARN only where every series is labelled.
- [ ] **Step 3: Build each screen** to its approved board. Keep F4 (queued shortcut), F8 (per-case drafts) and F20 (closing-popup shortcuts) working.
- [ ] **Step 4: Run** the full gate, the keyboard-only pass of run execution (every shortcut in `?`) and the browser walkthrough. Commit each screen after approval.

### Task 7: Print report and close-out

**Files:**

- Modify: `features/reports/print-page.tsx`: its 17 literal colours move to `--print-*` tokens, and the eyebrow folds into the title.
- Test: `e2e/tests/reports/print.spec.ts`

- [ ] **Step 1: Write the failing test** `E2E-RPT-017 the print report stays black on white in dark mode`. With `colorScheme: "dark"` and `page.emulateMedia({ media: "print" })`, the `main` computed `background-color` is `rgb(255, 255, 255)` and the `h1` is near-black.
- [ ] **Step 2: Run it.** Expected: FAIL if any colour comes from the theme.
- [ ] **Step 3: Move the colours to tokens.** Run it: PASS.
- [ ] **Step 4: Phase close-out:**
  - re-run `sloplint` over `apps/web/src`: every gate in the audit table resolved or waived in the stamp, with its reason
  - the full gate from CLAUDE.md and the full E2E suite
  - the bundle check against Task 1's baseline
  - `ux-reviewer` across all screens
  - `/code-review`
  - publish the E2E run to QAE2E
- [ ] **Step 5: Commit** "Phase 8.5: UI refresh complete", after approval. Then update the memory note on browser testing and the build-plan status.

## Risks and migration

- **Incremental by construction:** Task 1 changes the look of every screen through tokens alone. Before Tasks 4–7 reach a screen, it looks refreshed but keeps its old layout, which is never broken, just older. Each later task touches one screen group and ships on its own.
- **E2E as the safety net:** roles and names are the contract, so a purely visual change can't break a spec. A spec that breaks means behaviour or a name changed, and the task stops to find out which.
- **shadcn drift:** re-pulling a primitive could drop local fixes (F1 `ButtonLink`, F2 tabs). Each re-pull diffs against the current file and carries the fixes over; the a11y sweep catches F2 regressions.
- **Fonts and bundle:** two font families replace one (latin subset, `font-display: swap`), a net gain of one family. The budget is checked in Task 1 and at close-out.
- **Scope creep:** the global-search bar and any "while we're here" feature stay out. New features go to the user as proposals, not into this phase.
- **Phase order:** Phase 9 (the infrastructure plan) waits until Task 7 is committed, so the images and load tests cover the final UI.
