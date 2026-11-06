# Stage 4: Local Kubernetes platform as code

One command builds a real Kubernetes cluster on the laptop, with Argo CD and three guarded app environments. Another command deletes all of it. Nothing about the cluster is clicked or typed by hand, so it can always be rebuilt the same way.

The stage came in two parts. Part 1 is the cluster, Argo CD and the namespace baseline, all from OpenTofu. Part 2 hands over to Argo CD: one root Application installs the platform add-ons from git (cert-manager, CloudNativePG with its backup plugin, Garage for S3, the Traefik Gateway), and encrypted secrets in git are decrypted with SOPS. Kyverno, planned for this stage, moved to Stage 6 (see "Why Kyverno waits").

## What you get

```
infra/local/cluster.sh up
  │
  ├─ tofu apply infra/local/cluster     (root 1)
  │    └─ k3d cluster create --config infra/local/k3d.yaml
  │         one k3s server in Docker, 4 GiB cap, API on 127.0.0.1:6550
  │         bundled: Traefik, CoreDNS, local-path storage, network-policy controller
  │
  ├─ tofu apply infra/local/platform    (root 2)
  │    ├─ namespace argocd + Argo CD core (Helm chart, pinned) + KSOPS
  │    ├─ module namespace-baseline × 3 → qa-dev, qa-staging, qa-prod
  │    │    Pod Security "restricted" · default-deny NetworkPolicy (+ DNS)
  │    │    ResourceQuota · LimitRange
  │    └─ root Application "platform" (argocd-apps chart) + 3 AppProjects
  │
  └─ secret-zero.sh                     (the two secrets git can't hold)
       age private key → argocd/sops-age · local root CA → kube-system/local-ca

Argo CD, from git (deploy/argocd/platform → deploy/platform/*):
  wave 0  cert-manager
  wave 1  CloudNativePG operator · Garage (S3, KSOPS secret)
          · Traefik config (Gateway API, local-ca Issuer, *.qa.localtest.me certificate)
  wave 2  Barman Cloud plugin
  each wave starts when every Application in the one before is Healthy
```

| Piece            | Where                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Cluster config   | `infra/local/k3d.yaml`                                                                                                                     |
| Root 1: cluster  | `infra/local/cluster/`                                                                                                                     |
| Root 2: platform | `infra/local/platform/`                                                                                                                    |
| Reusable module  | `infra/modules/namespace-baseline/`                                                                                                        |
| Root Application | `infra/local/platform/root-app.tf`                                                                                                         |
| App-of-apps      | `deploy/argocd/platform/` (a small Helm chart: one template per add-on)                                                                    |
| Add-on config    | `deploy/platform/<add-on>/` (chart values and plain manifests)                                                                             |
| Secrets          | `.sops.yaml`, `deploy/**/*.sops.yaml`, `infra/local/secret-zero.sh`                                                                        |
| Wrapper          | `infra/local/cluster.sh`                                                                                                                   |
| Lint config      | `infra/.tflint.hcl`                                                                                                                        |
| CI               | `ci.yml`, job "Infra lint (tofu, tflint, manifests)"                                                                                       |
| Decisions        | [ADR 0002](adr/0002-local-cluster-k3d-opentofu.md), [ADR 0003](adr/0003-single-api-replica.md), [ADR 0004](adr/0004-garage-for-backups.md) |

## Infrastructure as code, in four ideas

1. **Desired state in files.** The `.tf` files say what should exist. `tofu plan` compares that with what exists and prints the difference. `tofu apply` makes the difference go away. Running `apply` twice changes nothing the second time; this is called being **idempotent**.
2. **State.** OpenTofu remembers what it created in `terraform.tfstate`, so it knows what to update or delete. Here the state is a local file per root, and it is git-ignored. It describes one laptop's cluster, and state files can hold secrets. A team would keep state in a remote backend with locking, so two people can't apply at once (Stage 10).
3. **Pinned providers.** A provider is the plugin that talks to an API (here `helm` and `kubernetes`). `versions.tf` pins exact versions. `.terraform.lock.hcl` records their checksums for five platforms, and it **is** committed: it's the equivalent of `pnpm-lock.yaml`. CI runs `init -lockfile=readonly`, so a provider that doesn't match the lock file fails the build.
4. **Modules.** `namespace-baseline` is written once and used three times (`for_each` in `namespaces.tf`). Environments that come from one module can't drift apart by accident.

### Why two roots

