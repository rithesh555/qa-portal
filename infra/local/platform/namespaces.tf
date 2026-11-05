# The three app environments. Same guardrails everywhere, so what passes in
# dev is what runs in prod; only the sizes could differ.
#
# Requests across the three (2.25 GiB) plus Argo CD and k3s fit the 4 GiB
# node cap. Limits may add up to more than the node: they are ceilings, and
# not every pod reaches its ceiling at once.

locals {
  app_quota = {
    requests_cpu    = "1"
    requests_memory = "768Mi"
    limits_memory   = "1536Mi"
    pods            = 15
    pvcs            = 3
    storage         = "6Gi"
  }

  environments = {
    "qa-dev"     = local.app_quota
    "qa-staging" = local.app_quota
    "qa-prod"    = local.app_quota
  }
}

module "environment" {
  source   = "../../modules/namespace-baseline"
  for_each = local.environments

  name  = each.key
  quota = each.value
  labels = {
    "app.kubernetes.io/part-of" = "qa-portal"
    "qa-portal/environment"     = trimprefix(each.key, "qa-")
  }
}
