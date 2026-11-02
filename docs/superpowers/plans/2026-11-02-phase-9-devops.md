# Phase 9: End-to-end DevOps for the QA Portal (corporate-grade, learn-as-we-build)

## Context

Phases 1–8.5 are built and committed (`36235cc`, `2e3eb9d`, `3ad0596`), and the Playwright E2E suite exists (323 cases, results published to QAE2E). Phase 9 turns the app into something a real company could run. The user wants it treated as a corporate project, done the way the market does it today, and wants to **learn DevOps** from it.

The earlier draft (`docs/superpowers/plans/2026-10-26-phase-9-infrastructure.md`: Dockerfile, nginx, compose stack, Locust, a single CI file) stopped at "images + compose, no deploy". This plan replaces it and reuses its container, nginx, smoke and Locust design as Stages 1 and 8.

**User decisions (2026-11-02):**

- **Where it runs:** a local Kubernetes cluster first; real cloud is a later, optional stage.
- **RAM:** the machine has **8 GB RAM and can't spare more**, so the local platform must be lean.
- **Repo:** a **public GitHub repo**. That gives free Actions minutes on 4 vCPU / 16 GB runners, CodeQL, secret scanning with push protection, and dependency review.
- **Pace:** **learn as we build.** Every stage ends with a "what and why" note, a runbook, and a hands-on exercise.

**Guiding principle for 8 GB:** heavy and ephemeral work runs in GitHub Actions. That covers the test suites, image builds, scans, and the throwaway clusters that prove deploys. The laptop runs one lean, long-lived k3d cluster, using two profiles (`core`, `observe`) that are switched on as needed. Dev Postgres and the E2E stack stay stopped while the cluster runs.

---

## Global constraints (carry over and add)

- **Versions:**
  - Every tool, image, chart, action and package version must be **≥ 2 weeks old** and pinned exactly. Images are pinned by digest, actions by full commit SHA with the tag in a comment, Helm charts by version.
  - Renovate keeps these pins current, with `minimumReleaseAge: "14 days"`. That matches the existing `pnpm-workspace.yaml` `minimumReleaseAge: 20160`.
  - Prisma stays 7.10.1 until the user says otherwise. Node is 22.
- **App behaviour stays frozen**, with these flagged exceptions. Each one is additive, built with TDD, and needs the user's OK when its stage starts:
  1. a `/api/metrics` endpoint plus OpenTelemetry tracing (Stage 7);
  2. JSON logs that carry `trace_id` (Stage 7);
  3. optionally, rate limits moved out of memory (ADR in Stage 4).
- **Runtime facts to respect:**
  - The API runs `.ts` with Node type stripping, so never use `pnpm deploy` and never put the workspace under `node_modules`.
  - The API listens on `API_HOST=0.0.0.0` in containers.
  - `NODE_ENV=production` needs https origins, except on localhost.
  - Unsafe requests need `Origin == WEB_ORIGIN`.
  - `TRUST_PROXY` must name exactly the proxy hop.
  - Imports go up to 12 MiB.
  - Per-user limits live in memory, so the API runs **one replica** (`apps/api/src/lib/rate-limits.ts`).
  - Probes already exist: `/api/health` (liveness) and `/api/ready` (DB check, rate limited by `PROBE_LIMIT`; `apps/api/src/routes/health.ts`). Graceful SIGTERM shutdown is already in `apps/api/src/server.ts`.
- **Secrets:**
  - Never in git in plain text, and never printed.
  - Local secrets live in `.env*` (git-ignored).
  - Cluster secrets live in git **encrypted with SOPS + age**.
  - CI secrets live in GitHub Environments secrets, with OIDC wherever a cloud is involved.
- **Git:**
  - From Phase 9 on: short-lived feature branches, then a PR, then squash merge to `main`.
  - The push hook stays: **the user pushes**. Claude opens PRs with `gh pr create` once a branch is pushed, and commits only with the user's approval.