A provider must be configured before OpenTofu can plan anything that uses it. A provider configured from a cluster that the same apply is creating is a known trap: on the first plan the cluster doesn't exist yet. HashiCorp's own guidance is to create the cluster in one root and configure it from another. `cluster.sh up` applies them in order, so it's still one command.

### Why `terraform_data` + the k3d CLI

There's no well-maintained k3d provider. The community ones have few users and slow releases, which is a supply-chain risk for a tool that gets cluster-admin. So root 1 wraps `k3d cluster create` and `k3d cluster delete` in a `terraform_data` resource with `local-exec` provisioners.

The cost, written into `cluster/main.tf`: OpenTofu can't look inside a provisioner. If you delete the cluster by hand, the state still says it exists, and a plain `tofu apply` would report "No changes". `cluster.sh up` checks for exactly that (in state, but `k3d cluster get` finds nothing) and applies with `-replace=terraform_data.cluster`. Provisioners are a last resort for this reason; everything in root 2 uses real providers and does see drift.

`triggers_replace = jsonencode(local.config)` (the parsed `k3d.yaml`) means any real change to the cluster config shows up in `plan` as "must be replaced". That's honest: k3d can't change these settings on a running cluster. Comments and formatting don't count. **A replace deletes everything in the cluster, volumes included.** A Renovate PR that bumps the k3s image is such a change: once the cluster holds data (part 2 on), back it up before you `up` (the backup runbook arrives in Stage 9), and never apply a replace with `-auto-approve` without reading the plan.

## The cluster

Settings in `infra/local/k3d.yaml` that matter:

- **One server, no agents.** One node is enough to learn on and keeps RAM down. The app's own redundancy (two web replicas, PDBs) arrives in Stage 5.
- **Kubernetes 1.36** (`rancher/k3s:v1.36.5-k3s1`, by digest). Argo CD 3.5 is tested on 1.33–1.36, so 1.37 waits. Renovate is told the same thing (`allowedVersions: /^v1\.36\./`; a semver range like `<1.37.0` would silently match nothing, because k3s tags look like prereleases to semver).
- **API on 127.0.0.1 only.** k3d's default listens on every interface, which would expose a cluster-admin API to your network.
- **`serversMemory: 4g`.** A Docker memory cap on the node, so the cluster can't take the laptop down with it.
- **512 MiB `system-reserved` and a 256 MiB hard-eviction threshold.** k3s itself (API server, datastore, kubelet) runs inside the same 4 GiB cgroup as the pods. Without a reserve, the scheduler would hand all 4 GiB to pods, and when memory ran out the kernel's OOM killer would pick a victim, maybe k3s. With it, allocatable for pods is the capacity minus 768 MiB (about 3.3 GiB), and the kubelet evicts the lowest-priority pod before the cgroup is full.
- **`--secrets-encryption`.** Secrets are encrypted at rest in the cluster's datastore.
- **Ports 8880/8443** on 127.0.0.1 go to Traefik, for the app from Stage 5. Port 8080 belongs to `docker/stack.sh`.

## Argo CD, core install

Argo CD watches git and makes the cluster match it (GitOps, Stage 6). The **core** install is only the engine:

| Component                 | Job                                          |
| ------------------------- | -------------------------------------------- |
| application-controller    | compares git with the cluster, and syncs     |
| repo-server               | clones git, renders Helm/Kustomize           |
| applicationset-controller | generates Applications (one per environment) |
| redis                     | cache                                        |

There's no API server, UI, Dex (SSO) or notifications. That means no login to protect, and about a third of the RAM. You drive it with Kubernetes itself: `kubectl get applications -n argocd`, and Kubernetes RBAC decides who can. When you want the UI: `argocd admin dashboard -n argocd` (the CLI) starts one locally, only for you.

Hardening in `platform/argocd-values.yaml`:

- images pinned by digest;
- the local admin user disabled;
- the chart's NetworkPolicies plus deny-by-default ingress;
- memory limits on every component;
- the namespace enforces Pod Security "restricted", which proves the chart's pods meet it.

The chart comes from Argo's OCI registry on GHCR (`oci://ghcr.io/argoproj/argo-helm`). The first attempt used the GitHub Pages index, and the Helm provider's download timed out twice while plain `curl` worked. GHCR is the same registry as our images.

## The namespace baseline

Each of `qa-dev`, `qa-staging` and `qa-prod` gets four guardrails. Each one stops something specific:

