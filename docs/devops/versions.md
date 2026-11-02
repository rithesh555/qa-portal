# Pinned tool versions

The rule: every version is **at least 14 days old** when we pin it. Actions are pinned by commit SHA (the tag goes in a comment) and images by digest. Renovate proposes updates.

| Tool                                             | Version      | Released   | Pinned as                                           | Checked    |
| ------------------------------------------------ | ------------ | ---------- | --------------------------------------------------- | ---------- |
| @commitlint/cli, @commitlint/config-conventional | 21.2.4       | 2026-10-18 | exact, root `devDependencies`                       | 2026-11-02 |
| lefthook                                         | 2.2.2        | 2026-10-13 | exact, root `devDependencies`                       | 2026-11-02 |
| gitleaks                                         | v8.30.1      | 2026-03-21 | `ghcr.io/gitleaks/gitleaks:v8.30.1` (hook fallback) | 2026-11-02 |
| googleapis/release-please-action                 | v5.0.0       | 2026-04-22 | `45996ed1f6d02564a971a2fa1b5860e934307cf7`          | 2026-11-02 |
| amannn/action-semantic-pull-request              | v6.1.1       | 2025-08-22 | `48f256284bd46cdaab1048c3721360e808335d50`          | 2026-11-02 |
| GitHub runner image                              | ubuntu-24.04 | n/a        | label                                               | 2026-11-02 |