- **Tests:** never run two API test runs at once; E2E runs locally only via `run-locked.sh`.
- **Skills and docs:**
  - Use the skills `docker-patterns`, `multi-stage-dockerfile`, `security-and-hardening`, `observability-and-instrumentation`, `playwright-best-practices`, `test-driven-development` and `verification-before-completion`.
  - Look up Kubernetes, Helm, Argo CD, OpenTofu, OTel, Grafana and Actions docs with Context7 before writing config.

---

## Target architecture

```
Developer ─► feature branch ─► PR ─► GitHub Actions (CI)
                                   ├─ lint · typecheck · unit · API integration (Postgres service)
                                   ├─ E2E (Playwright, sharded) · axe a11y
                                   ├─ SAST: CodeQL · Semgrep │ secrets: Gitleaks │ deps: dependency-review, pnpm audit
                                   ├─ Dockerfile lint (hadolint) · IaC/K8s lint (tflint, kubeconform, Checkov/Trivy config)
                                   ├─ build images (BuildKit cache) → Trivy scan → SBOM (Syft) → cosign sign + SLSA provenance
                                   └─ ephemeral k3d cluster in CI: helm install → smoke → E2E against it
merge to main ─► images pushed to GHCR (sha + semver tags) ─► release-please PR (changelog, version)
             ─► CI bumps image tag in deploy/envs/dev (GitOps commit)
Argo CD (in the local k3d cluster) watches deploy/ ─► syncs dev ─► (PR) staging ─► (PR + approval) prod
Cluster: Traefik (Gateway API) · cert-manager (local CA, TLS) · CloudNativePG (+ backups to MinIO)
         · SOPS-decrypted Secrets · Kyverno (policies, verify cosign signatures) · NetworkPolicies · PSA "restricted"
Observability (profile "observe"): OTel Collector → Grafana LGTM (Prometheus/Mimir, Loki, Tempo, Grafana)
         · dashboards + SLO alerts as code → Discord/Slack webhook
Load & security tests against staging: Locust · OWASP ZAP baseline
Later (optional): same chart + GitOps on a cloud cluster via OpenTofu modules
```

**Why these choices (market standard in 2026, lean enough for 8 GB):**

| Area          | Choice                                                                | Why                                                                                   |
| ------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| CI            | GitHub Actions + reusable workflows                                   | Repo host; free on a public repo; the default in most teams                           |
| Registry      | GHCR                                                                  | Free, tied to the repo, supports OCI artifacts (signatures, SBOMs)                    |
| Local K8s     | **k3d** (k3s in Docker)                                               | Lightest real Kubernetes (~0.5 GB); ships Traefik and a network-policy controller     |
| Ingress       | **Gateway API** via Traefik                                           | ingress-nginx is retired upstream (2026); Gateway API is the successor standard       |
| Packaging     | **Helm** chart for the app                                            | The most widely used K8s packaging; per-environment values files                      |
| GitOps        | **Argo CD** (core install)                                            | The most common GitOps tool; core mode saves RAM                                      |
| IaC           | **OpenTofu** (Terraform-compatible)                                   | Open-source Terraform; manages cluster add-ons now, cloud later                       |
| Database      | **CloudNativePG** operator                                            | The standard Postgres-on-K8s operator: backups, PITR, failover                        |
| Backups       | MinIO (S3 API)                                                        | Lets us learn S3 backup/restore locally; swaps for real S3 later                      |
| Secrets       | **SOPS + age**                                                        | Encrypted in git, works with Argo CD; age is replaced by cloud KMS later              |
| Policy        | **Kyverno**                                                           | YAML policies (no Rego), verifies cosign signatures                                   |
| Supply chain  | Syft SBOM, Trivy, cosign keyless, GitHub attestations                 | SLSA-style provenance; what audits ask for now                                        |
| Observability | **OpenTelemetry** + Grafana **LGTM** all-in-one (`grafana/otel-lgtm`) | One ~1 GB container instead of four stacks; the same OTel code works with any backend |
| Deps          | **Renovate**                                                          | Grouped PRs, a 14-day release age, pins actions/images/charts                         |
| Releases      | **release-please** + Conventional Commits                             | Automatic changelog, semver tags, release PRs                                         |
| Load          | Locust (already chosen)                                               | Python, scriptable; thresholds decide the exit code                                   |
| DAST          | OWASP ZAP baseline                                                    | Standard passive scan of the running app                                              |

