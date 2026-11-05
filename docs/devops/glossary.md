# Glossary

Terms are added as each stage introduces them.

- **ADR (Architecture Decision Record):** a short note that records one decision, the options considered, and the reasons. Kept in `docs/devops/adr/`.
- **Attestation:** a signed statement about an artifact, such as "this image was built by this workflow from this commit" (provenance) or "these are its packages" (SBOM). Anyone can check the signature.
- **CD (Continuous Delivery / Deployment):** every change that passes CI _can_ be released at any time (delivery), or _is_ released automatically (deployment).
- **CI (Continuous Integration):** every change is built and tested automatically on a shared branch, so problems show up within minutes, not at release time.
- **Conventional Commits:** a commit message format, `type(scope): subject`, that tools can read. `feat` means a new feature, `fix` a bug fix, `!` a breaking change.
- **Digest:** the SHA-256 hash of an image's manifest, like `sha256:4b3d…`. It names exactly one image and can't be moved. A tag (`main`, `1.0.1`) is a name that can point to a different digest tomorrow.
- **DORA metrics:** four measures of delivery performance: deploy frequency, lead time for changes, change failure rate, and time to restore service.
- **Drift:** a difference between what the code says and what actually exists, usually from a change made by hand. `tofu plan` reports it; Argo CD's self-heal undoes it.
- **Git hook:** a script git runs at a set moment, such as before a commit. lefthook shares hooks through the repo.
- **GitOps:** git is the single source of truth for what runs; an agent in the cluster (Argo CD) keeps pulling git and makes the cluster match it, instead of CI pushing changes in.
- **IaC (Infrastructure as Code):** infrastructure described in files that are reviewed, versioned and applied by a tool (OpenTofu), so it can be rebuilt exactly.
- **Idempotent:** running it again changes nothing. `tofu apply` twice in a row: the second run has no changes.
- **Keyless signing:** signing with a short-lived certificate tied to an identity (here, the workflow's OIDC token) instead of a long-lived private key. Sigstore's Fulcio issues the certificate; its Rekor log records every signature publicly.
- **LimitRange:** per-namespace defaults and ceilings for each container's CPU and memory, applied when a pod doesn't set its own.
- **NetworkPolicy:** a firewall rule for pods, by labels and namespaces. Once any policy selects a pod, only the traffic some policy allows gets through.
- **OIDC token (in Actions):** a token GitHub issues to a workflow run that states who it is: repository, workflow file, branch. Other services (Sigstore, a cloud) can trust it instead of a stored secret.
- **Pod Security Admission (PSA):** Kubernetes' built-in check of pods against the Pod Security Standards (`privileged`, `baseline`, `restricted`), set by namespace labels. `enforce` rejects; `warn` and `audit` only report.
- **Provider (OpenTofu):** the plugin that turns resources in `.tf` files into API calls (Kubernetes, Helm, a cloud). Pinned in `versions.tf`, checksummed in `.terraform.lock.hcl`.
- **Push protection:** GitHub rejects a push that contains a known secret format.
- **ResourceQuota:** a per-namespace cap on total CPU, memory, pods, volumes and kinds of services.
- **Ruleset:** GitHub's branch protection rules: who can change a branch, and how.
- **SBOM (Software Bill of Materials):** the list of every package inside an artifact, with versions and licences. It answers "are we affected?" the day a new CVE is published.
- **Semantic versioning (semver):** `MAJOR.MINOR.PATCH`. Major means breaking changes, minor means new features, patch means fixes.
- **SLSA provenance:** a standard record (from the SLSA framework) of how an artifact was built: source commit, workflow, builder, inputs.
- **Squash merge:** all of a PR's commits are combined into one commit on `main`.
- **State (OpenTofu):** OpenTofu's record of what it created, mapping each resource in code to a real object, so it can update or delete it later.
- **Trunk-based development:** everyone integrates small changes into one main branch (the "trunk") often, through short-lived branches.
