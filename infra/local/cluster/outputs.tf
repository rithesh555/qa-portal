output "name" {
  description = "k3d cluster name."
  value       = terraform_data.cluster.output.name
}

output "kube_context" {
  description = "kubectl context k3d writes to ~/.kube/config."
  value       = "k3d-${terraform_data.cluster.output.name}"
}
