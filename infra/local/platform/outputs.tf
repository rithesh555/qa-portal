output "environments" {
  description = "App namespaces with the baseline applied."
  value       = sort([for env in module.environment : env.name])
}

output "argocd" {
  description = "Argo CD release: namespace, chart version and app version."
  value = {
    namespace   = helm_release.argocd.namespace
    chart       = helm_release.argocd.metadata.version
    app_version = helm_release.argocd.metadata.app_version
  }
}

output "platform_revision" {
  description = "Git revision Argo CD syncs the platform add-ons from."
  value       = var.platform_revision
}
