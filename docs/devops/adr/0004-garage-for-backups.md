# ADR 0004: Garage as the local S3 store for database backups

- **Status:** accepted
- **Date:** 2026-11-06
- **Deciders:** project owner, with Claude

## Context

CloudNativePG backs up Postgres (base backups plus WAL) to S3-compatible object storage through the Barman Cloud plugin. The cluster needs a local S3 store so we can practise backups and restores before any cloud (Stage 9). The Phase 9 plan named MinIO.

MinIO's community edition changed during 2025–2026:

- no official images or binaries since October 2025;
- maintenance mode in December 2025;
- marked "no longer maintained" in February 2026;
- source-only, with the maintained product being the commercial AIStor.

Our rules are that every image is pinned, at least 14 days old, scanned, and still maintained upstream (Stage 3). An image that will never get another CVE fix can't meet them for long.

## Options considered

1. **The last MinIO community image.**
   - Pros: on CloudNativePG's list of tested object stores, and the most tutorials.
   - Cons: unmaintained. Every future CVE becomes a permanent Trivy ignore.
2. **SeaweedFS.**
   - Pros: mature, active, has an official Helm chart.
   - Cons: several components (master, volume, filer, S3 gateway), so more memory and more moving parts than a backup target needs.
3. **Garage.**
   - Pros: a small S3-compatible store built for self-hosting, maintained, with official images. Since v2.3 it can configure a single node, an access key and a bucket on first start, from environment variables. It uses about 20 MiB here.
   - Cons: not on CloudNativePG's tested list; no published Helm chart (only one in its git repository).
4. **A cloud bucket now.**
   - Pros: the real thing.
   - Cons: costs money, needs credentials from the laptop, and is Stage 10's job.

## Decision

We chose **Garage v2.4.1**, deployed from our own small set of manifests (`deploy/platform/garage/`), not its git-hosted chart. It is the smallest maintained option, and its single-node start fits a laptop.

## Consequences

- **The backup path isn't on CloudNativePG's tested list,** so the Stage 9 restore drill is what proves it. If a backup or restore fails because of S3 compatibility, we revisit this ADR, not the drill.
- **We own about 100 lines of YAML** (StatefulSet, Service, NetworkPolicy, config) instead of a chart. Renovate bumps the image.
- **One bucket and one key for every environment for now.** Per-environment keys and prefixes come with the app's database in Stage 5.
- **Plain HTTP inside the cluster.** Only the app namespaces may reach the S3 port (a NetworkPolicy). Stage 9 decides whether to add TLS.
- **Backups live in the same cluster as the database.** Garage's volume is on the k3d node, so `cluster.sh down` deletes the backups together with the databases they protect, and a lost laptop loses both. That's fine for learning the mechanics, not for data we care about: Stage 9 adds a copy outside the cluster and proves a restore from it.
- **Cloud (Stage 10) replaces Garage with a real bucket.** Only the plugin's `ObjectStore` endpoint and credentials change.
