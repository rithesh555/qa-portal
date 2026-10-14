import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    globalSetup: ["./test/global-setup.ts"],
    // Integration tests share one test database.
    fileParallelism: false,
    // Per-test setup signs several users in (password hashing); the first one
    // in a file also pays the cold start.
    hookTimeout: 30_000,
  },
})
