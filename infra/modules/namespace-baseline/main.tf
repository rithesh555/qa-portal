# A namespace with the guardrails every app environment starts from:
#   - Pod Security Admission "restricted": pods must run as non-root, drop
#     all capabilities, use the RuntimeDefault seccomp profile, no host access.
#   - Default-deny NetworkPolicy, ingress and egress. Only DNS is allowed out;
#     each app opens exactly the paths it needs (Stage 5).
#   - ResourceQuota: one environment can't starve the others on a 4 GB node.
#   - LimitRange: a container that sets no resources still gets sensible
#     requests and a memory limit, so the quota can admit it.

resource "kubernetes_namespace_v1" "this" {
  metadata {
    name = var.name
    labels = merge(var.labels, {
      "pod-security.kubernetes.io/enforce"         = "restricted"
      "pod-security.kubernetes.io/enforce-version" = var.pod_security_version
      "pod-security.kubernetes.io/warn"            = "restricted"
      "pod-security.kubernetes.io/warn-version"    = var.pod_security_version
      "pod-security.kubernetes.io/audit"           = "restricted"
      "pod-security.kubernetes.io/audit-version"   = var.pod_security_version
    })
  }
}

resource "kubernetes_network_policy_v1" "default_deny" {
  metadata {
    name      = "default-deny"
    namespace = kubernetes_namespace_v1.this.metadata[0].name
  }
  spec {
    pod_selector {} # every pod in the namespace
    policy_types = ["Ingress", "Egress"]
    # No ingress or egress rules: nothing in, nothing out.
  }
}

resource "kubernetes_network_policy_v1" "allow_dns" {
  metadata {
    name      = "allow-dns"
    namespace = kubernetes_namespace_v1.this.metadata[0].name
  }
  spec {
    pod_selector {}
    policy_types = ["Egress"]
    egress {
      to {
        namespace_selector {
          match_labels = {
            "kubernetes.io/metadata.name" = "kube-system"
          }
        }
        pod_selector {
          match_labels = {
            "k8s-app" = "kube-dns"
          }
        }
      }
      ports {
        port     = "53"
        protocol = "UDP"
      }
      ports {
        port     = "53"
        protocol = "TCP"
      }
    }
  }
}

resource "kubernetes_resource_quota_v1" "this" {
  metadata {
    name      = "quota"
    namespace = kubernetes_namespace_v1.this.metadata[0].name
  }
  spec {
    hard = {
      "requests.cpu"           = var.quota.requests_cpu
      "requests.memory"        = var.quota.requests_memory
      "limits.memory"          = var.quota.limits_memory
      "pods"                   = var.quota.pods
      "persistentvolumeclaims" = var.quota.pvcs
      "requests.storage"       = var.quota.storage
      # Traffic comes in through the shared gateway, never per-app ports.
      "services.loadbalancers" = 0
      "services.nodeports"     = 0
    }
  }
}

resource "kubernetes_limit_range_v1" "this" {
  metadata {
    name      = "defaults"
    namespace = kubernetes_namespace_v1.this.metadata[0].name
  }
  spec {
    limit {
      type = "Container"
      # No default CPU limit on purpose: CPU limits throttle a busy Node.js
      # process even when the node is idle. Memory is the resource that
      # takes a node down, so memory always has a limit.
      default_request = {
        cpu    = var.container_defaults.cpu_request
        memory = var.container_defaults.memory_request
      }
      default = {
        memory = var.container_defaults.memory_limit
      }
      max = {
        memory = var.container_defaults.memory_max
      }
    }
  }
}
