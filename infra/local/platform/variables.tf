variable "kubeconfig" {
  description = "Kubeconfig file k3d writes the cluster's context to."
  type        = string
  default     = "~/.kube/config"
}

variable "kube_context" {
  description = "Context of the local cluster (output kube_context of infra/local/cluster)."
  type        = string
  default     = "k3d-qa-portal"

  validation {
    # This root only ever targets the local k3d cluster.
    condition     = startswith(var.kube_context, "k3d-")
    error_message = "infra/local/platform only targets a local k3d cluster (context k3d-*)."
  }
}
