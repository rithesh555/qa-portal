# ADR 0002: A local k3d cluster, managed with OpenTofu in two roots

- **Status:** accepted
- **Date:** 2026-11-05
- **Deciders:** maintainer

## Context

Stages 4–9 need a real Kubernetes cluster: Helm, Argo CD, NetworkPolicies, an operator-run Postgres, observability. The laptop has 8 GB of RAM (about 5.8 GiB visible to WSL), and there's no cloud budget yet. The cluster must be cheap to throw away and rebuild, and built from code so the rebuild is identical.

## Options considered

1. **k3d (k3s in Docker).** Pros: about 0.5 GiB for the control plane; ships Traefik, CoreDNS, local storage and a network-policy controller; start/stop keeps state. Cons: one container pretends to be a node, so node failures are simulated, not real.
2. **kind (Kubernetes in Docker).** Pros: upstream Kubernetes, used in Kubernetes' own CI, and it has a maintained OpenTofu provider. Cons: about twice the memory; no bundled ingress or storage; its default CNI ignores NetworkPolicies unless you replace it.
3. **minikube.** Pros: many add-ons. Cons: heavier; a VM or Docker driver, and it's more of a dev tool than a platform to build on.
4. **A managed cloud cluster.** Pros: real nodes and load balancers. Cons: costs money and needs an account; planned as the optional Stage 10.

For **how** to manage it:

- **a. The k3d CLI by hand.** Not reproducible; no plan, no drift.
- **b. A community k3d provider.** The few that exist have very few users and irregular releases. A tool that gets cluster-admin on the laptop is a supply-chain risk we don't need.
- **c. OpenTofu with `terraform_data` wrapping the k3d CLI** for the cluster, and the official `helm` and `kubernetes` providers for everything inside it.
- **d. OpenTofu in one root**, with providers configured from the cluster it creates. That's a known failure mode: the first plan runs before the cluster exists.

## Decision

We chose **k3d** for the cluster, managed by **OpenTofu in two roots**: `infra/local/cluster` (k3d through `terraform_data`) and `infra/local/platform` (Argo CD and the namespaces through the official providers). `infra/local/cluster.sh` applies them in order. OpenTofu rather than Terraform because it's open source (MPL), it's compatible, and the Phase 9 plan chose it.

## Consequences

- One command builds or destroys everything; `plan` shows drift inside the cluster.
- Root 1 can't see drift (a cluster deleted by hand still looks present); the fix is in the stage note.
- Two state files to keep straight; `cluster.sh` hides that for daily use.
- Revisit if a well-maintained k3d provider appears, or when Stage 10 adds a cloud cluster (whose module would use a real provider and remote state).
