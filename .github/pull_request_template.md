## What

<!-- One or two sentences. The PR title is the squash commit: use a Conventional Commit, e.g. "feat(runs): bulk assign". -->

## Why

<!-- The problem or the goal. Link the issue if there is one: Closes #123 -->

## How it was verified

<!-- Paste evidence, not "it works". -->

- [ ] `pnpm lint && pnpm typecheck && pnpm test`
- [ ] E2E (`e2e/scripts/run-locked.sh`), or N/A because no app code changed
- [ ] New or changed endpoints have authorization tests (admin, lead, tester, viewer, non-member, deactivated)
- [ ] Screens checked on desktop, phone and dark mode, or N/A

## Risk and rollback

<!-- What could break, who notices, and how to undo it (revert, migration down, flag). -->

## Checklist

- [ ] No secrets, tokens or real user data in the diff
- [ ] Docs updated (README, `docs/devops/`, runbooks) where behaviour or operations changed
- [ ] New dependencies are at least 2 weeks old and pinned
