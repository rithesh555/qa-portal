terraform {
  # State stays local (git-ignored): one laptop, one cluster. A shared
  # environment would use a remote backend with locking (Stage 10).
  required_version = "~> 1.13.2"
}
