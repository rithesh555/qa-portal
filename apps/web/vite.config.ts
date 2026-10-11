import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

const repoRoot = resolve(import.meta.dirname, "../..")

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Only API_* from the root .env: where the dev proxy should send /api.
  const env = loadEnv(mode, repoRoot, "API_")
  const apiTarget = `http://${env.API_HOST ?? "127.0.0.1"}:${env.API_PORT ?? "3000"}`

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": resolve(import.meta.dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        // Same-origin API in dev: session cookies stay first-party.
        "/api": { target: apiTarget, xfwd: true },
      },
    },
  }
})
