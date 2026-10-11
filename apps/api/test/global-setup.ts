import { execFileSync } from "node:child_process"
import { testEnv } from "./test-env.ts"

/** Bring the test database schema up to date once per run. */
export default function setup() {
  const env = testEnv()
  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    cwd: new URL("..", import.meta.url),
    env: { ...process.env, DATABASE_URL: env.DATABASE_URL },
    stdio: "pipe",
  })
}