Exact versions are chosen at execution time (≥ 2 weeks old) and recorded in `docs/devops/versions.md`.

---

## Repository layout (new)

```
.github/
  workflows/  ci.yml (PR gate) · build.yml (images, sign, SBOM) · deploy-preview.yml (ephemeral k3d)
              · release.yml (release-please) · security.yml (CodeQL, Scorecard, nightly Trivy)
              · nightly.yml (full E2E, ZAP, load-smoke) · _reusable-*.yml
  CODEOWNERS · pull_request_template.md · ISSUE_TEMPLATE/ · dependabot.yml (actions security alerts only)
renovate.json · .pre-commit / lefthook.yml · commitlint.config.js · release-please-config.json
SECURITY.md · CONTRIBUTING.md
Dockerfile · .dockerignore · docker/ (nginx/default.conf, compose.stack.yaml, smoke.ts, stack.sh)
deploy/
  charts/qa-portal/      Helm chart: api, web, migrate Job, seed-admin Job, HTTPRoute, NetworkPolicies, PDB, SA
  platform/              Argo CD apps for add-ons (traefik config, cert-manager, cnpg, minio, kyverno, sops)
  envs/{dev,staging,prod}/  values.yaml, image tag, encrypted secrets (*.sops.yaml)
  argocd/                app-of-apps root, AppProjects
infra/
  local/                 OpenTofu: k3d cluster bootstrap + Argo CD install (helm provider)
  modules/               reusable modules (namespace-baseline, argocd)
  cloud/ (later)         OpenTofu for a cloud cluster + managed Postgres
load/ (locustfile.py, seed_load.py) · security/zap/ (rules)
observability/ dashboards/*.json · alerts/*.yaml · slo.md
docs/devops/
  00-overview.md · adr/ (0001-k3d, 0002-gitops-argo, 0003-single-api-replica, …)
  stage-NN-*.md (what & why + exercise) · runbooks/ · versions.md · glossary.md
```

---

## Stages (each one is a PR or a few PRs, independently shippable)

Every stage ends with:

1. its "what and why" note in `docs/devops/stage-NN-*.md`, plus a hands-on exercise;
2. CI green on the PR;
3. the user's approval, then squash merge.

### Stage 0: Repo and ways of working (the SDLC baseline)

- **Repo:** create the public repo (the user does this), add the remote, and push the existing history.
- **Branch rules:** a ruleset on `main` with required PRs, required status checks, a linear history and signed commits (optional), and no force pushes. Add `CODEOWNERS`, PR and issue templates, `SECURITY.md` (private vulnerability reporting on) and `CONTRIBUTING.md`.
- **Commits and releases:**
  - Conventional Commits, enforced by commitlint in CI and locally by a lefthook commit-msg hook.
  - release-please produces versioning and `CHANGELOG.md`; the first release is `v1.0.0` = Phase 8.5.
- **Local hooks (lefthook, fast):**
  - prettier on staged files (the existing Claude hook stays);
  - **gitleaks** `protect --staged`;
  - commitlint.
- **Renovate:** config grouped per ecosystem (npm, actions, docker, helm, tofu), `minimumReleaseAge: 14 days`, automerge off, and a dependency dashboard issue.
- **GitHub security settings:** secret scanning with push protection, Dependabot **alerts** (no update PRs; Renovate owns updates), and private vulnerability reporting.
- **Docs:** `docs/devops/00-overview.md` (the map of everything) and ADR template 0000.
- **Exercise:** open a PR with a bad commit message and with a fake secret, and watch both get blocked.

### Stage 1: Containers (reuses the old Tasks 1–2)

- **One multi-stage `Dockerfile`** with stages `deps` → `build` → targets `migrate`, `api` and `web`:
  - The `web` target uses `nginx-unprivileged` (alpine).
  - The base image is pinned by digest. Everything runs non-root, uses `tini`/`init`, has a `HEALTHCHECK`, and has no secrets in any layer.
  - The `api` image stays under 400 MB.
