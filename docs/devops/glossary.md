# Glossary

Terms are added as each stage introduces them.

- **ADR (Architecture Decision Record):** a short note that records one decision, the options considered, and the reasons. Kept in `docs/devops/adr/`.
- **Attestation:** a signed statement about an artifact, such as "this image was built by this workflow from this commit" (provenance) or "these are its packages" (SBOM). Anyone can check the signature.
- **CD (Continuous Delivery / Deployment):** every change that passes CI _can_ be released at any time (delivery), or _is_ released automatically (deployment).
- **CI (Continuous Integration):** every change is built and tested automatically on a shared branch, so problems show up within minutes, not at release time.
- **Conventional Commits:** a commit message format, `type(scope): subject`, that tools can read. `feat` means a new feature, `fix` a bug fix, `!` a breaking change.
- **Digest:** the SHA-256 hash of an image's manifest, like `sha256:4b3d…`. It names exactly one image and can't be moved. A tag (`main`, `1.0.1`) is a name that can point to a different digest tomorrow.
- **DORA metrics:** four measures of delivery performance: deploy frequency, lead time for changes, change failure rate, and time to restore service.
- **Git hook:** a script git runs at a set moment, such as before a commit. lefthook shares hooks through the repo.
- **Keyless signing:** signing with a short-lived certificate tied to an identity (here, the workflow's OIDC token) instead of a long-lived private key. Sigstore's Fulcio issues the certificate; its Rekor log records every signature publicly.
- **OIDC token (in Actions):** a token GitHub issues to a workflow run that states who it is: repository, workflow file, branch. Other services (Sigstore, a cloud) can trust it instead of a stored secret.
- **Push protection:** GitHub rejects a push that contains a known secret format.
- **Ruleset:** GitHub's branch protection rules: who can change a branch, and how.
- **SBOM (Software Bill of Materials):** the list of every package inside an artifact, with versions and licences. It answers "are we affected?" the day a new CVE is published.
- **Semantic versioning (semver):** `MAJOR.MINOR.PATCH`. Major means breaking changes, minor means new features, patch means fixes.
- **SLSA provenance:** a standard record (from the SLSA framework) of how an artifact was built: source commit, workflow, builder, inputs.
- **Squash merge:** all of a PR's commits are combined into one commit on `main`.
- **Trunk-based development:** everyone integrates small changes into one main branch (the "trunk") often, through short-lived branches.
