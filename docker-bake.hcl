# The three images, built in one graph so they share the build stages.
#   docker buildx bake --load            # qa-portal-{api,migrate,web}:local
#   TAGS=dev,try docker buildx bake      # other tags (comma-separated)
#   docker buildx bake --print           # show the resolved definition
# CI adds the GitHub Actions cache (.github/workflows/ci.yml); the publish
# workflow sets the registry prefix, tags and labels (.github/workflows/build.yml).

# Prepended to "<name>", e.g. "ghcr.io/rithesh555/qa-portal-".
variable "IMAGE_PREFIX" {
  default = "qa-portal-"
}

# Comma-separated tags for every image.
variable "TAGS" {
  default = "local"
}

# OCI labels. CI fills these; local builds say so instead.
variable "REVISION" {
  default = "local"
}

variable "SOURCE" {
  default = "https://github.com/rithesh555/qa-portal"
}

variable "CREATED" {
  default = ""
}

# The commit's tag (sha-<7>). A release reuses the same image, so its
# version lives in the tags, not in this label.
variable "VERSION" {
  default = "local"
}

function "image_tags" {
  params = [name]
  result = [for tag in split(",", TAGS) : "${IMAGE_PREFIX}${name}:${trimspace(tag)}"]
}

function "oci_labels" {
  params = [title, description]
  result = {
    "org.opencontainers.image.title"       = title
    "org.opencontainers.image.description" = description
    # Links the GHCR package to this repository.
    "org.opencontainers.image.source"   = SOURCE
    "org.opencontainers.image.url"      = SOURCE
    "org.opencontainers.image.revision" = REVISION
    "org.opencontainers.image.created"  = CREATED
    "org.opencontainers.image.version"  = VERSION
    # Set explicitly: otherwise the base image's own labels (nginx's
    # "Apache-2.0", "1.30.6-alpine") would describe our image.
    "org.opencontainers.image.licenses" = "NOASSERTION"
  }
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
  tags     = image_tags("api")
  labels   = oci_labels("qa-portal-api", "QA Portal API (Fastify)")
}

target "migrate" {
  inherits = ["_common"]
  target   = "migrate"
  tags     = image_tags("migrate")
  labels   = oci_labels("qa-portal-migrate", "QA Portal database migrations (Prisma migrate deploy)")
}

target "web" {
  inherits = ["_common"]
  target   = "web"
  tags     = image_tags("web")
  labels   = oci_labels("qa-portal-web", "QA Portal web app (nginx serving the built SPA)")
}
