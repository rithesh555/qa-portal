# DevOps overview: the map

This folder explains how the QA Portal is built, tested, shipped and run, and why each piece is there. It was written while we built it (Phase 9), so each stage has its own note with a hands-on exercise.

- **Plan:** [`docs/superpowers/plans/2026-11-02-phase-9-devops.md`](../superpowers/plans/2026-11-02-phase-9-devops.md)

## The delivery loop

```
idea → branch → commits (Conventional) → PR → CI checks → squash merge to main
     → images built, scanned, signed → GitOps commit → Argo CD deploys dev
     → promote to staging (tests run against it) → promote to prod (approval)
     → observe (metrics, logs, traces, SLO alerts) → learn → next idea
```

DevOps is that loop: **small changes, automated checks, repeatable delivery, and fast feedback from production.** Every tool below exists to make one step of it safer or faster.

## Stages

| #   | Stage                               | Note                                                 | Status  |
| --- | ----------------------------------- | ---------------------------------------------------- | ------- |
| 0   | Repo and ways of working            | [stage-00-sdlc.md](stage-00-sdlc.md)                 | done    |
| 1   | Containers                          | [stage-01-containers.md](stage-01-containers.md)     | done    |
| 2   | Continuous integration              | [stage-02-ci.md](stage-02-ci.md)                     | done    |
| 3   | Artifacts and supply-chain security | [stage-03-supply-chain.md](stage-03-supply-chain.md) | done    |
| 4   | Local Kubernetes platform as code   | [stage-04-k8s-platform.md](stage-04-k8s-platform.md) | done    |
| 5   | Helm chart and environments         | stage-05-helm.md                                     | planned |
| 6   | GitOps delivery and promotion       | stage-06-gitops.md                                   | planned |
| 7   | Observability and SLOs              | stage-07-observability.md                            | planned |
| 8   | Performance and security testing    | stage-08-testing.md                                  | planned |
| 9   | Reliability, backup/DR, operations  | stage-09-operations.md                               | planned |
| 10  | Cloud (optional)                    | stage-10-cloud.md                                    | later   |

## Other documents

- [`adr/`](adr/): Architecture Decision Records. Each one is a short note on a decision, the options weighed, and why we chose what we chose. Start with [0000-template](adr/0000-template.md).
- [`versions.md`](versions.md): every pinned tool and action version, and when it was checked.
- [`glossary.md`](glossary.md): DevOps terms in plain words.
- `runbooks/`: step-by-step procedures for operating the system (added from Stage 6).

## Ground rules

1. **Everything is code and in git.** That covers config, infrastructure, dashboards and policies. If it isn't in git, it doesn't exist.
2. **Pin everything, at least 2 weeks old.** A version that has been out for a while has had time for bad releases to be pulled. Renovate keeps the pins fresh.
3. **Least privilege.** Every workflow, pod and account gets only the permissions it needs.
4. **Secrets never go in git in plain text.** Locally they live in `.env` (ignored by git); in the cluster they're encrypted with SOPS; CI gets them from GitHub secrets.
5. **Heavy work runs in CI.** The laptop has 8 GB of RAM, so it runs only the lean cluster.
