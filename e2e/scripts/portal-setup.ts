// One-off: on the dev portal, creates the account that records E2E runs and
// the project that holds the E2E cases. Safe to re-run. Uses the seed admin
// from .env; prints no passwords.
import { randomBytes } from "node:crypto"
import { portalSettings, PortalError, signInToPortal } from "./portal.ts"

const s = portalSettings()
const admin = await signInToPortal(
  s.url,
  s.need("SEED_ADMIN_USERNAME"),
  s.need("SEED_ADMIN_PASSWORD")
)

const found = await admin.call<{ items: { id: string; username: string }[] }>(
  "GET",
  `/users?q=${encodeURIComponent(s.username)}&status=all`
)
let reporter = found.items.find((u) => u.username === s.username)
if (!reporter) {
  const temporary = randomBytes(18).toString("base64url")
  reporter = await admin.call<{ id: string; username: string }>(
    "POST",
    "/users",
    {
      name: "E2E Reporter",
      username: s.username,
      email: `${s.username}@qa-portal.local`,
      password: temporary,
      role: "user",
    }
  )
  // Admin-set passwords must be replaced at first sign-in: do it now.
  const self = await signInToPortal(s.url, s.username, temporary)
  await self.call("POST", "/auth/change-password", {
    currentPassword: temporary,
    newPassword: s.password(),
    revokeOtherSessions: true,
  })
  console.log(
    `Created ${s.username} with the password from E2E_PORTAL_PASSWORD.`
  )
} else console.log(`${s.username} already exists.`)

try {
  await admin.call("GET", `/projects/${s.projectKey}`)
  console.log(`Project ${s.projectKey} already exists.`)
} catch (e) {
  if (!(e instanceof PortalError) || e.status !== 404) throw e
  await admin.call("POST", "/projects", {
    key: s.projectKey,
    name: "QA Portal E2E",
    description:
      "Playwright end-to-end cases for the QA Portal; each run is recorded by pnpm e2e:publish.",
    leadUserId: reporter.id,
  })
  console.log(
    `Created project ${s.projectKey} with ${s.username} as its QA Lead.`
  )
}

// Sanity check: the reporter can sign in with the stored password.
await signInToPortal(s.url, s.username, s.password())
console.log("Reporter sign-in OK.")
