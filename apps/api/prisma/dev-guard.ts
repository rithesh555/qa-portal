import { type Env, LOCAL_HOSTS } from "../src/env.ts"

/**
 * Seeds that make shared-password demo accounts or bulk fake data must never
 * reach a real database, even if NODE_ENV is set wrong somewhere: they run
 * only in development and only against a database on this machine.
 */
export function assertLocalDevDatabase(env: Env, script: string) {
  if (env.NODE_ENV !== "development") {
    console.error(
      `${script} only runs with NODE_ENV=development (got ${env.NODE_ENV}).`
    )
    process.exit(1)
  }
  const host = new URL(env.DATABASE_URL).hostname
  if (!LOCAL_HOSTS.has(host)) {
    console.error(
      `${script} only runs against a database on this machine (got host ${host}).`
    )
    process.exit(1)
  }
}