| Guardrail                                                                            | Stops                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pod Security Admission `restricted`** (enforce, warn and audit; pinned to `v1.36`) | a pod running as root, with extra capabilities, privilege escalation, host access or no seccomp. It's rejected at admission, so it never starts.                                              |
| **NetworkPolicy `default-deny`** (ingress + egress), plus `allow-dns`                | any traffic in or out that nobody declared. A compromised pod can't reach the database of another environment, the Kubernetes API or the internet. DNS is the only exception.                 |
| **ResourceQuota**                                                                    | one environment eating the node: 1 CPU and 768 MiB requested, 1.5 GiB of limits, 15 pods, 3 volumes (6 GiB), **no LoadBalancer or NodePort services** (traffic comes in through the gateway). |
| **LimitRange**                                                                       | a container with no resources set: it gets 25m CPU / 64 MiB requested and a 256 MiB memory limit, so the quota can count it. Nothing in it may ask for more than 1 GiB.                       |

**Why the PSA version is pinned.** With `latest`, upgrading Kubernetes could tighten the rules and start rejecting pods with no reviewed change. A pinned version moves only when we change it.

**Why there's no CPU limit by default.** A CPU limit throttles a process even when the node is idle. Node.js with a hard CPU limit shows that as latency spikes. Memory is the resource that takes a node down (the OOM killer), so memory always has a limit and CPU only has a request. This is a common choice in 2026; some teams still set both.

## RAM budget

Target: the `core` profile (cluster, Argo CD, the app in three environments, the part 2 add-ons) stays under 4 GiB.

| Measured                                                                      | Memory                                          |
| ----------------------------------------------------------------------------- | ----------------------------------------------- |
| Node a minute after `up`, part 1 (k3s + Traefik + Argo CD)                    | 1.25–1.29 GiB of the 4 GiB cap                  |
| Node at idle, part 2 (plus cert-manager, CloudNativePG, Barman Cloud, Garage) | 2.34 GiB (pods 539 MiB, k3s itself about 1 GiB) |
| Pod memory requests, part 2                                                   | 932 MiB                                         |
| Allocatable for pods (capacity − 768 MiB)                                     | 3508535Ki, about 3.3 GiB                        |
| Quota requests, three app environments                                        | 2.25 GiB at most                                |

The requests fit: 932 MiB plus 2.25 GiB is just under what's allocatable. The real limit is memory actually used, because k3s itself grows with every CRD. Stage 5 sizes the app from measurements and runs staging and prod at zero replicas when idle (the plan's scale-to-zero), rather than raising the cap.

Stop the cluster when you're not using it: `cluster.sh stop` frees all of it, and `cluster.sh start` brings back the same cluster with everything in it.

## Daily use

```bash
infra/local/cluster.sh up            # create or update (shows each plan, asks before applying)
infra/local/cluster.sh plan          # what would change; "No changes" means no drift
infra/local/cluster.sh status        # nodes, memory, Argo CD pods, namespaces
infra/local/cluster.sh stop | start  # pause / resume
infra/local/cluster.sh down          # delete the cluster, forget the platform state
infra/local/secret-zero.sh           # re-load the age key and the local CA (up runs it)
kubectl -n argocd get applications   # every add-on: Synced / Healthy
```

