# Root module 1 of 2: the k3d cluster itself.
#
# There is no well-maintained k3d provider, so this wraps the k3d CLI in a
# terraform_data resource. That keeps create/delete in OpenTofu's plan and
# state, with one cost: OpenTofu can't see inside the cluster, so a cluster
# deleted by hand (k3d cluster delete) still looks present here.
# infra/local/cluster.sh up notices that and applies with
# -replace=terraform_data.cluster.
#
# The platform (Argo CD, namespaces) is a separate root, infra/local/platform:
# a provider can't be configured from a cluster created in the same apply.

locals {
  config_file = abspath("${path.module}/../k3d.yaml")
  config      = yamldecode(file(local.config_file))
  name        = local.config.metadata.name
}

resource "terraform_data" "cluster" {
  # k3d can't change a running cluster's settings: any change to the parsed
  # config replaces the cluster and everything in it (volumes too), so
  # `plan` says "must be replaced". Comments and formatting don't count.
  # A k3s image bump is such a change: back up first (Stage 9).
  triggers_replace = jsonencode(local.config)

  # Stored in state so the destroy provisioner can use it (it may only
  # reference self).
  input = {
    name = local.name
  }

  provisioner "local-exec" {
    command = "k3d cluster create --config \"$CONFIG\""
    environment = {
      CONFIG = local.config_file
    }
  }

  # Safe to re-run: deleting a missing cluster is not an error in k3d.
  provisioner "local-exec" {
    when    = destroy
    command = "k3d cluster delete \"$NAME\""
    environment = {
      NAME = self.input.name
    }
  }
}
