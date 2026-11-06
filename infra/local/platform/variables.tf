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

variable "platform_revision" {
  description = <<-EOT
    Git revision the platform add-ons come from (branch, tag or commit).
    main in normal use; a branch name to try platform changes before they
    merge (the branch must be pushed: Argo CD reads from GitHub).
  EOT
  type        = string
  default     = "main"
}