- **nginx config:** SPA fallback, `/api` proxy, cache headers (`index.html` no-cache, `/assets` immutable), security headers plus a CSP, `client_max_body_size 12m`, `server_tokens off`.
- **Compose stack:** `docker/compose.stack.yaml` with `db`, `migrate`, `api` and `web` on `:8080`, and its own volume. `docker/stack.sh` wraps it, and `docker/smoke.ts` runs the 12 named checks from the old plan (Review Focus: client IP, SPA vs API 404, cache headers, upload size, migrate re-run).
- **Image checks:** hadolint and `trivy image` run locally; `dive` reports image efficiency.
- **Exercise:** shrink the image, read `docker history`, and break a healthcheck.

### Stage 2: Continuous integration (PR gate)

- **`ci.yml`** calls reusable workflows. Jobs run in parallel with `paths` filters:
  - `lint-typecheck`;
  - `unit` (shared and web);
  - `api-integration` (Postgres 17 service container);
  - `e2e` (Playwright on the GitHub runner, sharded into 2 parts with the blob reports merged, HTML report as an artifact);
  - `docker` (build all targets with the GHA cache backend, hadolint, Trivy with a fail on HIGH/CRITICAL fixable, compose smoke);
  - `workflow-lint` (actionlint and **zizmor** for workflow security).
- **Security workflow (`security.yml`):** CodeQL (javascript-typescript), Semgrep CE, `dependency-review-action` on PRs, OpenSSF **Scorecard** with its badge, and gitleaks across the history.
- **Hardening:**
  - `permissions: {}` at the top of each workflow, granted per job;
  - pinned SHAs;
  - `step-security/harden-runner` in audit mode;
  - `concurrency` with cancel-in-progress;
  - no `pull_request_target`.
- **Required checks** go onto the `main` ruleset. A `pnpm store` cache plus a Playwright browser cache keeps runs fast. CI generates its secrets with `openssl rand` per run and never publishes to the dev portal.
- **Exercise:** make a PR that fails each gate in turn, and read the SARIF results in the Security tab.

### Stage 3: Artifacts and supply-chain security

- **`build.yml`** runs on `main` and on tags:
  - builds multi-arch images (amd64 and arm64 via QEMU; optional);
  - pushes `ghcr.io/<owner>/qa-portal-{api,web,migrate}`, tagged with `sha-<7>`, `main` and the semver tag from release-please;
  - attaches OCI labels.
- **Signing and attestations:**
  - an **SBOM** (Syft, SPDX JSON), attached as an attestation;
  - **cosign keyless** signing using GitHub OIDC;
  - **SLSA build provenance** (`actions/attest-build-provenance`).
- **Vulnerability management:** a nightly Trivy rescan of the published images opens issues. A `.trivyignore` holds only documented exceptions, each with an expiry date (same rule as `pnpm auditConfig`).
- **Exercise:** verify a signature and provenance with `cosign verify` and `gh attestation verify`, and inspect the SBOM.

### Stage 4: Local Kubernetes platform as code (lean)

- **The cluster (`infra/local` in OpenTofu):**
  - creates **k3d** with 1 server and 0 agents, a memory limit, the k3s Traefik with the Gateway API CRDs, and the k3s built-in network-policy controller;
  - installs **Argo CD (core)** with the helm provider.
  - Learning goals: state, `plan`/`apply`, modules, `tflint`, `tofu fmt`/`validate` in CI.
- **Argo CD takes over from there.** It installs the platform add-ons through the app-of-apps in `deploy/platform` and `deploy/argocd`:
  - cert-manager with a local self-signed CA (trusted in Windows via `mkcert`) → TLS on `https://qa.localtest.me`;
  - CloudNativePG operator;
  - MinIO (single node);
  - Kyverno (admission controller only, to save RAM);
  - the SOPS decryption plugin (KSOPS), with the age key installed once by hand. That manual step is documented as "secret zero".
