terraform {
  required_version = "~> 1.13.2"
  required_providers {
    # A module states the provider it needs; the root that calls it pins
    # the exact version (and commits the lock file).
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "3.5.0"
    }
  }
}
