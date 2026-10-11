import { config } from "dotenv"
import { loadEnv, type Env } from "../src/env.ts"

config({ path: new URL("../../../.env", import.meta.url), quiet: true })

/** Env for tests: the app's settings, pointed at the separate test database. */
export function testEnv(overrides: Partial<Env> = {}): Env {
  const testUrl = process.env.TEST_DATABASE_URL
  if (!testUrl) throw new Error("TEST_DATABASE_URL is not set")
  if (testUrl === process.env.DATABASE_URL || !/test/i.test(testUrl)) {
    throw new Error(
      "TEST_DATABASE_URL must point at a separate database whose name contains 'test'"
    )
  }
  return {
    ...loadEnv({
      ...process.env,
      NODE_ENV: "test",
      LOG_LEVEL: "silent",
      DATABASE_URL: testUrl,
    }),
    ...overrides,
  }
}