- **Namespaces** `qa-dev`, `qa-staging` and `qa-prod`, each with a baseline:
  - Pod Security Admission `restricted`;
  - a default-deny NetworkPolicy;
  - ResourceQuota and LimitRange.
- **RAM budget:**
  - target ≤ 4 GB for the `core` profile (k3s, Argo CD core, CNPG, the app × 3 small envs, Kyverno);
  - `make cluster-stop` / `cluster-start` (k3d stop/start);
  - prod and staging can be scaled to zero when idle.
- **ADR 0003, single API replica:** explains why (in-memory per-user limits), its effect (no HPA, a brief blip on deploys), and the option of moving limits to Postgres or Valkey later (an app change).
- **Exercise:** destroy and recreate the whole cluster from code in one command; then a NetworkPolicy blocks a debug pod from reaching the DB.

### Stage 5: Application Helm chart and environments

- **`deploy/charts/qa-portal`:**
  - `api` Deployment: 1 replica, `strategy: Recreate`, probes on `/api/health` and `/api/ready`, a startupProbe, resources, `securityContext` (non-root, read-only root filesystem with a `/tmp` emptyDir, drop ALL capabilities, seccomp RuntimeDefault), `terminationGracePeriodSeconds` matched to the graceful shutdown.
  - `web` Deployment: 2 replicas, PDB, nginx config.
  - **migrate Job**: an Argo CD PreSync hook, run before the new API starts.
  - `seed-admin` Job: manual, or once per environment.
  - Services, an HTTPRoute, a ServiceAccount (automount off), and NetworkPolicies: web → api → db only, plus egress DNS.
  - The CNPG `Cluster` with 1 instance, a WAL archive and a ScheduledBackup to MinIO.
- **Config:** env values come from `deploy/envs/<env>/values.yaml` (`WEB_ORIGIN`/`BETTER_AUTH_URL` per hostname: `dev.qa.localtest.me` …). Secrets are `secrets.sops.yaml` (`BETTER_AUTH_SECRET`, seed-admin, DB credentials from the CNPG-generated secret).
- **Chart tests in CI:** `helm lint`, `ct lint`, `kubeconform` (strict, with CRD schemas), and Kyverno CLI policy tests. A **deploy-preview** job builds an ephemeral k3d in the runner, does a helm install, runs `docker/smoke.ts` against it, and runs a Playwright smoke subset (`@smoke` tag).
- **Exercise:** break a probe and watch the rollout stall; read events and logs with `kubectl`/`k9s`.

### Stage 6: GitOps continuous delivery and promotion

- **Argo CD Applications** for dev, staging and prod come from an ApplicationSet, using sync waves: secrets → database → migrate → api → web.
- **dev:** after `build.yml` succeeds on `main`, CI opens and auto-merges a PR that bumps `deploy/envs/dev/values.yaml` image tags by digest. Argo CD syncs automatically, with self-heal and prune on.
- **staging:** release-please cuts a tag, and a workflow opens a PR bumping staging to that version. Merging it means Argo syncs. Then **post-deploy checks** run against staging: smoke, the full Playwright E2E with `BASE_URL`, the Locust smoke, and a ZAP baseline. Results go to the QAE2E portal through the existing `e2e:publish`.
- **prod:** a promotion PR needs a reviewer (CODEOWNERS) and the GitHub Environment `production` protection rule; Argo CD sync stays manual in prod.
- **Rollback:**
  - `git revert` of the promotion commit, as the documented primary path;
  - Argo CD history rollback for emergencies;
  - database changes are expand/contract only, as a migration policy written into `docs/devops/runbooks/migrations.md`.
- **Kyverno:** enforces "images must be cosign-signed by this repo's workflow" in staging and prod, and audits in dev.
- **Self-hosted runner limit:** the laptop cluster isn't reachable from GitHub. Argo CD _pulls_ from git, so CD works anyway; post-deploy tests run as a local `make verify-staging`, or from a GitHub **self-hosted runner** in the cluster (optional, ARC lite).
- **Exercise:** ship a change dev → staging → prod; deploy a deliberately broken image and roll back by revert; edit a resource by hand and watch self-heal undo it.

