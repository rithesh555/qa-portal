# The app-of-apps root: the only Argo CD object OpenTofu creates. From here
# git drives the platform add-ons (deploy/argocd/platform renders one
# Application per add-on). It's the argocd-apps chart rather than a
# kubernetes_manifest, because a kubernetes_manifest needs the Application
# CRD at plan time, and on a fresh cluster the CRD only exists after the
# Argo CD release above is applied.

locals {
  repo_url = "https://github.com/rithesh555/qa-portal.git"

  # Three projects, so each Application can only touch what it owns.
  # They catch mistakes (a chart that suddenly writes somewhere new), not a
  # determined attacker: anything allowed to create a ClusterRoleBinding or
  # a webhook can make itself cluster-admin. Review of what merges to main
  # is the real boundary. See docs/devops/stage-04-k8s-platform.md.
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
    # cluster-wide kinds operators install (CRDs, their RBAC, webhooks).
    # Not argocd or kube-system.
    platform = {
      namespace   = "argocd"
      description = "Platform add-ons (cert-manager, CloudNativePG, Garage)."
      sourceRepos = [
        local.repo_url,
        "quay.io/jetstack/charts",
        "ghcr.io/cloudnative-pg/charts",
      ]
      destinations = [for ns in ["cert-manager", "cnpg-system", "garage"] :
        { server = "https://kubernetes.default.svc", namespace = ns }
      ]
      clusterResourceWhitelist = [
        { group = "", kind = "Namespace" },
        { group = "apiextensions.k8s.io", kind = "CustomResourceDefinition" },
        { group = "rbac.authorization.k8s.io", kind = "ClusterRole" },
        { group = "rbac.authorization.k8s.io", kind = "ClusterRoleBinding" },
        { group = "admissionregistration.k8s.io", kind = "MutatingWebhookConfiguration" },
        { group = "admissionregistration.k8s.io", kind = "ValidatingWebhookConfiguration" },
      ]
    }

    # k3s' Traefik configuration: three kinds in kube-system and nothing
    # else. kube-system also holds k3s' HelmChart objects, which install
    # charts with cluster-admin rights, so no other project may write there.
    gateway = {
      namespace                = "argocd"
      description              = "Configuration of the k3s Traefik gateway (kube-system)."
      sourceRepos              = [local.repo_url]
      destinations             = [{ server = "https://kubernetes.default.svc", namespace = "kube-system" }]
      clusterResourceWhitelist = []
      namespaceResourceWhitelist = [
        { group = "helm.cattle.io", kind = "HelmChartConfig" },
        { group = "cert-manager.io", kind = "Issuer" },
        { group = "cert-manager.io", kind = "Certificate" },
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
