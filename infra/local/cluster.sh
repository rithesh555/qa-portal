#!/usr/bin/env bash
# The local Kubernetes platform, from code. See docs/devops/stage-04-k8s-platform.md.
#
#   infra/local/cluster.sh up [-auto-approve]    create the cluster, then the platform,
#                                                then load secret zero (secret-zero.sh)
#   infra/local/cluster.sh plan                  what `up` would change (both roots)
#   infra/local/cluster.sh down [-auto-approve]  delete the cluster (and forget the platform state)
#   infra/local/cluster.sh stop | start         pause / resume (keeps everything; frees RAM)
#   infra/local/cluster.sh status               nodes, memory, Argo CD and the namespaces
#
# Free RAM first: stop `pnpm dev`, `docker compose down` and docker/stack.sh.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
name=qa-portal
context="k3d-$name"

# The versions this repo is tested with (docs/devops/versions.md).
# renovate: datasource=github-releases depName=opentofu/opentofu
tofu_version=1.13.2
# renovate: datasource=github-releases depName=k3d-io/k3d
k3d_version=5.9.0

check_tools() {
  local have
  have="$(tofu version | head -1)"
  [[ "$have" == "OpenTofu v$tofu_version" ]] || { echo "Need OpenTofu v$tofu_version, have: $have" >&2; exit 1; }
  have="$(k3d version | head -1)"
  [[ "$have" == "k3d version v$k3d_version" ]] || { echo "Need k3d v$k3d_version, have: $have" >&2; exit 1; }
  command -v kubectl > /dev/null || { echo "Need kubectl" >&2; exit 1; }
  command -v jq > /dev/null || { echo "Need jq" >&2; exit 1; }
}

tf() { tofu -chdir="$here/$1" "${@:2}"; }

cluster_exists() { k3d cluster get "$name" > /dev/null 2>&1; }

# A stopped cluster exists but can't answer API calls.
cluster_running() {
  [[ "$(k3d cluster get "$name" -o json 2> /dev/null | jq -r '.[0].serversRunning // 0')" -ge 1 ]]
}

need_running() {
  cluster_running || { echo "Cluster $name is stopped: run infra/local/cluster.sh start first." >&2; exit 1; }
}

# Root 1 can't see a cluster deleted by hand (k3d cluster delete): its state
# still lists it. Replace it then, instead of applying "No changes".
replace_if_gone() {
  if tf cluster state list 2> /dev/null | grep -qx terraform_data.cluster && ! cluster_exists; then
    echo "Cluster $name is in OpenTofu state but doesn't exist: recreating it." >&2
    echo "-replace=terraform_data.cluster"
  fi
}

cmd="${1:-}"
shift || true

case "$cmd" in
  up)
    check_tools
    tf cluster init -input=false > /dev/null
    replace="$(replace_if_gone)"
    tf cluster apply -input=false ${replace:+"$replace"} "$@"
    need_running
    tf platform init -input=false > /dev/null
    tf platform apply -input=false "$@"
    # The age key and the local CA (not in git, not in OpenTofu state).
    "$here/secret-zero.sh"
    ;;
  plan)
    check_tools
    tf cluster init -input=false > /dev/null
    replace="$(replace_if_gone)"
    tf cluster plan -input=false ${replace:+"$replace"}
    if cluster_exists; then
      need_running
      tf platform init -input=false > /dev/null
      tf platform plan -input=false
    else
      echo "No cluster yet: the platform plan needs one (run up)."
    fi
    ;;
  down)
    check_tools
    # Delete the cluster, then forget the platform root's state: every
    # object it lists lived in the cluster and went with it. Destroying the
    # platform object by object first is slower and fragile: operators,
    # finalizers and pre-delete hooks (Kyverno's) wait for controllers that
    # the same destroy has already removed.
    tf cluster init -input=false > /dev/null
    tf cluster destroy -input=false "$@"
    if ! cluster_exists; then
      tf platform init -input=false > /dev/null
      mapfile -t addresses < <(tf platform state list 2> /dev/null)
      if ((${#addresses[@]})); then
        tf platform state rm "${addresses[@]}" > /dev/null
        echo "Platform state cleared (${#addresses[@]} resources were in the deleted cluster)."
      fi
    fi
    ;;
  stop)
    k3d cluster stop "$name"
    ;;
  start)
    k3d cluster start "$name" --wait
    ;;
  status)
    k3d cluster list
    cluster_exists || exit 0
    docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}' "k3d-$name-server-0"
    kubectl --context "$context" get nodes -o wide
    kubectl --context "$context" -n argocd get pods
    kubectl --context "$context" -n argocd get applications.argoproj.io
    kubectl --context "$context" get ns -l app.kubernetes.io/part-of=qa-portal \
      -L pod-security.kubernetes.io/enforce
    ;;
  *)
    sed -n '2,11p' "$0"
    exit 2
    ;;
esac
