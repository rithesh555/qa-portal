import { existsSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { parseEnv } from "node:util"
import "../fixtures/env.ts"

// The dev and API-test databases as .env names them (the E2E API process
// itself runs with DATABASE_URL pointed at the E2E database).
const envFile = fileURLToPath(new URL("../../.env", import.meta.url))
const fromFile = existsSync(envFile)
  ? parseEnv(readFileSync(envFile, "utf8"))
  : {}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"])

/**
 * The E2E run wipes its database. Refuse anything that isn't clearly the
 * local E2E database: local host, "e2e" in the name, and not the dev or
 * API-test database.
 */
export function assertE2EDatabase(url: string): URL {
  const parsed = new URL(url)
  const name = parsed.pathname.replace(/^\//, "")
  const problems: string[] = []
  if (!LOCAL_HOSTS.has(parsed.hostname))
    problems.push(`host ${parsed.hostname} is not this machine`)
  if (!/e2e/i.test(name))
    problems.push(`database "${name}" has no "e2e" in its name`)
  for (const other of ["DATABASE_URL", "TEST_DATABASE_URL"]) {
    const value = fromFile[other]
    if (value && sameDatabase(value, parsed)) problems.push(`it is ${other}`)
  }
  if (problems.length)
    throw new Error(`Refusing to use E2E_DATABASE_URL: ${problems.join("; ")}.`)
  return parsed
}

function sameDatabase(a: string, b: URL): boolean {
  const x = new URL(a)
  return (
    x.hostname === b.hostname &&
    (x.port || "5432") === (b.port || "5432") &&
    x.pathname === b.pathname
  )
}
