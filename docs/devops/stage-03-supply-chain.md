# Stage 3: Artifacts and supply-chain security

**Goal:** everything we ship can be traced back to the commit and workflow that built it, and anyone can check that, without trusting us or a key we keep. Automation acts under its own narrow identity instead of a person's.

## What gets published

Every commit on `main` publishes three images to GitHub Container Registry (GHCR):

| Image                                  | What it runs                       |
| -------------------------------------- | ---------------------------------- |
| `ghcr.io/rithesh555/qa-portal-api`     | the Fastify API                    |
| `ghcr.io/rithesh555/qa-portal-migrate` | `prisma migrate deploy`, then exit |
| `ghcr.io/rithesh555/qa-portal-web`     | nginx serving the built SPA        |

Each image has:

- **Tags:**
  - `sha-<7>` names one commit's image. It's written once: a re-run of `build.yml` finds it already there and reuses that image instead of pushing another.
  - `main` moves to the newest commit.
  - A release adds `1.0.1`, `1.0` and `1`.
- **OCI labels** (`org.opencontainers.image.*`): the source repo, the exact commit (`revision`), the commit time, a title, and `version` = `sha-<7>`. The `source` label also links the GHCR package to this repo. `licenses` is set to `NOASSERTION` on purpose: without it, the web image inherited nginx's own `Apache-2.0` and `1.30.6-alpine` labels, which describe nginx, not our app.
- **A cosign signature**, keyless.
- **Two attestations:** an SBOM (SPDX JSON, made by Syft) and SLSA build provenance.

Pull requests never publish. `ci.yml` builds and scans their images without pushing them.

## How a commit becomes a signed image

```
merge to main ─► build.yml
                  build     (per image; can push, can't sign)
                  ├─ bake: build with the Actions cache, push as sha-<7>    ─► digest
                  └─ Trivy on <image>@<digest>                (findings stop the run)
                  sign      (per image; can sign, never checks out or builds)
                  ├─ cosign sign <image>@<digest>             (keyless, logged in Rekor)
                  ├─ syft <image>@<digest> → sbom.spdx.json   ─► SBOM attestation
                  └─ provenance attestation                   (SLSA, signed by Sigstore)
                  tag-main  move "main" on all three, if this commit is still main's head
release PR merged ─► release.yml: tag vX.Y.Z, publish the release
                  ─► promote.yml: wait for that commit's build.yml
                  ├─ resolve sha-<7> to a digest, once
                  ├─ cosign verify + verify-attestation (build.yml on main, this commit) ─► else stop
                  └─ all three passed: add 1.2.3 (and 1.2, 1 if it's the newest) to those digests
every night     ─► image-rescan.yml: Trivy on :main ─► open, update or close an issue
```

### Why three jobs

A job's permissions apply to **every step in it**. `id-token: write` lets any step mint the OIDC token and sign as "`build.yml` on `main`". If the job that signs also ran our Dockerfile, the build actions and a Syft container holding registry credentials, a compromise of any one of them could sign anything it liked. So:

