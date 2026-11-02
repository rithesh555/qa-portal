# Contributing

## Workflow

1. **Branch** from `main`. Use a short name: `feat/runs-bulk-assign`, `fix/defect-409`, `phase-9/stage-2-ci`.
2. **Commit** using [Conventional Commits](https://www.conventionalcommits.org). The `commit-msg` hook checks the format. Examples:
   - `feat(runs): assign several cases at once`
   - `fix(api): return 404 for archived projects`
   - `docs(devops): stage 2 notes`
3. **Push** the branch and open a PR. Fill in the template. The **PR title becomes the squash commit**, so it must be a Conventional Commit too; CI checks it.
4. **Merge.** Once the required checks pass, the PR is squash-merged. `main` only changes through PRs; the ruleset blocks direct pushes, force pushes and deletion.
5. **Release.** release-please keeps a release PR open with the next version and its changelog. Merging that PR tags the release.

| Type                                   | Version bump |
| -------------------------------------- | ------------ |
| `feat`                                 | minor        |
| `fix` or `perf`                        | patch        |
| `feat!` or a `BREAKING CHANGE:` footer | major        |
| anything else                          | no release   |

## Local setup

See the [README](README.md). `pnpm install` also installs the git hooks from `lefthook.yml`. They run three checks:

- Prettier on staged files;
- gitleaks on staged changes (a local binary, or Docker if gitleaks isn't installed);
- commitlint on the commit message.

## Rules that always apply

- **Run the gate before asking for review.** `pnpm lint && pnpm typecheck && pnpm test` must all pass. Run the E2E suite too whenever app code changes (`e2e/scripts/run-locked.sh`).
- **Write tests first** for API services and shared logic.
- **Test every new endpoint for authorization.** Cover each role: admin, lead, tester, viewer, non-member and deactivated.
- **Dependencies:** versions at least 2 weeks old, pinned exactly. pnpm enforces this with `minimumReleaseAge`; don't bypass it.
- **No secrets in git.** If gitleaks flags a false positive, add its fingerprint to `.gitleaksignore` with a reason.
