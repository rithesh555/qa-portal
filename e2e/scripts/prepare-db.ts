// Creates the E2E database if it's missing (an existing Docker volume never
// reruns its init scripts) and applies the migrations. Runs before the E2E API
// starts.
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import pg from "pg"
import { e2eEnv } from "../fixtures/env.ts"
import { assertE2EDatabase } from "./guard.ts"

const target = assertE2EDatabase(e2eEnv.databaseURL)
const name = target.pathname.slice(1)

const maintenance = new URL(target)
maintenance.pathname = "/postgres"
const client = new pg.Client({ connectionString: maintenance.toString() })
await client.connect()
try {
  const found = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [name]
  )
  if (found.rowCount === 0) {
    await client.query(`CREATE DATABASE "${name.replaceAll('"', '""')}"`)
    console.log(`Created database ${name}.`)
  }
} finally {
  await client.end()
}

execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
  cwd: fileURLToPath(new URL("../../apps/api", import.meta.url)),
  env: { ...process.env, DATABASE_URL: e2eEnv.databaseURL },
  stdio: ["ignore", "ignore", "inherit"],
})
console.log(`Database ${name} is migrated.`)