### Stage 7: Observability and SLOs (profile `observe`)

- **App instrumentation (flagged app change, TDD):**
  - `@opentelemetry/sdk-node` with auto-instrumentation for http, fastify and pg, plus a Prisma instrumentation if it's mature;
  - export over OTLP;
  - RED metrics (rate, errors, duration per route), Node runtime metrics, and business counters (results recorded, defects logged);
  - pino logs get `trace_id`/`span_id`;
  - the web app gets optional Web Vitals beacons (later).
- **Backend:** an OTel Collector (agent → gateway) feeding `grafana/otel-lgtm` (Grafana, Prometheus/Mimir, Loki, Tempo in about 1 GB). Promtail-free: logs travel over OTLP or the collector's filelog receiver.
- **As code:**
  - Grafana dashboards in `observability/dashboards/*.json` (app RED, Postgres via the CNPG exporter, cluster);
  - alert rules in `observability/alerts/*.yaml`;
  - **SLOs** in `observability/slo.md`: availability 99.5 % over 30 days and p95 < 500 ms, with multi-window burn-rate alerts, sent to a Discord/Slack webhook kept in SOPS.
- **Exercise:** follow one slow request from a Grafana panel to its trace and its log line; set off a burn-rate alert with Locust and read the runbook it links.

### Stage 8: Performance and security testing

- **Locust:** the old plan's Task 3 design (seed 50 users, weighted tasks, thresholds p95 < 500 ms and failures < 1 % → exit code), run against staging. The smoke version (5 users, 1 min) runs post-deploy; the full version (50 users, 10 min) runs on demand. Results go into `load/README.md` and Grafana.
- **OWASP ZAP baseline** against staging, with a rules file of accepted findings; nightly, SARIF uploaded.
- **Container and K8s posture:**
  - `trivy k8s` / `kubescape` scan of the cluster against the NSA/CIS frameworks;
  - Checkov/Trivy config on `deploy/` and `infra/` in CI.
- **Exercise:** find the slowest endpoint from the load run plus its traces; triage one ZAP alert end to end.

### Stage 9: Reliability, backup/DR and operations

- **Backups:**
  - CNPG scheduled backups plus WAL to MinIO;
  - a **restore drill**: point-in-time recovery into a new cluster, then verify row counts, as a script plus a runbook. The README's existing `pg_dump` backup notes stay as the non-K8s path.
- **Runbooks** in `docs/devops/runbooks/`: deploy, rollback, failed migration, DB restore, secret rotation (`BETTER_AUTH_SECRET`, DB password, age key), certificate expiry, a full disk, "API 5xx alert".
- **Incident process:** a severity matrix, an incident issue template, and a blameless **postmortem** template, with one game-day exercise written up.
- **Chaos-lite game day:** kill the API pod during load, delete the DB pod, and fill a volume. Record MTTR.
- **Docs:** a DORA metrics note (deploy frequency, lead time, change failure rate, MTTR), measured from GitHub plus Argo CD history in a small script or dashboard.

### Stage 10 (later, optional, costs money): cloud

- **`infra/cloud`** in OpenTofu, with remote state (S3/GCS plus locking), OIDC from GitHub Actions to the cloud (no long-lived keys), a managed K8s cluster (or k3s on one VM to keep costs down), managed Postgres, object storage for backups, KMS for SOPS, a real DNS name, and Let's Encrypt.
- The same Helm chart and Argo CD setup. Only `deploy/envs/prod-cloud` and the platform values change.
- A cost guardrail (budget alert) plus a `tofu destroy` schedule.
- We decide provider and budget with the user before starting.

---

## Suggested tools and repos (all pinned, ≥ 2 weeks old)

