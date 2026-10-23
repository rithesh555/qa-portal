import { z } from "zod"

const envSchema = z.object({
  // Required: a forgotten NODE_ENV must not quietly mean "development"
  // (API docs, demo seeding, dev logging).
  NODE_ENV: z.enum(["development", "test", "production"]),
  DATABASE_URL: z.url(),
  API_HOST: z.string().default("127.0.0.1"),
  API_PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  WEB_ORIGIN: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  /** Fastify `trustProxy`: addresses whose X-Forwarded-For we trust. */
  TRUST_PROXY: z.string().default("127.0.0.1"),
})

/** Hostnames (as URL.hostname gives them) that mean "this machine". */
export const LOCAL_HOSTS: ReadonlySet<string> = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
])

/** In production the session cookie must be Secure, so the origins must be https (bar this machine). */
const productionHttps = envSchema.superRefine((env, ctx) => {
  if (env.NODE_ENV !== "production") return
  for (const key of ["WEB_ORIGIN", "BETTER_AUTH_URL"] as const) {
    const url = new URL(env[key])
    if (url.protocol !== "https:" && !LOCAL_HOSTS.has(url.hostname))
      ctx.addIssue({
        code: "custom",
        path: [key],
        message: "must use https in production",
      })
  }
})

export type Env = z.infer<typeof envSchema>

export function loadEnv(
  source: Record<string, string | undefined> = process.env
): Env {
  const parsed = productionHttps.safeParse(source)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n")
    throw new Error(`Invalid environment variables:\n${issues}`)
  }
  return parsed.data
}
