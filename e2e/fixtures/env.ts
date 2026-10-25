import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"

const envFile = fileURLToPath(new URL("../../.env", import.meta.url))
// Never overrides variables that are already set.
if (existsSync(envFile)) process.loadEnvFile(envFile)

function required(name: string, minLength = 1): string {
  const value = process.env[name]
  if (!value || value.length < minLength)
    throw new Error(
      `${name} is missing in .env${minLength > 1 ? ` (at least ${minLength} characters)` : ""} — see .env.example.`
    )
  return value
}

const webPort = Number(process.env.E2E_WEB_PORT ?? 5174)
const apiPort = Number(process.env.E2E_API_PORT ?? 3101)

/** Settings for the isolated E2E stack, read from the root .env. */
export const e2eEnv = {
  webPort,
  apiPort,
  baseURL: `http://localhost:${webPort}`,
  apiURL: `http://127.0.0.1:${apiPort}`,
  workers: Number(process.env.E2E_WORKERS ?? 4),
  get databaseURL() {
    return required("E2E_DATABASE_URL")
  },
  get adminPassword() {
    return required("E2E_ADMIN_PASSWORD", 12)
  },
  get userPassword() {
    return required("E2E_USER_PASSWORD", 12)
  },
}
