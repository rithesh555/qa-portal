// Conventional Commits (https://www.conventionalcommits.org). PRs are
// squash-merged with the PR title as the commit, so CI checks PR titles with
// the same types (.github/workflows/pr-title.yml).
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "perf",
        "refactor",
        "test",
        "docs",
        "build",
        "ci",
        "chore",
        "revert",
      ],
    ],
    // Sentence-case subjects ("Phase 9: …", "E2E …") are fine here.
    "subject-case": [0],
    "header-max-length": [2, "always", 100],
    // Bodies hold wrapped prose and tables; long URLs must not fail a commit.
    "body-max-line-length": [0],
    "footer-max-line-length": [0],
  },
}
