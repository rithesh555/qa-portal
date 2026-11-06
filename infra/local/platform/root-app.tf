# The app-of-apps root: the only Argo CD object OpenTofu creates. From here
# git drives the platform add-ons (deploy/argocd/platform renders one
# Application per add-on). It's the argocd-apps chart rather than a
# kubernetes_manifest, because a kubernetes_manifest needs the Application
# CRD at plan time, and on a fresh cluster the CRD only exists after the
# Argo CD release above is applied.

locals {
  repo_url = "https://github.com/rithesh555/qa-portal.git"

  # Two projects, so each Application can only touch what it owns.
  projects = {
    # The root: may only create Application objects in argocd.
    bootstrap = {
      namespace   = "argocd"
      description = "The app-of-apps root: Application objects only."
      sourceRepos = [local.repo_url]
      destinations = [
        { server = "https://kubernetes.default.svc", namespace = "argocd" },
      ]
      clusterResourceWhitelist = []
      namespaceResourceWhitelist = [
        { group = "argoproj.io", kind = "Application" },
      ]
    }

    # The add-ons: only these sources and namespaces, and only the
    # cluster-wide kinds operators need. Never argocd itself, so no add-on
    # can change Argo CD or its RBAC.
    platform = {
      namespace   = "argocd"
      description = "Platform add-ons (cert-manager, CloudNativePG, Garage, Traefik config)."
      sourceRepos = [
        local.repo_url,
        "quay.io/jetstack/charts",
        "ghcr.io/cloudnative-pg/charts",
      ]
      destinations = [for ns in ["cert-manager", "cnpg-system", "garage", "kube-system"] :
        { server = "https://kubernetes.default.svc", namespace = ns }
      ]
      clusterResourceWhitelist = [
        { group = "", kind = "Namespace" },
        { group = "apiextensions.k8s.io", kind = "CustomResourceDefinition" },
        { group = "rbac.authorization.k8s.io", kind = "ClusterRole" },
        { group = "rbac.authorization.k8s.io", kind = "ClusterRoleBinding" },
        { group = "admissionregistration.k8s.io", kind = "MutatingWebhookConfiguration" },
        { group = "admissionregistration.k8s.io", kind = "ValidatingWebhookConfiguration" },
        { group = "cert-manager.io", kind = "ClusterIssuer" },
      ]
    }
  }

  applications = {
    platform = {
      namespace = "argocd"
      project   = "bootstrap"
      source = {
        repoURL        = local.repo_url
        targetRevision = var.platform_revision
        path           = "deploy/argocd/platform"
        helm = {
          valuesObject = {
            repoURL  = local.repo_url
            revision = var.platform_revision
          }
        }
      }
      destination = { server = "https://kubernetes.default.svc", namespace = "argocd" }
      syncPolicy = {
        automated = { prune = true, selfHeal = true }
      }
    }
  }
}

resource "helm_release" "platform_apps" {
  name       = "platform-apps"
  namespace  = kubernetes_namespace_v1.argocd.metadata[0].name
  repository = "oci://ghcr.io/argoproj/argo-helm"
  chart      = "argocd-apps"
  version    = "2.0.7"

  values = [yamlencode({
    projects     = local.projects
    applications = local.applications
  })]

  atomic          = true
  cleanup_on_fail = true
  max_history     = 5

  # Needs the Application and AppProject CRDs from the Argo CD release.
  depends_on = [helm_release.argocd]
}
