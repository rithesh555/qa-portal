# ADR 0001: Trunk-based development with squash-merged PRs and release-please

- **Status:** accepted
- **Date:** 2026-11-02
- **Deciders:** maintainer

## Context

Until Phase 9 every change was committed straight to a local `main`. The project is now a public GitHub repo, and we want the workflow a company would use. We need four things:

- reviewable changes;
- automated checks before anything reaches `main`;
- a readable history;
- versions and changelogs nobody has to write by hand.

## Options considered

1. **GitFlow** (`develop`, `release/*`, `hotfix/*` branches).
   - Pros: explicit release branches.
   - Cons: long-lived branches drift apart and cause merge pain. It's heavyweight for continuous delivery, and most teams have moved away from it.
2. **Trunk-based development.** Short-lived feature branches merge into `main` through PRs, and `main` is always releasable.
   - Pros: small batches, fast feedback. DORA research links it with high delivery performance.
   - Cons: needs good automated checks, and feature flags for big unfinished work.
3. **Merge-commit PRs vs squash PRs.**
   - Squash gives one commit per PR, which is easy to revert.
   - Merge commits keep every WIP commit.

## Decision

- **Trunk-based development.**
- **Squash merges only**, with the PR title as the commit message.
- **Conventional Commits** for messages and PR titles. They're checked locally by commitlint (lefthook `commit-msg`) and in CI (`pr-title` workflow).
- **release-please** reads those titles, keeps a release PR up to date, and tags `vX.Y.Z` with a generated `CHANGELOG.md`.
- **`main` ruleset:** PRs required, linear history, no force pushes and no deletion, with nobody able to bypass it. Required approvals are 0 while there is one maintainer; raise it to 1 when the team grows. Required status checks are added in Stage 2.

## Consequences

- `main` stays clean and linear, and reverting a PR means reverting one commit.
- Version numbers follow the meaning of the changes (`feat` means minor, `fix` means patch, `!` means major).
- PRs created by the default `GITHUB_TOKEN` (the release PR) don't trigger other workflows. A GitHub App token fixes that if required checks ever need to run on release PRs.
- Large features need to land in small, safe slices, or behind a flag.
