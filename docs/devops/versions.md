# Pinned tool versions

The rule: every version is **at least 14 days old** when we pin it. Actions are pinned by commit SHA (the tag goes in a comment) and images by digest. Renovate proposes updates.

| Tool                                             | Version      | Released   | Pinned as                                                    | Checked    |
| ------------------------------------------------ | ------------ | ---------- | ------------------------------------------------------------ | ---------- |
| @commitlint/cli, @commitlint/config-conventional | 21.2.4       | 2026-10-18 | exact, root `devDependencies`                                | 2026-11-02 |
| lefthook                                         | 2.2.2        | 2026-10-13 | exact, root `devDependencies`                                | 2026-11-02 |
| gitleaks                                         | v8.30.1      | 2026-03-21 | `ghcr.io/gitleaks/gitleaks:v8.30.1` (hook fallback)          | 2026-11-02 |
| googleapis/release-please-action                 | v5.0.0       | 2026-04-22 | `45996ed1f6d02564a971a2fa1b5860e934307cf7`                   | 2026-11-02 |
| amannn/action-semantic-pull-request              | v6.1.1       | 2025-08-22 | `48f256284bd46cdaab1048c3721360e808335d50`                   | 2026-11-02 |
| GitHub runner image                              | ubuntu-24.04 | n/a        | label                                                        | 2026-11-02 |
| node (base image)                                | 22.23.3      | 2026-09-23 | `node:22.23.3-bookworm-slim@sha256:3ed98443…`                | 2026-11-02 |
| nginx-unprivileged (base image)                  | 1.30.6       | 2026-10-14 | `nginxinc/nginx-unprivileged:1.30.6-alpine@sha256:f5116ed4…` | 2026-11-02 |
| postgres (stack image)                           | 17.11        | n/a        | `postgres:17.11-alpine@sha256:266d3c25…`                     | 2026-11-02 |
| pnpm (in the build stages)                       | 12.11.2      | 2026-10-09 | `corepack prepare pnpm@12.11.2`                              | 2026-11-02 |
| hadolint                                         | v2.15.1      | 2026-07-31 | `hadolint/hadolint:v2.15.1`                                  | 2026-11-02 |
| shellcheck                                       | v0.11.0      | 2025-08-04 | `koalaman/shellcheck:v0.11.0`                                | 2026-11-02 |
| trivy                                            | 0.76.0       | 2026-10-14 | `aquasec/trivy:0.76.0` (0.76.1 is under 14 days old)         | 2026-11-02 |

**Images: version age versus digest.** The 14-day rule applies to the _version_ (Node 22.23.3, nginx 1.30.6). The digest is whatever build of that version is current, because upstream rebuilds a tag to ship OS security patches. Renovate (`docker:pinDigests`) proposes new digests as they appear.
