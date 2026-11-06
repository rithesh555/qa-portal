terraform {
  required_version = "~> 1.13.2"
  required_providers {
    # Exact pins; .terraform.lock.hcl records the checksums. Renovate bumps
    # both together.
    helm = {
      source  = "hashicorp/helm"
      version = "3.3.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "3.4.0"
    }
  }
}
