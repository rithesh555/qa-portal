import { defineConfig, devices } from "@playwright/test"
import { e2eEnv } from "./fixtures/env.ts"

const { baseURL, apiPort, webPort, workers } = e2eEnv

/**
 * The E2E suite runs its own API and web app against its own database, so it
 * never touches the dev portal on 5173/3000. Every run wipes and reseeds that
 * database (scripts/global-setup.ts).
 */
export default defineConfig({
  testDir: "tests",
  outputDir: "results/artifacts",
  globalSetup: "./scripts/global-setup.ts",
  fullyParallel: true,
  workers,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: "results/html", open: "never" }],
    ["json", { outputFile: "results/results.json" }],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "auth", testMatch: /setup\/auth\.setup\.ts/ },
    {
      name: "setup",
      testMatch: /setup\/baseline\.setup\.ts/,
      dependencies: ["auth"],
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      grep: /@mobile/,
      dependencies: ["setup"],
    },
    {
      name: "dark",
      use: { ...devices["Desktop Chrome"], colorScheme: "dark" },
      grep: /@dark|@a11y/,
      dependencies: ["setup"],
    },
  ],
  webServer: [
    {
      name: "api",
      command: "node scripts/prepare-db.ts && node ../apps/api/src/server.ts",
      url: `http://127.0.0.1:${apiPort}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: "ignore",
      gracefulShutdown: { signal: "SIGTERM", timeout: 2000 },
      env: {
        ...stringEnv(),
        NODE_ENV: "development",
        DATABASE_URL: e2eEnv.databaseURL,
        API_HOST: "127.0.0.1",
        API_PORT: String(apiPort),
        WEB_ORIGIN: baseURL,
        BETTER_AUTH_URL: `http://localhost:${apiPort}`,
        // Each worker sends its own X-Forwarded-For, so per-IP limits don't
        // pool every browser behind the local proxy.
        TRUST_PROXY: "loopback",
        LOG_LEVEL: "warn",
      },
    },
    {
      name: "web",
      cwd: "../apps/web",
      command:
        process.env.E2E_WEB_MODE === "dev"
          ? `pnpm exec vite --port ${webPort} --strictPort`
          : `pnpm exec vite build --outDir ../../e2e/.web-dist --emptyOutDir && pnpm exec vite preview --outDir ../../e2e/.web-dist --port ${webPort} --strictPort`,
      url: baseURL,
      reuseExistingServer: false,
      timeout: 180_000,
      stdout: "ignore",
      env: { ...stringEnv(), API_HOST: "127.0.0.1", API_PORT: String(apiPort) },
    },
  ],
})

/** process.env without undefined entries, as webServer.env expects. */
function stringEnv(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      (e): e is [string, string] => e[1] !== undefined
    )
  )
}