| Purpose         | Tool / repo                                                                                                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cluster         | k3d-io/k3d, k3s-io/k3s, derailed/k9s (terminal UI)                                                                                                                                  |
| GitOps          | argoproj/argo-cd, argo-cd ApplicationSet                                                                                                                                            |
| Packaging       | helm/helm, helm/chart-testing, yannh/kubeconform                                                                                                                                    |
| IaC             | opentofu/opentofu, terraform-linters/tflint, bridgecrewio/checkov                                                                                                                   |
| Gateway / TLS   | traefik/traefik (Gateway API), cert-manager/cert-manager, FiloSottile/mkcert                                                                                                        |
| Database        | cloudnative-pg/cloudnative-pg, minio/minio                                                                                                                                          |
| Secrets         | getsops/sops, FiloSottile/age, viaduct-ai/kustomize-sops (KSOPS)                                                                                                                    |
| Policy          | kyverno/kyverno                                                                                                                                                                     |
| Supply chain    | anchore/syft, aquasecurity/trivy, sigstore/cosign, actions/attest-build-provenance                                                                                                  |
| CI security     | rhysd/actionlint, zizmorcore/zizmor, step-security/harden-runner, ossf/scorecard-action, gitleaks/gitleaks, semgrep/semgrep, github/codeql-action, actions/dependency-review-action |
| Dockerfile      | hadolint/hadolint, wagoodman/dive                                                                                                                                                   |
| Deps / releases | renovatebot/renovate, googleapis/release-please-action, conventional-changelog/commitlint, evilmartians/lefthook                                                                    |
| Observability   | open-telemetry/opentelemetry-js(-contrib), open-telemetry/opentelemetry-collector-contrib, grafana/docker-otel-lgtm                                                                 |
| Testing         | microsoft/playwright (existing), locustio/locust, zaproxy/action-baseline, kubescape/kubescape                                                                                      |

Claude Code helpers already available: the `docker-patterns`, `multi-stage-dockerfile`, `security-and-hardening` and `observability-and-instrumentation` skills; Context7 for docs; the agents `authz-auditor`, `ux-reviewer` and `/security-review`.

---

## Verification (how each stage proves itself)

- **Every PR:** CI green (all required checks). Locally: `pnpm lint && pnpm typecheck && pnpm test` and the full E2E via `run-locked.sh` whenever app code changes.
- **Stage 1:** `docker/stack.sh up && docker/stack.sh smoke` gives 12/12 PASS; a second `up` re-runs migrate as a no-op; the images are non-root and under budget; Trivy reports no fixable HIGH/CRITICAL.
- **Stage 2–3:** a deliberately failing PR per gate is blocked; `cosign verify` and `gh attestation verify` pass on a published image; the SBOM is present.
- **Stage 4–5:** `tofu apply` from zero gives a healthy cluster; Argo CD shows every app Synced/Healthy; `https://dev.qa.localtest.me` serves the app with valid local TLS; the CI deploy-preview job passes the smoke tests plus `@smoke` E2E.
- **Stage 6:** a commit flows dev → staging → prod with full E2E green against staging, published to QAE2E; a broken image is rolled back by revert in under 10 minutes; an unsigned image is rejected in staging.
- **Stage 7:** one request traced web → api → pg in Tempo, with its log line correlated; a burn-rate alert fires under Locust and reaches the webhook.
- **Stage 8:** Locust passes the thresholds on staging; the ZAP baseline has no unaccepted findings.
- **Stage 9:** the restore drill brings back the expected row counts; the game-day postmortem is written.
- **End of Phase 9:** `/code-review` and `/security-review` on each stage's PR; `authz-auditor` if any API code changed; the docs in `docs/devops/` are complete; the user can run the whole loop themselves from the docs.

---

## Open items to confirm at stage start (not blocking the plan)

1. Stage 0: the repo name, and whether to keep the full local history (recommended) or squash it.
2. Stage 7: approve the additive app changes (`/api/metrics`, OTel, `trace_id` in logs).
3. Stage 6: the alert channel (Discord or Slack webhook).
4. Stage 10: the cloud provider and monthly budget, when we get there.

The first execution step is to save this plan into the repo as `docs/superpowers/plans/2026-11-02-phase-9-devops.md`, mark the old `2026-10-26-phase-9-infrastructure.md` as superseded, and update CLAUDE.md § Scope (Phase 9) to match.
