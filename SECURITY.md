# Security policy

## Reporting a vulnerability

**Please don't open a public issue.** Report privately through GitHub instead:
[Security → Report a vulnerability](https://github.com/rithesh555/qa-portal/security/advisories/new).

Include what you found, how to reproduce it, and the impact you expect.

- You'll get an acknowledgement within **3 working days**.
- You'll get an assessment within **10 working days**.
- Once a fix ships, we credit you in the advisory, unless you'd rather we didn't.

## Supported versions

Only the latest release (and `main`) gets security fixes.

## How this project handles security

- **Access model.** It's enforced on the API from one permission matrix in `packages/shared`. Anything you can't access answers 404.
- **Authentication.** Better Auth with username and password, using database sessions in httpOnly cookies. There's no public sign-up.
- **Secrets.**
  - They never go in git.
  - Local secrets live in `.env` files, which git ignores.
  - Cluster secrets are encrypted with SOPS (from Phase 9 on).
  - Secret scanning with push protection is on.
- **Dependencies.**
  - Every version is at least 2 weeks old. pnpm enforces this with `minimumReleaseAge`.
  - Versions are pinned.
  - Renovate proposes updates, and `pnpm audit` runs in CI.
  - Every audit exception is documented in `pnpm-workspace.yaml`, with a review date.
