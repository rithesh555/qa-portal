# Stage 0: Repo and ways of working

**Goal:** agree how changes flow before automating anything. Tools enforce a process; they can't invent one.

## What we set up, and why

| Piece                             | Where                                                                        | Why it matters                                                                                                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public GitHub repo                | github.com/rithesh555/qa-portal                                              | Free CI minutes, CodeQL and secret scanning on public repos. It's also your portfolio.                                                                              |
| `main` ruleset                    | Settings → Rules                                                             | `main` only changes through PRs: no force pushes, no deletion, linear history. This is the foundation of "main is always releasable".                               |
| Squash merges only                | Settings → General                                                           | One PR becomes one commit, which makes history readable and reverts trivial.                                                                                        |
| Secret scanning + push protection | Settings → Security                                                          | GitHub refuses a push that contains a known token format, before it becomes public.                                                                                 |
| Private vulnerability reporting   | Security tab                                                                 | Researchers can report problems without opening a public issue. See `SECURITY.md`.                                                                                  |
| Dependabot alerts                 | Security tab                                                                 | Tells us when a dependency has a known CVE. Renovate does the updating.                                                                                             |
| `CODEOWNERS`                      | `.github/`                                                                   | Says who must review which paths. It matters once there's a team; it also documents ownership now.                                                                  |
| PR and issue templates            | `.github/`                                                                   | Every PR states what, why, how it was verified, and how to roll back. Bug reports come in already triaged by severity and area.                                     |
| Conventional Commits              | `commitlint.config.js`, `lefthook.yml`, `pr-title.yml`                       | Machine-readable history: `feat:`, `fix:`, `docs:`… release-please turns it into versions and changelogs.                                                           |
| lefthook                          | `lefthook.yml`                                                               | Git hooks shared through the repo (plain `.git/hooks` aren't versioned). They run Prettier, gitleaks on staged changes, and commitlint.                             |
| gitleaks                          | lefthook pre-commit, `.gitleaksignore`                                       | Catches secrets on your machine, the cheapest place to catch them. Before going public we scanned all 26 commits: one false positive, now recorded with its reason. |
| Renovate                          | `renovate.json`                                                              | Opens grouped, scheduled update PRs. It pins exact versions and action SHAs, and only proposes versions at least 14 days old. Prisma needs explicit approval.       |
| release-please                    | `release-please-config.json`, `.release-please-manifest.json`, `release.yml` | Keeps a release PR open with the next semver version and changelog. Merging it tags the release.                                                                    |
| `SECURITY.md`, `CONTRIBUTING.md`  | repo root                                                                    | How to report problems, and how to contribute. GitHub links both from the repo page.                                                                                |

Background on the workflow choice: [ADR 0001](adr/0001-trunk-based-prs-and-releases.md).

## How a change flows now

1. `git switch -c feat/my-change`
2. Commit, e.g. `feat(runs): bulk assign`. The hooks check formatting, secrets and the message.
3. Push and open a PR. Its title must be a Conventional Commit, and the `pr-title` check enforces it.
4. Squash-merge. `release.yml` updates the release PR.
5. When you want a release, merge the release PR. That creates the tag `vX.Y.Z`, the GitHub release, and the `CHANGELOG.md` entry.

## Actions only you can do (one-off)

- **Let Actions open the release PR.** Settings → Actions → General → Workflow permissions: keep **"Read repository contents"** as the default, and tick **"Allow GitHub Actions to create and approve pull requests"**. Every workflow still starts from `permissions: {}` and asks for what it needs; this tick only lets `release.yml` open its release PR. It's off by default, and Claude doesn't change security settings for you.
- **Tag the starting point.** `gh release create v1.0.0 --target 4cf622d22e0340dde695e2840656c33665fbdec9 --title "v1.0.0" --notes "Phases 1–8.5: the complete app. Phase 9 (DevOps) starts here."` release-please counts from this point (`bootstrap-sha` in `release-please-config.json`; the version is in `.release-please-manifest.json`).

- **Install the Renovate app.** Go to https://github.com/apps/renovate → Install → choose only `rithesh555/qa-portal`. Renovate then opens an onboarding PR that checks `renovate.json`. Merge it, then look at the Dependency Dashboard issue.
- **Local hooks.** `pnpm install` installs them through the `prepare` script. Check with `pnpm exec lefthook run pre-commit`.

## Exercise (about 15 minutes)

1. **Bad commit message.** On a scratch branch, run `git commit --allow-empty -m "fixed stuff"`. commitlint rejects it with `type may not be empty`. Then try `git commit --allow-empty -m "chore: try the hooks"`; it passes.
2. **Fake secret.** Create `scratch.txt` containing `aws_secret_access_key = "AKIA` + 16 capital letters + `"`. Stage it and commit. gitleaks blocks the commit. Unstage it and delete the file.
3. **Bad PR title.** Push the scratch branch and open a PR titled `my change`. The `pr-title` check fails. Rename the PR to `chore: try the checks` and the check goes green. Close the PR without merging.
4. **Ruleset.** Run `git push origin HEAD:main` from the scratch branch. GitHub rejects it: changes must go through a pull request.

**What you learned:** policy as code. The rules live in the repo (or in repo settings you can export) and run automatically, the same for everyone.
