#!/usr/bin/env bash
# "Secret zero": the two secrets that can't come from git, because they are
# what protects everything that does. Run once per cluster (cluster.sh up
# runs it for you). See docs/devops/stage-04-k8s-platform.md.
#
#   infra/local/secret-zero.sh
#
# 1. The age private key. Argo CD's repo server uses it to decrypt the
#    *.sops.yaml files in deploy/ (KSOPS). It lives in
#    ~/.config/sops/age/keys.txt (override: SOPS_AGE_KEY_FILE); this script
#    creates it once if it's missing. BACK IT UP: without it nobody can
#    decrypt the secrets in git, and they have to be re-created.
# 2. The mkcert root CA. cert-manager signs the local TLS certificates with
#    it, and Windows trusts it after `mkcert -install`. Install mkcert on
#    Windows (winget install FiloSottile.mkcert), run `mkcert -install` there
#    once, and this script finds the CA through mkcert.exe -CAROOT (override:
#    MKCERT_CAROOT, a WSL path).
#
# Neither secret is printed or written anywhere but the cluster.
set -euo pipefail

context="${KUBE_CONTEXT:-k3d-qa-portal}"
k() { kubectl --context "$context" "$@"; }

need() { command -v "$1" > /dev/null || { echo "Need $1 ($2)" >&2; exit 1; }; }
need kubectl "see versions.md"
need age-keygen "https://github.com/FiloSottile/age"

k get namespace argocd > /dev/null || {
  echo "No argocd namespace: run infra/local/cluster.sh up first." >&2
  exit 1
}

# 1. age key -----------------------------------------------------------------
key_file="${SOPS_AGE_KEY_FILE:-$HOME/.config/sops/age/keys.txt}"
if [[ ! -f "$key_file" ]]; then
  mkdir -p "$(dirname "$key_file")"
  (umask 077 && age-keygen -o "$key_file" 2> /dev/null)
  echo "Created a new age key in $key_file. Back it up (a password manager is fine)."
fi
chmod 600 "$key_file"

# --dry-run -o yaml | apply: create or update, and the key only ever goes
# through the pipe.
k -n argocd create secret generic sops-age \
  --from-file=keys.txt="$key_file" --dry-run=client -o yaml | k apply -f - > /dev/null
k -n argocd label secret sops-age app.kubernetes.io/part-of=argocd --overwrite > /dev/null
# The repo server reads the key from its environment at start.
k -n argocd rollout restart deployment/argocd-repo-server > /dev/null
echo "age key loaded into argocd/sops-age (repo server restarting)."
echo "Public key (goes in .sops.yaml; safe to share): $(age-keygen -y "$key_file")"

# 2. mkcert CA ---------------------------------------------------------------
caroot="${MKCERT_CAROOT:-}"
if [[ -z "$caroot" ]] && command -v mkcert.exe > /dev/null; then
  caroot="$(wslpath -u "$(mkcert.exe -CAROOT | tr -d '\r')")"
fi
if [[ -z "$caroot" || ! -f "$caroot/rootCA.pem" || ! -f "$caroot/rootCA-key.pem" ]]; then
  echo "No mkcert CA found (looked in: ${caroot:-nowhere})." >&2
  echo "On Windows: winget install FiloSottile.mkcert, then mkcert -install." >&2
  echo "Or set MKCERT_CAROOT to the folder with rootCA.pem and rootCA-key.pem." >&2
  exit 1
fi

# Same labels Argo CD puts on the namespace (deploy/argocd/platform), in
# case this runs before Argo CD creates it.
k create namespace cert-manager --dry-run=client -o yaml | k apply -f - > /dev/null
k label namespace cert-manager --overwrite \
  app.kubernetes.io/part-of=platform \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/enforce-version=v1.36 \
  pod-security.kubernetes.io/warn=restricted \
  pod-security.kubernetes.io/warn-version=v1.36 > /dev/null
k -n cert-manager create secret tls local-ca \
  --cert="$caroot/rootCA.pem" --key="$caroot/rootCA-key.pem" \
  --dry-run=client -o yaml | k apply -f - > /dev/null
echo "mkcert CA loaded into cert-manager/local-ca."