Tools, installed in `~/.local/bin` (checksums verified): OpenTofu 1.13.2, k3d 5.9.0, kubectl 1.36.5, Helm 4.3.1, tflint 0.65.0, and from part 2 SOPS 3.13.3, age 1.3.2, KSOPS 4.5.1, kustomize 5.8.1 (the version Argo CD bundles) and kubeconform 0.8.0. The local CA is made with OpenSSL 3.5 (Ubuntu's); Windows trusts it once through `certutil.exe`, which `secret-zero.sh` prints when it creates the CA. `cluster.sh` refuses other OpenTofu and k3d versions. Renovate proposes bumps for the version lines in `cluster.sh`, and `versions.md` lists each tool.

Before `up`, free RAM: stop `pnpm dev`, `docker compose down`, and `docker/stack.sh down`.

## How it was verified

| Check                                          | Result                                                                                                                                                                       |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cluster.sh up` from nothing                   | both roots applied; 4 Argo CD pods Running; 3 namespaces with `enforce=restricted`                                                                                           |
| `down`, then `up`, then `plan`                 | `down` 1 min 6 s (18 resources destroyed, cluster deleted); `up` 5 min 2 s (18 created); then "No changes" in both roots                                                     |
| A failed apply, then `up` again                | the chart download timed out half-way; re-running finished only the missing release (idempotent)                                                                             |
| Cluster deleted by hand (`k3d cluster delete`) | plain `tofu plan` in root 1: "No changes" (it can't see); `cluster.sh up`: "in OpenTofu state but doesn't exist: recreating it", 4 min 47 s, then "No changes" in both roots |
| `cluster.sh plan` right after                  | "No changes" in both roots                                                                                                                                                   |
| A root pod in `qa-dev`                         | rejected: `violates PodSecurity "restricted:v1.36"`, listing all four failures                                                                                               |
| A compliant pod with no resources              | admitted, with the LimitRange defaults filled in                                                                                                                             |
| From that pod                                  | DNS works; the internet and the Kubernetes API are blocked. A control pod in an unguarded namespace reaches both, so the policy is what blocks them                          |
| Argo CD's repo server to GitHub                | `git ls-remote` of this repo works through the chart's NetworkPolicies                                                                                                       |
| CI checks locally                              | `tofu fmt`, `init -lockfile=readonly`, `validate` and tflint clean on a fresh copy; shellcheck, actionlint and zizmor clean                                                  |

Part 2:

| Check                                          | Result                                                                                                                                                                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `down`, then `up`, from zero (without Kyverno) | `down` 21 s; `up` 240 s (both roots, then secret zero); all 7 Applications Synced and Healthy 306 s later, no manual steps, no k3s restarts; then "No changes" in both roots                                                          |
| TLS                                            | RE-VERIFY                                                                                                                                                                                                                             |
| KSOPS                                          | `kustomize build --enable-alpha-plugins --enable-exec deploy/platform/garage` decrypts locally (values checked by length only); in the cluster the Garage app syncs its decrypted Secret                                              |
| Garage                                         | bucket `cnpg-backups` and one key created on first start; from a namespace labelled `part-of=qa-portal`, `wget garage.garage.svc:3900` gets `403` (S3 refuses an anonymous request); from an unlabelled namespace, connection refused |
| Pod Security                                   | all 12 workloads the charts render pass a server-side dry run in a namespace with `warn=restricted`, no warnings                                                                                                                      |
| Self-heal                                      | `kubectl -n garage scale statefulset garage --replicas=0`: Argo CD put it back to 1 within 6 s                                                                                                                                        |
| Schemas                                        | `helm lint --strict`; kubeconform `-strict` with CRD schemas (catalog pinned to a commit): 13/13 valid; all add-on chart renders valid                                                                                                |
| Secrets check                                  | CI's "Secrets in deploy/ are encrypted" step passes; gitleaks finds nothing                                                                                                                                                           |

## Decisions, and what we left out

| Decision                                              | Why                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **k3d** (k3s in Docker), not kind or minikube         | Lightest real Kubernetes; ships Traefik, a network-policy controller and local storage. See ADR 0002.                                                                                                                                                                                                                              |
| **Local state, no encryption**                        | One laptop. Neither root holds secrets yet. OpenTofu can encrypt state client-side; that comes with remote state in Stage 10, when the state leaves the machine.                                                                                                                                                                   |
| **Namespaces in OpenTofu, apps in Argo CD**           | Namespaces and their guardrails are the platform team's contract; what runs inside them is the app team's, from git. One owner per object avoids two tools fighting.                                                                                                                                                               |
| **Chart signature not verified**                      | The Helm provider can verify PGP-signed charts only with a legacy keyring. We'll enforce signatures on what runs in the cluster with Kyverno instead (Stage 6).                                                                                                                                                                    |
| **No `make`**                                         | Not installed on this machine; `cluster.sh` follows the `docker/stack.sh` pattern.                                                                                                                                                                                                                                                 |
| **OpenTofu owns the Argo CD install for good**        | `helm_release` reconciles it on every apply. Argo CD manages everything else from git, but not itself: two tools owning one release would fight. Upgrades come as Renovate PRs to `argocd.tf`.                                                                                                                                     |
| **No smoke Application in this stage**                | The first real Application is our own chart in Stage 5. Syncing a third-party repo into the cluster only to test would deploy code we haven't reviewed.                                                                                                                                                                            |
| **Garage, not MinIO**                                 | MinIO's community edition is no longer maintained or published as images. See ADR 0004.                                                                                                                                                                                                                                            |
| **Our own name-constrained local CA**                 | Trusted by Windows once and survives rebuilds, like mkcert's, but it can only sign names under `qa.localtest.me`, so the key in the cluster can't impersonate any other site. See "Secret zero".                                                                                                                                   |
| **Kyverno in Stage 6**                                | It costs the most of any add-on and has no job until the signed-images policy. See "Why Kyverno waits".                                                                                                                                                                                                                            |
| **Gateway on ports 8880/8443**                        | k3d maps those host ports, so URLs carry `:8443`. Binding 443 on the host needs root and collides more easily.                                                                                                                                                                                                                     |
| **No NetworkPolicies on the operator namespaces yet** | cert-manager's and CloudNativePG's webhooks are called by the API server from the node's address, and kube-router checks policies after NAT, so a default-deny needs node-IP `ipBlock` rules that are fragile to get right. Garage, which holds data, has them. The operators' turn comes with Stage 8's posture scan (kubescape). |

## Part 2: Argo CD takes over

From here OpenTofu creates exactly one Argo CD object, the root Application `platform` (`root-app.tf`). Everything else in the platform is in git, and Argo CD makes the cluster match it.

### App-of-apps

The root points at `deploy/argocd/platform`, a small Helm chart. Each template is one add-on's Application. Each Application is either:

- an upstream chart (from an OCI registry) plus our values file from `deploy/platform/<add-on>/`, using Argo CD's multi-source `$values` reference, or
- a folder of our own manifests (`deploy/platform/<add-on>/`).

The chart has two values: the repo URL and the git revision. The root passes the revision down, so **one variable moves the whole platform to another branch**:

```bash
TF_VAR_platform_revision=my-branch infra/local/cluster.sh up   # try a branch (it must be pushed)
infra/local/cluster.sh up                                        # back to main
```

Argo CD reads from GitHub, not from your disk: a change is only visible to it once it's pushed. **Switch back to `main` before the branch is deleted** (after its PR merges): once the branch is gone, Argo CD has no source and every add-on goes to `Unknown`.

Every template is plain YAML (the two templated values are quoted strings), so Renovate's `argocd` manager can read the chart pins. Each add-on's sync policy is spelled out in its own file instead of a shared helper for the same reason.

**Sync waves** order the first install: cert-manager (wave 0); then what needs cert-manager's CRDs (wave 1: CloudNativePG, Garage, and the Traefik config with its Issuer and Certificate); then the Barman Cloud plugin, which needs both cert-manager and the operator's CRDs (wave 2). The root starts a wave only when every Application in the waves before it is Healthy.

That last part needs one setting. Since Argo CD 1.8, an Application has no health of its own when it is a resource of another app, so out of the box the waves only order _creation_: wave 2 would start while cert-manager is still pulling images. `argocd-values.yaml` restores the health check Argo CD documents for app-of-apps (`resource.customizations.health.argoproj.io_Application`). Retries with backoff cover what's left, such as a webhook that takes a few more seconds.

**Every add-on syncs with `prune` and `selfHeal`.** Delete a file in git and the object goes. Edit an object by hand and Argo CD puts it back within seconds. There's no `resources-finalizer`: deleting an Application leaves its objects running, so removing an operator is a deliberate step, not a side effect.

### Three AppProjects

An AppProject is the fence around a group of Applications: which repos they may read, which namespaces they may write to, and which kinds of object.

| Project     | May use                                                                                                                                                                                    | May not                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `bootstrap` | this repo; `Application` objects in `argocd` only                                                                                                                                          | anything else                                    |
| `platform`  | this repo and the two chart registries; namespaces `cert-manager`, `cnpg-system`, `garage`; 6 cluster-wide kinds (Namespace, CRDs, ClusterRoles and their bindings, the two webhook kinds) | `argocd` and `kube-system`                       |
| `gateway`   | this repo; in `kube-system` only `HelmChartConfig`, `Issuer` and `Certificate`                                                                                                             | any other kind, namespace or cluster-wide object |

The app (Stage 5) gets its own project limited to `qa-*`.

`kube-system` has a project of its own because k3s keeps its `HelmChart` objects there, and each one installs a chart with cluster-admin rights. Only the Traefik config, with three kinds, may write there.

**What projects do and don't protect.** They catch mistakes: a chart upgrade that suddenly writes into a new namespace, or an Application pointed at the wrong repo, fails to sync instead of changing the cluster. They don't stop a determined attacker who can merge to `main`: an add-on allowed to create ClusterRoleBindings and webhooks can grant itself anything. The security boundary is review of what merges (the `main` ruleset, CODEOWNERS); the projects are the second line.

### The add-ons

| Add-on                  | What it's for                                                                                                                                                                        | Lean settings                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| **cert-manager**        | issues TLS certificates. No ClusterIssuer: the one issuer, `local-ca`, lives in `kube-system` and only that namespace can use it                                                     | no Prometheus; `crds.keep` so deleting the app can't delete every Certificate         |
| **CloudNativePG**       | the operator that will run each environment's Postgres (Stage 5)                                                                                                                     | no PodMonitor or dashboard yet                                                        |
| **Barman Cloud plugin** | continuous backups (base backups + WAL) to S3; injects a sidecar into each Postgres pod                                                                                              | one replica                                                                           |
| **Garage**              | single-node S3 store with one bucket, `cnpg-backups` (ADR 0004)                                                                                                                      | about 20 MiB; only app namespaces may reach port 3900                                 |
| **Traefik config**      | turns on k3s Traefik's Gateway API provider; the `traefik-gateway` gets an HTTPS listener with a wildcard certificate for `*.qa.localtest.me`, from the `local-ca` Issuer next to it | routes may attach only from namespaces labelled `app.kubernetes.io/part-of=qa-portal` |

Every chart is pulled from an OCI registry (GHCR or Quay), the way Argo CD's own chart is. Helm's downloads of GitHub-release chart archives time out on this laptop, and OCI is where projects are moving anyway. Every image in every values file is pinned as `tag@digest`, including chart hook and test images.

Garage's probes only check that its S3 and RPC ports accept connections. It has an admin API with a health endpoint, but that needs a token we'd have to manage as another secret; Stage 9's restore drill is the real test that backups work.

`localtest.me` and all its subdomains resolve to 127.0.0.1 in public DNS, so `https://dev.qa.localtest.me:8443` works with no hosts-file edits.

### Secrets in git: SOPS, age and KSOPS

A Secret in git must be encrypted, or the public repo publishes it. Here:

1. **`.sops.yaml`** says files matching `deploy/**/*.sops.yaml` are encrypted for one age **public** key. Only `data` and `stringData` are encrypted, so names and kinds stay readable in a diff.
2. **`sops --encrypt`** turns a Secret into that file. Garage's credentials were generated straight into it (`openssl rand | sops --encrypt /dev/stdin`): the plaintext never touched the disk or the screen.
3. **KSOPS**, a kustomize plugin, decrypts the file while Argo CD's repo server builds the manifests. Its binary comes from an init container (`argocd-values.yaml`). The age private key reaches the repo server as an optional environment variable, so Argo CD still starts before the key exists.
4. **CI** fails if a Secret under `deploy/` is anywhere but a `*.sops.yaml` file, or if a `*.sops.yaml` file isn't encrypted.

`*.sops.yaml` files are in `.prettierignore`: SOPS writes them, and reformatting could break their integrity check.

**The risk KSOPS brings.** kustomize runs plugins only with `--enable-alpha-plugins --enable-exec`, and those flags apply to every kustomization the repo server builds. So any kustomization in this repo could run a program in the repo server, and that program inherits `SOPS_AGE_KEY`: it could read the private key that decrypts every secret. Two things keep that acceptable here:

- every AppProject accepts only this repository as a git source, so no outside repo's kustomization is ever built;
- nothing reaches `main` without a reviewed PR, so a malicious exec plugin would have to get through review.

The stronger design runs KSOPS as a Config Management Plugin in its own sidecar, the only container that holds the key, with exec turned off for plain kustomize. That's more moving parts than one laptop needs today; we revisit it in Stage 6, when the repo server starts building the app's environments.

### Secret zero

Something has to protect the key that decrypts everything, and it can't be in git. `infra/local/secret-zero.sh` loads two secrets, and `cluster.sh up` runs it after OpenTofu:

| Secret              | Where it lives                                 | Goes to                | If you lose it                                                                                  |
| ------------------- | ---------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------- |
| **age private key** | `~/.config/sops/age/keys.txt` (created once)   | `argocd/sops-age`      | nobody can decrypt the secrets in git; re-create every `*.sops.yaml`                            |
| **local root CA**   | `~/.config/qa-portal/local-ca/` (created once) | `kube-system/local-ca` | the script makes a new one; trust it in Windows again; certificates are re-issued automatically |

Neither goes into git or OpenTofu state, and the script never prints them. **Back up the age key** (a password manager is fine).

**Why our own CA, and why it's constrained.** A CA has to live outside the cluster so it survives rebuilds: one that cert-manager generated inside the cluster would change on every rebuild, and you'd re-import it into Windows each time. The first version used mkcert's CA for that. The review caught the cost: its key, loaded into the cluster, could sign a certificate your Windows browser trusts **for any site**, your bank's included.

So `secret-zero.sh` makes a CA for this project only, with OpenSSL:

- `nameConstraints=critical,permitted;DNS:qa.localtest.me`: it may only sign `qa.localtest.me` and names under it. Browsers and Windows reject anything else it signs. Tested: a certificate for `dev.qa.localtest.me` verifies, one for `accounts.google.com` signed by the same key fails with "permitted subtree violation".
- `pathlen:0`: it can't create intermediate CAs.
- an ECDSA P-256 key, valid 5 years; certificates it signs last 90 days and cert-manager renews them.

You trust it once in Windows, for your user only (`certutil.exe -user -addstore Root …`; the script prints the full command). Its key goes to one namespace, `kube-system`, where only cluster admins can read Secrets. Never load it into a shared or cloud cluster (Stage 10 uses Let's Encrypt).

**Rotating the age key:** create a new key, add its public key to `.sops.yaml`, run `sops updatekeys` on every `*.sops.yaml`, re-run `secret-zero.sh`, then remove the old recipient and run `updatekeys` again. Rotate the secrets themselves too if the old key leaked.

### Diffing like the sync applies: server-side diff

Every add-on syncs with server-side apply (some CRDs are too big for the client-side `last-applied` annotation). Argo CD 3.5 still _compared_ git and cluster client-side by default. On the first install, the Kyverno CRDs and Garage's StatefulSet stayed OutOfSync for good, though `kubectl diff --server-side` showed no difference: the client-side diff didn't account for fields the API server fills in. `controller.diff.server.side: "true"` (in `argocd-values.yaml`) makes Argo CD diff with a server-side dry run, so diff and sync agree. Argo CD 3.6 does this automatically for server-side-apply apps.

### What went wrong first, and what changed because of it

The first version of part 2 also installed Kyverno. Three things went wrong, and each one changed the design:

1. **Two Kyverno CRDs timed out** (`context deadline exceeded`) while the API server was writing about 45 CRDs at once. The sync then waited forever for Kyverno's Deployment, which crashed because those CRDs were missing. It took stopping the stuck operation by hand (`kubectl -n argocd patch application kyverno --type json -p '[{"op":"remove","path":"/operation"}]'`) and syncing again.
2. **k3s restarted once** with `level=fatal msg="Transaction commit failed"` from kine, its SQLite datastore, during the same burst. It wasn't out of memory (`OOMKilled=false`); Docker restarted it and everything came back.
3. **`cluster.sh down` hung for 5 minutes and failed.** Kyverno's chart has a Helm pre-delete hook, which Argo CD turns into a finalizer on the Application. `down` used to destroy the platform root first, which removed Argo CD before the hook could run, so the finalizer was never cleared and the `argocd` namespace stayed in Terminating. Now `down` deletes the cluster and then forgets the platform root's state (`tofu state rm`): every object in it lived in the deleted cluster. Finalizers can't block deleting a whole cluster.

### Why Kyverno waits for Stage 6

Measured on the same laptop, three rebuilds from zero:

|                                           | With Kyverno              | Without               |
| ----------------------------------------- | ------------------------- | --------------------- |
| CRDs in the cluster                       | about 82                  | 60                    |
| Add-ons Synced and Healthy after `up`     | 771 s, after manual fixes | **306 s**, on its own |
| k3s CPU at idle (3-minute average / peak) | 1.3–1.9 cores / 6.7       | **0.8 / 2.4 cores**   |
| Node memory at idle                       | 2.9 GiB                   | **2.34 GiB** of 4     |

Kyverno's 22 CRDs were the biggest part of the API server's OpenAPI document (about 4.7 MiB of it; CloudNativePG, the next largest, is 1.2 MiB). The API server rebuilds that document and serves it to every client, and its admission webhook sits in front of every write. Its first real job is the signed-images policy in Stage 6, so it comes back then, together with that policy, and with a measurement of what it costs.

### Notes for Stage 5

- **CloudNativePG needs the Kubernetes API.** Its instance pods talk to the API server, and the operator needs ingress on its webhook port. On k3s (kube-router), NetworkPolicy is checked after the Service address is translated, so allowing `10.43.0.1:443` doesn't work: the egress rule needs an `ipBlock` for the node's IP on port 6443.
- **The Postgres pods' backup sidecar needs egress to `garage.garage.svc:3900`**; Garage already allows ingress from the app namespaces.
- **Memory.** Pod requests are 932 MiB of the 3.3 GiB allocatable, so the three environments' quotas (2.25 GiB of requests at most) fit. Real use is the tighter limit: the node uses 2.34 GiB of 4 GiB at idle. Size the app's requests from measurements, and keep staging and prod scaled to zero when idle.

## Exercise (about 75 minutes)

1. **Destroy and rebuild in one command each.** Run `time infra/local/cluster.sh down -auto-approve`, then `time infra/local/cluster.sh up -auto-approve`. Then run `cluster.sh plan` and confirm both roots say "No changes".
2. **Read a plan.** Change `pods = 15` to `16` in `platform/namespaces.tf` and run `cluster.sh plan`. Which resources change, and why three? Revert the change.
3. **See the replace.** Change `serversMemory` in `k3d.yaml` and run `tofu -chdir=infra/local/cluster plan`. Why does it say "must be replaced" and not "update in-place"? Revert.
4. **Drift.** Run `kubectl -n qa-dev delete networkpolicy default-deny`, then `cluster.sh plan`. OpenTofu sees the missing policy; `up` puts it back. Now run `k3d cluster delete qa-portal`, then `tofu -chdir=infra/local/cluster plan` directly: it says "No changes". Why can't it tell? (Answer in "Why `terraform_data`".) Then run `cluster.sh plan` and `cluster.sh up`, which notice and replace the cluster. Read `replace_if_gone` in `cluster.sh` to see how.
5. **The NetworkPolicy blocks the database.** Start a database pod in `qa-staging`, then try to reach it from a debug pod in `qa-dev`. Pick the busybox digest with `docker buildx imagetools inspect busybox:1.37.0`:
   ```bash
   kubectl -n qa-staging run db --image=postgres:18.4-alpine --env=POSTGRES_PASSWORD=x   # rejected: why?
   ```
   PSA rejects it (it runs as root). Run it in a scratch namespace without the baseline instead, with a Service so it has a DNS name:
   ```bash
   kubectl create ns scratch
   kubectl -n scratch run db --image=postgres:18.4-alpine --env=POSTGRES_PASSWORD=x --expose --port=5432
   ```
   Then start a compliant debug pod in `qa-dev` (`<digest>` is the busybox one):
   ```bash
   kubectl -n qa-dev run debug --image=busybox:1.37.0@<digest> --restart=Never --overrides='{"spec":{"securityContext":{"runAsNonRoot":true,"runAsUser":65534,"seccompProfile":{"type":"RuntimeDefault"}},"containers":[{"name":"debug","image":"busybox:1.37.0@<digest>","command":["sleep","600"],"securityContext":{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]}}}]}}'
   kubectl -n qa-dev exec debug -- nc -zv -w 5 db.scratch 5432     # blocked
   kubectl -n scratch run ctl --image=busybox:1.37.0@<digest> --restart=Never -- sleep 600
   kubectl -n scratch exec ctl -- nc -zv -w 5 db 5432              # open
   ```
   DNS resolves in both cases (`allow-dns`), so the difference is the NetworkPolicy. Delete `scratch` and the debug pod afterwards.
6. **Break the quota.** In `qa-dev`, create a Deployment with 20 replicas of a compliant pod. How many start? Find the reason with `kubectl -n qa-dev describe resourcequota quota` and the ReplicaSet's events.

7. **GitOps self-heal.** Run `kubectl -n garage scale statefulset garage --replicas=0` and watch `kubectl -n garage get statefulset -w`. Who puts it back, and how fast? Then change `replicas` in a local copy of `deploy/platform/garage/statefulset.yaml` without pushing: nothing happens. Why? (Argo CD reads GitHub.)
8. **A secret's journey.** Run `sops --decrypt deploy/platform/garage/credentials.sops.yaml | grep -c GARAGE` (it counts the keys without printing them). Read the encrypted file: which parts are readable and why? Then find where the decrypted Secret ends up (`kubectl -n garage get secret garage-credentials`) and which component decrypted it.
9. **Trace a certificate.** `kubectl -n kube-system describe certificate qa-localtest-me`, then the `CertificateRequest` it created. Which issuer signed it, and when will cert-manager renew it?

**What you learned:** infrastructure as code is plan, apply and state; state is what lets a tool notice drift (and a provisioner can't). Guardrails belong to the namespace, not to each app, so a new app can't forget them. GitOps moves the source of truth to git: Argo CD keeps the cluster equal to it, and secrets can live there only encrypted, with one secret zero kept outside. A cluster you can delete and rebuild in minutes is a cluster nobody is afraid of, and measuring each add-on's cost is what keeps it that way.
