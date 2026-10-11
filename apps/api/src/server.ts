import { buildApp } from "./app.ts"
import { loadEnv } from "./env.ts"

const env = loadEnv()
const app = await buildApp({ env })

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    app.log.info({ signal }, "shutting down")
    app
      .close()
      .then(() => process.exit(0))
      .catch((err: unknown) => {
        app.log.error({ err }, "error during shutdown")
        process.exit(1)
      })
  })
}

try {
  await app.listen({ host: env.API_HOST, port: env.API_PORT })
} catch (err) {
  app.log.error({ err }, "failed to start")
  process.exit(1)
}
