import { config } from "dotenv"
import { defineConfig } from "prisma/config"

// The repo keeps a single .env at the root.
config({ path: "../../.env", quiet: true })

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.ts",
  },
  datasource: {
    // process.env (not env()) so `prisma generate` works without a database
    // URL, e.g. during a fresh `pnpm install`.
    url: process.env.DATABASE_URL,
  },
})
