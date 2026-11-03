# Stage 3: Artifacts and supply-chain security

**Goal:** everything we ship can be traced back to the commit and workflow that built it, and automation acts under its own narrow identity instead of a person's.

_In progress. This note grows as each part lands._

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