- **`build`** runs the risky, third-party-heavy part (checkout, buildx, bake, our Dockerfile, Trivy). It can push to GHCR but has no `id-token`, so it can't sign.
- **`sign`** never checks out the repo or builds anything. It gets the digest from `build` (as a tiny artifact, because matrix jobs can't pass one output per leg) and runs only cosign, Syft (with no credentials; the packages are public) and `actions/attest`.
- **`tag-main`** has only `packages: write` and moves `main` once all three images are signed.

This separation of "build" from "sign the provenance" is what SLSA Build Level 3 asks for: the build steps can't forge the provenance about themselves.

### Tags lie, digests don't

A tag is a name that can be pointed at a different image at any time, by us or by an attacker with push access. A **digest** (`sha256:…`) is the hash of the image itself. That's why:

- **Everything is signed and attested by digest,** never by tag.
- **Releases are promoted, not rebuilt.** `docker buildx imagetools create --prefer-index=false` adds the version tags to the exact manifest `main` already built, scanned and signed, after `promote.yml` has **verified** its signature and provenance. A rebuild would give a new digest, and the signatures would no longer apply to it. "Build once, promote everywhere" is the rule from here on; Stage 6 deploys by digest too.
- **`main` moves carefully.** Runs for two quick merges can finish out of order, so the last step moves `main` only if `git ls-remote` still shows this commit as main's head.

## Signing: cosign, keyless

The usual way to sign something is with a private key. Then you have to store that key, rotate it, and hope it never leaks. **Keyless signing** has no long-lived key:

1. The job asks GitHub for an **OIDC token**. GitHub signs that token, and it states who is asking: this repo, `build.yml`, `refs/heads/main`. This is what the job's `id-token: write` permission allows.
2. **Fulcio** (Sigstore's certificate authority) checks the token and issues a certificate valid for **10 minutes**, with that identity written into it.
3. cosign signs the digest with a throwaway key matching that certificate. It then records the signature in **Rekor**, Sigstore's public, append-only transparency log, and pushes the signature to GHCR next to the image.

To verify, you don't need a public key. You say **who** must have signed the image:

```bash
cosign verify ghcr.io/rithesh555/qa-portal-api@sha256:<digest> \
  --certificate-identity https://github.com/rithesh555/qa-portal/.github/workflows/build.yml@refs/heads/main \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

Verify **by digest**, as above. Verifying `:main` works too, but it checks whatever the tag points at _right now_, which may not be the image you go on to pull.

An image signed from a fork, a PR branch or another workflow file fails that check.

**Producing a signature is not the same as enforcing it.** A signature only protects you where something refuses an image that fails the check:

- **Today:** `promote.yml` refuses to version-tag an image that isn't signed by `build.yml` on `main` **for the release commit** (`--certificate-github-workflow-sha <commit>`). Without that, anything able to push to `sha-<7>` could get its image released, including an older, genuinely signed image moved onto the tag. The identity says _who_ signed; the commit check says _what source_ it was. `build.yml` also refuses to re-sign an existing `sha-<7>` image whose `revision` label isn't this commit.
- **All checks before any write:** promote verifies all three images before it tags any of them, so a failure never leaves a release half-tagged.
- **Promote again by hand** (a failed or partial promotion): Actions → "Promote release images" → Run workflow on `main`, with the tag (e.g. `v1.0.5`), or `gh workflow run promote.yml -f tag=v1.0.5`. The same checks run, and it's safe to repeat.
- **Stage 6:** Kyverno refuses to run such an image in the cluster.

## The SBOM: what's inside

**Syft** reads the pushed image straight from the registry and lists every package in it: OS packages from the base image, plus every npm package in `node_modules`, with versions, licences and package URLs (`purl`s). It writes them as **SPDX JSON**.

The SBOM is attached as an **attestation**. That means it's signed in the same keyless way, so nobody can swap in a cleaner-looking list.

**Why bother:** the day a new CVE lands (think Log4Shell), "are we affected?" becomes a search through SBOMs instead of an audit.

## Provenance: how it was built

`actions/attest` writes a **SLSA build provenance** statement and signs it the same keyless way. The statement records:

- the source repo and commit;
- the workflow file and ref;
- the run ID and the runner environment.

`gh attestation verify` checks the signature and the identity in it. With only `--repo`, any workflow on any branch of this repo would pass, so also say which workflow and ref:

```bash
gh attestation verify oci://ghcr.io/rithesh555/qa-portal-api@sha256:<digest> \
  --repo rithesh555/qa-portal \
  --signer-workflow rithesh555/qa-portal/.github/workflows/build.yml --source-ref refs/heads/main
```

It's the same identity the `cosign verify` command names. (`cosign verify-attestation --type https://slsa.dev/provenance/v1` with the cosign flags above checks the same thing; `promote.yml` uses that.) GitHub keeps the attestations, and `push-to-registry` also stores them in GHCR next to the image, so the cluster can read them later.

**cosign signature and attestations: isn't that two signatures?** Yes, on purpose. The attestations carry facts (packages, build details). The cosign signature is the plain "this repo's build workflow published this digest" check that admission controllers support most widely.

## Vulnerability management after release

An image that was clean at build time can have a critical CVE next week, because advisories keep being published. So:

- **The PR gate** (`ci.yml`, Stage 2) blocks fixable HIGH/CRITICAL findings before merge.
- **`build.yml`** scans the exact digest it published, before anything is signed. The PR scanned a different build (the PR's merge preview), and a new advisory may have landed between the PR and the merge. "Scan what you ship."
- **`image-rescan.yml`** runs every night at 04:15 UTC and scans each `:main` image again with fresh vulnerability data.
  - With findings, it opens one issue per image, or updates the open one with a comment.
  - When a later scan is clean, the issue closes itself.
  - A broken scan (any exit code other than 0 or "findings") fails the job, so it never looks like a clean result.
- **`.trivyignore.yaml`** lists the findings we've accepted, used by both scans. Every entry must have a `statement` (why it can't affect us) and an `expired_at` date, at most 90 days out.
  - The CI image job checks the first rule with `yq`.
  - Trivy itself enforces the date: after it, the finding counts again.
  - It's the same policy as the pnpm audit ignores.

## Decisions, and what we left out

| Decision                                                                   | Why                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **amd64 only** (no arm64)                                                  | The laptop cluster (k3d on WSL) and GitHub's runners are x86. Building arm64 under QEMU emulation would multiply build time for a platform nobody runs. Add it the day a target needs it: `platforms = ["linux/amd64", "linux/arm64"]` in `docker-bake.hcl`. |
| **BuildKit's own provenance and SBOM turned off**                          | One source of truth (the GitHub attestations), and each image stays a plain single-platform manifest, which keeps the retag and verify steps simple.                                                                                                         |
| **`actions/attest`**, not `attest-build-provenance` / `attest-sbom`        | Both are now thin wrappers around `actions/attest`, and `attest-sbom` is being deprecated.                                                                                                                                                                   |
| **Trivy again in `build.yml`**                                             | The PR's scan was of a different build, and advisories keep landing. Scanning the published digest costs about 30 seconds and means "signed" also means "scanned".                                                                                           |
| **Promotion in its own workflow** (`promote.yml`, on `release: published`) | It used to be a job in `release.yml` and held that workflow's concurrency lock while it waited for the build, delaying the next release-please run. Releases are created with the App token, so they do trigger workflows.                                   |
| **harden-runner in `audit` mode** (not `block`)                            | Blocking needs an allowlist of every host each job talks to. Worth doing for the `sign` job once the list has settled from the audit logs; a later hardening item.                                                                                           |
| **Build images on `main` again** (even though CI built the PR's)           | A PR's images are built from the PR's merge preview, not from the commit that actually lands on `main`. Publishing what was actually merged keeps provenance honest. The Actions cache makes the rebuild quick.                                              |
| **The Actions cache in a publishing workflow**                             | This is safe here because GitHub isolates caches by branch. A PR's cache can't be read from `main`, so a PR can't poison what `main` publishes.                                                                                                              |

## One-off steps for you

1. **Make the three packages public** after the first `build.yml` run (packages created from a workflow start private): github.com/rithesh555?tab=packages → each `qa-portal-*` → Package settings → Danger zone → Change visibility → Public. Public images mean the cluster (Stage 4) can pull them without credentials, and anyone can verify them.
2. **Check that the repo has access:** in each package's settings, under "Manage Actions access", `qa-portal` should have the **Write** role. Pushing from the workflow normally grants this automatically.

## A GitHub App for automation (the release bot)

### The problem

release-please opens the release PR with the workflow's `GITHUB_TOKEN`. GitHub deliberately **never starts workflows for events caused by `GITHUB_TOKEN`**, so that workflows can't trigger each other in a loop. The release PR therefore got no CI at all, and the `main` ruleset (which requires "CI result" and "Conventional PR title") blocked it forever.

### The options, and why an App

| Option                          | Problem                                                                                                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Close and reopen the PR by hand | Works, but is a chore on every release.                                                                                                                                       |
| A personal access token (PAT)   | Long-lived, tied to one person, usually broader than needed. If it leaks it works until someone revokes it; if that person leaves, releases break.                            |
| **A GitHub App (chosen)**       | Its own identity, installed on this repo only, with exactly the permissions we grant. Each run gets a token that **expires within an hour** and is revoked when the job ends. |

### How it's wired

- **The app** `qa-portal-release` (owned by the account, installed on `rithesh555/qa-portal` only) has repository permissions **Contents**, **Pull requests** and **Issues**, read and write, and no webhook.
- **The `release` environment** holds its secrets: the variable `RELEASE_APP_CLIENT_ID` and the secret `RELEASE_APP_PRIVATE_KEY`. Only `main` may use that environment, so a workflow run for a pull request can't read the key, even if the PR edits the workflow.
- **`release.yml`** asks for no `GITHUB_TOKEN` permissions at all. `actions/create-github-app-token` exchanges the key for a short-lived installation token, narrowed again to contents, pull requests and issues, and release-please uses that.
- **One more detail:** the release PR's `CHANGELOG.md` is written in release-please's own style, so `.prettierignore` skips that file. Otherwise every release PR would fail the lint job.

### Setting it up (once)

1. **Create the app:** https://github.com/settings/apps/new
   - **GitHub App name:** something unique, e.g. `qa-portal-release-rithesh555`
   - **Homepage URL:** `https://github.com/rithesh555/qa-portal`
   - **Webhook:** untick **Active**
   - **Repository permissions:** Contents → Read and write; Issues → Read and write; Pull requests → Read and write. Metadata (read) is added automatically. Leave everything else at "No access".
   - **Where can this GitHub App be installed?** Only on this account
2. **On the app's page:** copy the **Client ID**, then **Generate a private key** (a `.pem` file downloads).
3. **Install App** (left menu) → your account → **Only select repositories** → `qa-portal`.
4. **Store the key and the client ID** in the `release` environment, from the repo folder:
   ```bash
   gh variable set RELEASE_APP_CLIENT_ID --env release --body "<client id>"
   gh secret set RELEASE_APP_PRIVATE_KEY --env release < /mnt/c/Users/<you>/Downloads/<app-name>.<date>.private-key.pem
   ```
   Then **delete the `.pem` file**. GitHub keeps only a fingerprint; if the key is ever lost, generate a new one on the app page and delete the old one.

### Rotation

Keys don't expire on their own. To rotate: generate a new private key on the app page, run the `gh secret set` line again with it, check that the next release run is green, then delete the old key on the app page.

## Exercise (about 40 minutes)

You need `cosign` (https://docs.sigstore.dev/cosign/system_config/installation/) and `gh`. Pick any published image, e.g. `ghcr.io/rithesh555/qa-portal-api:main`.

1. **Tag versus digest.**
   - Run `docker buildx imagetools inspect ghcr.io/rithesh555/qa-portal-api:main` and note the digest.
   - Do the same for the `sha-<7>` tag of the newest commit, and for `:1`. Which ones match, and why?
2. **Verify the signature.**
   - Run the `cosign verify` command above, with the digest from step 1.
   - Then change `refs/heads/main` to `refs/heads/feature` in it and run it again. Read the error: the signature is real, but the identity is wrong.
3. **Find it in the public log.** In the `cosign verify` output, find the Rekor log index, and look it up on https://search.sigstore.dev. Anyone in the world can see that this repo signed this digest.
4. **Verify the provenance.** Run the `gh attestation verify` command above (it needs `gh` 2.49 or newer; with an older `gh`, use `cosign verify-attestation --type https://slsa.dev/provenance/v1` plus the cosign identity flags). Run it once with only `--repo`, then with `--signer-workflow` and `--source-ref`: what does the second form rule out? Then run it again with `--format json | jq '.[0].verificationResult.statement.predicate.buildDefinition.externalParameters'`, and find the workflow file and commit.
5. **Read the SBOM.**
   - Download it from the `build.yml` run: `gh run download <run-id> -n sbom-api` writes `sbom.spdx.json`.
   - Or take it from the attestation: `gh attestation download oci://ghcr.io/rithesh555/qa-portal-api@sha256:<digest> --repo rithesh555/qa-portal --predicate-type https://spdx.dev/Document/v2.3` writes a `.jsonl` file of signed Sigstore bundles, one per line. The SBOM is inside, base64-encoded: `jq -r '.dsseEnvelope.payload' <file>.jsonl | base64 -d | jq '.predicate' > sbom.spdx.json`.
   - Answer: how many packages are in the API image? Which version of `fastify` is in it? Does it contain `prisma` (the CLI), or only `@prisma/client`? Stage 1's prune script should explain the answer.
6. **"Are we affected?"** Pick a package from the SBOM and look it up on https://osv.dev. Then run `docker run --rm -v "$PWD/sbom.spdx.json:/sbom.spdx.json:ro" aquasec/trivy:0.76.0 sbom /sbom.spdx.json`. That scans the list itself, without pulling the image.
7. **Accept a finding (on a scratch branch).**
   - Add an entry to `.trivyignore.yaml` without `expired_at`, and watch the CI image job fail.
   - Add the date, and it passes.
   - Close the PR.

**What you learned:** a registry is just storage; the trust comes from signatures and attestations bound to digests, checked against an identity. A release is a new name for an image you already tested, not a new build. And "secure at build time" decays, so you keep scanning what you've published.
