# tflint for every OpenTofu root and module under infra/ (CI: ci.yml, job "infra").
# The bundled terraform ruleset; "recommended" catches unused declarations,
# missing version constraints and deprecated syntax.
plugin "terraform" {
  enabled = true
  preset  = "recommended"
}
