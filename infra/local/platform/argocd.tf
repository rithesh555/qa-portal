# Argo CD "core": the GitOps engine (application controller, repo server,
# ApplicationSet controller, Redis) without the API server, UI, Dex or
# notifications. About 0.5 GB instead of about 1.5 GB for the full install.
#
# Ownership: OpenTofu owns the Argo CD install for good; every apply
# reconciles this release. Argo CD manages everything else from git (from
# part 2 on) but never its own install, so two tools never fight over one
# object. Upgrade Argo CD here (Renovate PR), not from deploy/.

resource "kubernetes_namespace_v1" "argocd" {
  metadata {
    name = "argocd"
    labels = {
      # The chart's pods already meet "restricted"; enforcing it here
      # proves it and keeps it that way.
      "pod-security.kubernetes.io/enforce"         = "restricted"
      "pod-security.kubernetes.io/enforce-version" = "v1.36"
    }
  }
}

resource "helm_release" "argocd" {
  name      = "argocd"
  namespace = kubernetes_namespace_v1.argocd.metadata[0].name
  # The chart from Argo's OCI registry on GHCR (the same registry as our
  # images) rather than the GitHub Pages index.
  repository = "oci://ghcr.io/argoproj/argo-helm"
  chart      = "argo-cd"
  version    = "10.10.5" # Argo CD v3.5.5

  values = [file("${path.module}/argocd-values.yaml")]

  # A failed install or upgrade rolls back instead of leaving a half
  # release; wait until every pod is ready before calling it done.
  atomic          = true
  cleanup_on_fail = true
  timeout         = 600
  max_history     = 5
}
