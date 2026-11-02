# Glossary

Terms are added as each stage introduces them.

- **ADR (Architecture Decision Record):** a short note that records one decision, the options considered, and the reasons. Kept in `docs/devops/adr/`.
- **CI (Continuous Integration):** every change is built and tested automatically on a shared branch, so problems show up within minutes, not at release time.
- **CD (Continuous Delivery / Deployment):** every change that passes CI _can_ be released at any time (delivery), or _is_ released automatically (deployment).
- **Conventional Commits:** a commit message format, `type(scope): subject`, that tools can read. `feat` means a new feature, `fix` a bug fix, `!` a breaking change.
- **DORA metrics:** four measures of delivery performance: deploy frequency, lead time for changes, change failure rate, and time to restore service.
- **Git hook:** a script git runs at a set moment, such as before a commit. lefthook shares hooks through the repo.
- **Push protection:** GitHub rejects a push that contains a known secret format.
- **Ruleset:** GitHub's branch protection rules: who can change a branch, and how.
- **Semantic versioning (semver):** `MAJOR.MINOR.PATCH`. Major means breaking changes, minor means new features, patch means fixes.
- **Squash merge:** all of a PR's commits are combined into one commit on `main`.
- **Trunk-based development:** everyone integrates small changes into one main branch (the "trunk") often, through short-lived branches.
