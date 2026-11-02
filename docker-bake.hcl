# The three images, built in one graph so they share the build stages.
#   docker buildx bake --load            # qa-portal-{api,migrate,web}:local
#   TAG=sha-abc1234 docker buildx bake   # another tag
# CI adds the GitHub Actions cache (.github/workflows/ci.yml).
variable "TAG" {
  default = "local"
}

group "default" {
  targets = ["api", "migrate", "web"]
}

target "_common" {
  context    = "."
  dockerfile = "Dockerfile"
}

target "api" {
  inherits = ["_common"]
  target   = "api"
  tags     = ["qa-portal-api:${TAG}"]
}

target "migrate" {
  inherits = ["_common"]
  target   = "migrate"
  tags     = ["qa-portal-migrate:${TAG}"]
}

target "web" {
  inherits = ["_common"]
  target   = "web"
  tags     = ["qa-portal-web:${TAG}"]
}
