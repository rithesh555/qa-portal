#!/usr/bin/env bash
# "Secret zero": the two secrets that can't come from git, because they are
# what protects everything that does. cluster.sh up runs this after
# OpenTofu; run it by hand after replacing a key. See
# docs/devops/stage-04-k8s-platform.md.
#
#   infra/local/secret-zero.sh
#
# 1. The age private key. Argo CD's repo server uses it to decrypt the
#    *.sops.yaml files in deploy/ (KSOPS). It lives in
#    ~/.config/sops/age/keys.txt (override: SOPS_AGE_KEY_FILE); created once
#    if missing. BACK IT UP: without it nobody can decrypt the secrets in
#    git, and they have to be re-created.
# 2. The local root CA. It signs the gateway's certificate. Its name
#    constraint limits it to qa.localtest.me and its subdomains, so even
#    though Windows trusts it, a certificate it signs for any other name is
#    rejected. It lives in ~/.config/qa-portal/local-ca/ (override:
#    LOCAL_CA_DIR); created once if missing. Trust ca.crt in Windows once
#    (the script prints the command). Losing it only means creating and
#    trusting a new one.
#
# Neither private key is printed or written anywhere but its file and the
# cluster.
set -euo pipefail

context="${KUBE_CONTEXT:-k3d-qa-portal}"
k() { kubectl --context "$context" "$@"; }

need() { command -v "$1" > /dev/null || { echo "Need $1 ($2)" >&2; exit 1; }; }
need kubectl "see versions.md"
need age-keygen "https://github.com/FiloSottile/age"
need openssl "apt install openssl"

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

# --dry-run -o yaml | apply: create or update; the key only goes through
# the pipe.
k -n argocd create secret generic sops-age \
  --from-file=keys.txt="$key_file" --dry-run=client -o yaml | k apply -f - > /dev/null
k -n argocd label secret sops-age app.kubernetes.io/part-of=argocd --overwrite > /dev/null
# The repo server reads the key from its environment at start.
k -n argocd rollout restart deployment/argocd-repo-server > /dev/null
echo "age key loaded into argocd/sops-age (repo server restarting)."
echo "Public key (goes in .sops.yaml; safe to share): $(age-keygen -y "$key_file")"

# 2. Local root CA -----------------------------------------------------------
ca_dir="${LOCAL_CA_DIR:-$HOME/.config/qa-portal/local-ca}"
if [[ ! -f "$ca_dir/ca.key" || ! -f "$ca_dir/ca.crt" ]]; then
  mkdir -p "$ca_dir"
  chmod 700 "$ca_dir"
  # pathlen:0: it can't create intermediates. nameConstraints (critical):
  # it can only sign qa.localtest.me and names under it.
  (umask 077 && openssl req -x509 -new -noenc \
    -newkey ec -pkeyopt ec_paramgen_curve:P-256 \
    -keyout "$ca_dir/ca.key" -out "$ca_dir/ca.crt" -days 1825 \
    -subj "/O=QA Portal local/CN=QA Portal local CA (qa.localtest.me only)" \
    -addext "basicConstraints=critical,CA:TRUE,pathlen:0" \
    -addext "keyUsage=critical,keyCertSign,cRLSign" \
    -addext "nameConstraints=critical,permitted;DNS:qa.localtest.me" \
    -addext "subjectKeyIdentifier=hash" 2> /dev/null)
  echo "Created a new local CA in $ca_dir (valid 5 years)."
  # The path is resolved here, so the command works in PowerShell too.
  echo "Trust it in Windows once (current user; Windows asks to confirm):"
  echo "  certutil.exe -user -addstore Root \"$(wslpath -w "$ca_dir/ca.crt")\""
fi
chmod 600 "$ca_dir/ca.key"

# The Issuer that uses it lives in kube-system, next to the gateway
# (deploy/platform/traefik/issuer.yaml). Only that namespace can use it.
k -n kube-system create secret tls local-ca \
  --cert="$ca_dir/ca.crt" --key="$ca_dir/ca.key" \
  --dry-run=client -o yaml | k apply -f - > /dev/null
echo "Local CA loaded into kube-system/local-ca ($(openssl x509 -in "$ca_dir/ca.crt" -noout -enddate))."
