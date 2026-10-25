// Wipes the E2E database and creates the per-worker accounts before any test.
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { e2eEnv } from "../fixtures/env.ts"
import { assertE2EDatabase } from "./guard.ts"

export default function globalSetup() {
  assertE2EDatabase(e2eEnv.databaseURL)
  execFileSync("node", ["prisma/seed-e2e.ts"], {
    cwd: fileURLToPath(new URL("../../apps/api", import.meta.url)),
    env: {
      ...process.env,
      NODE_ENV: "development",
      DATABASE_URL: e2eEnv.databaseURL,
      WEB_ORIGIN: e2eEnv.baseURL,
      BETTER_AUTH_URL: `http://localhost:${e2eEnv.apiPort}`,
      E2E_SLOTS: String(e2eEnv.workers),
    },
    stdio: "inherit",
  })
}
