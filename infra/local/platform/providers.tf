# Both providers talk to the cluster through the context k3d wrote to the
# kubeconfig. Naming the context (not "current") means a kubectl
# `use-context` to some other cluster can never redirect an apply.

provider "kubernetes" {
  config_path    = var.kubeconfig
  config_context = var.kube_context
}

provider "helm" {
  kubernetes = {
    config_path    = var.kubeconfig
    config_context = var.kube_context
  }
}
