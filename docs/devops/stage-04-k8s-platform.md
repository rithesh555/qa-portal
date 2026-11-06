# Stage 4: Local Kubernetes platform as code

One command builds a real Kubernetes cluster on the laptop, with Argo CD and three guarded app environments. Another command deletes all of it. Nothing about the cluster is clicked or typed by hand, so it can always be rebuilt the same way.

This is part 1 of the stage: the cluster, Argo CD and the namespace baseline. Part 2 adds the platform add-ons through Argo CD: cert-manager, CloudNativePG, MinIO, Kyverno and SOPS.

## What you get

```
infra/local/cluster.sh up
  │
  ├─ tofu apply infra/local/cluster     (root 1)
  │    └─ k3d cluster create --config infra/local/k3d.yaml
  │         one k3s server in Docker, 4 GiB cap, API on 127.0.0.1:6550
  │         bundled: Traefik, CoreDNS, local-path storage, network-policy controller
  │
  └─ tofu apply infra/local/platform    (root 2)
       ├─ namespace argocd + Argo CD core (Helm chart, pinned)
       └─ module namespace-baseline × 3 → qa-dev, qa-staging, qa-prod
            Pod Security "restricted" · default-deny NetworkPolicy (+ DNS)
            ResourceQuota · LimitRange
```

| Piece            | Where                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| Cluster config   | `infra/local/k3d.yaml`                                                                         |
| Root 1: cluster  | `infra/local/cluster/`                                                                         |
| Root 2: platform | `infra/local/platform/`                                                                        |
| Reusable module  | `infra/modules/namespace-baseline/`                                                            |
| Wrapper          | `infra/local/cluster.sh`                                                                       |
| Lint config      | `infra/.tflint.hcl`                                                                            |
| CI               | `ci.yml`, job "Infra lint (tofu, tflint)"                                                      |
| Decisions        | [ADR 0002](adr/0002-local-cluster-k3d-opentofu.md), [ADR 0003](adr/0003-single-api-replica.md) |

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

| Measured                                           | Memory                         |
| -------------------------------------------------- | ------------------------------ |
| Node a minute after `up` (k3s + Traefik + Argo CD) | 1.25–1.29 GiB of the 4 GiB cap |
| Allocatable for pods (capacity − 768 MiB)          | 3508535Ki, about 3.3 GiB       |
| Quota requests, three app environments             | 2.25 GiB at most               |

Part 2's add-ons (cert-manager, CloudNativePG, Kyverno, MinIO) request roughly another 0.5–0.8 GiB, so with all three environments full the requests would pass what's allocatable. When we get there, the plan is to size each add-on's requests down, and run staging and prod at zero replicas when idle (the plan's scale-to-zero), rather than raise the cap.

Stop the cluster when you're not using it: `cluster.sh stop` frees all of it, and `cluster.sh start` brings back the same cluster with everything in it.

## Daily use

```bash
infra/local/cluster.sh up            # create or update (shows each plan, asks before applying)
infra/local/cluster.sh plan          # what would change; "No changes" means no drift
infra/local/cluster.sh status        # nodes, memory, Argo CD pods, namespaces
infra/local/cluster.sh stop | start  # pause / resume
infra/local/cluster.sh down          # destroy the platform, then the cluster
```

Tools, installed in `~/.local/bin` (checksums verified): OpenTofu 1.13.2, k3d 5.9.0, kubectl 1.36.5, Helm 4.3.1, tflint 0.65.0. `cluster.sh` refuses other OpenTofu and k3d versions. Renovate proposes bumps for the version lines in `cluster.sh`, and `versions.md` lists each tool.

Before `up`, free RAM: stop `pnpm dev`, `docker compose down`, and `docker/stack.sh down`.

## How it was verified

| Check                                          | Result                                                                                                                                                                       |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cluster.sh up` from nothing                   | both roots applied; 4 Argo CD pods Running; 3 namespaces with `enforce=restricted`                                                                                           |
| `down`, then `up`, then `plan`                 | `down` 1 min 6 s (18 resources destroyed, cluster deleted); `up` 5 min 2 s (18 created); then "No changes" in both roots                                                     |
| A failed apply, then `up` again                | the chart download timed out half-way; re-running finished only the missing release (idempotent)                                                                             |
| Cluster deleted by hand (`k3d cluster delete`) | plain `tofu plan` in root 1: "No changes" (it can't see); `cluster.sh up`: "in OpenTofu state but doesn't exist: recreating it", 4 min 47 s, then "No changes" in both roots |
| `cluster.sh down` while stopped                | refuses: "Cluster qa-portal is stopped: run infra/local/cluster.sh start first."                                                                                             |
| `cluster.sh plan` right after                  | "No changes" in both roots                                                                                                                                                   |
| A root pod in `qa-dev`                         | rejected: `violates PodSecurity "restricted:v1.36"`, listing all four failures                                                                                               |
| A compliant pod with no resources              | admitted, with the LimitRange defaults filled in                                                                                                                             |
| From that pod                                  | DNS works; the internet and the Kubernetes API are blocked. A control pod in an unguarded namespace reaches both, so the policy is what blocks them                          |
| Argo CD's repo server to GitHub                | `git ls-remote` of this repo works through the chart's NetworkPolicies                                                                                                       |
| CI checks locally                              | `tofu fmt`, `init -lockfile=readonly`, `validate` and tflint clean on a fresh copy; shellcheck, actionlint and zizmor clean                                                  |

## Decisions, and what we left out

| Decision                                       | Why                                                                                                                                                                                            |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **k3d** (k3s in Docker), not kind or minikube  | Lightest real Kubernetes; ships Traefik, a network-policy controller and local storage. See ADR 0002.                                                                                          |
| **Local state, no encryption**                 | One laptop. Neither root holds secrets yet. OpenTofu can encrypt state client-side; that comes with remote state in Stage 10, when the state leaves the machine.                               |
| **Namespaces in OpenTofu, apps in Argo CD**    | Namespaces and their guardrails are the platform team's contract; what runs inside them is the app team's, from git. One owner per object avoids two tools fighting.                           |
| **Chart signature not verified**               | The Helm provider can verify PGP-signed charts only with a legacy keyring. We'll enforce signatures on what runs in the cluster with Kyverno instead (part 2 and Stage 6).                     |
| **No `make`**                                  | Not installed on this machine; `cluster.sh` follows the `docker/stack.sh` pattern.                                                                                                             |
| **OpenTofu owns the Argo CD install for good** | `helm_release` reconciles it on every apply. Argo CD manages everything else from git, but not itself: two tools owning one release would fight. Upgrades come as Renovate PRs to `argocd.tf`. |
| **No smoke Application in this stage**         | The first real Application is our own chart in Stage 5. Syncing a third-party repo into the cluster only to test would deploy code we haven't reviewed.                                        |

## Notes for part 2

- **Operators need the Kubernetes API.** CloudNativePG's instance pods talk to the API server, and its operator needs ingress on port 8000 (webhooks). On k3s (kube-router), NetworkPolicy is checked after the Service address is translated, so allowing `10.43.0.1:443` doesn't work. The egress rule needs an `ipBlock` for the node's IP on port 6443.
- **The Traefik Gateway provider** is not on yet (the Gateway API CRDs are installed). A `HelmChartConfig` for k3s' Traefik turns it on without rebuilding the cluster.

## Exercise (about 45 minutes)

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

**What you learned:** infrastructure as code is plan, apply and state; state is what lets a tool notice drift (and a provisioner can't). Guardrails belong to the namespace, not to each app, so a new app can't forget them. A cluster you can delete and rebuild in minutes is a cluster nobody is afraid of.
