variable "name" {
  description = "Namespace name, e.g. qa-dev."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9]([-a-z0-9]*[a-z0-9])?$", var.name)) && length(var.name) <= 63
    error_message = "Must be a valid Kubernetes namespace name (RFC 1123 label)."
  }
}

variable "labels" {
  description = "Extra labels for the namespace (the Pod Security labels are always set)."
  type        = map(string)
  default     = {}
}

variable "pod_security_version" {
  description = "Pod Security Standards version to enforce. Pinned so a cluster upgrade can't tighten the rules without a reviewed change."
  type        = string
  default     = "v1.36"

  validation {
    condition     = can(regex("^v1\\.[0-9]+$", var.pod_security_version))
    error_message = "Use a Kubernetes minor version such as v1.36."
  }
}

variable "quota" {
  description = "ResourceQuota hard limits for the namespace."
  type = object({
    requests_cpu    = string
    requests_memory = string
    limits_memory   = string
    pods            = number
    pvcs            = number
    storage         = string
  })
}

variable "container_defaults" {
  description = "LimitRange defaults for containers that set no resources, and the per-container memory ceiling."
  type = object({
    cpu_request    = string
    memory_request = string
    memory_limit   = string
    memory_max     = string
  })
  default = {
    cpu_request    = "25m"
    memory_request = "64Mi"
    memory_limit   = "256Mi"
    memory_max     = "1Gi"
  }
}
