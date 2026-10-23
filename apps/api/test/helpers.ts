import type { FastifyInstance } from "fastify"
import { buildApp } from "../src/app.ts"
import type { Env } from "../src/env.ts"
import type { PrismaClient } from "../src/lib/prisma.ts"
import type { PortalRole } from "@qa/shared"
import { testEnv } from "./test-env.ts"

export async function buildTestApp(
  options: {
    env?: Partial<Env>
    /** Register extra test routes before the app is sealed. */
    beforeReady?: (app: FastifyInstance) => void | Promise<void>
  } = {}
): Promise<FastifyInstance> {
  const app = await buildApp({ env: testEnv(options.env) })
  await options.beforeReady?.(app)
  await app.ready()
  return app
}

export const PASSWORD = "correct-horse-battery-staple"

let ipCounter = 0
/** A fresh client IP, so Better Auth's per-IP sign-in limit never leaks between tests. */
export function nextIp(): string {
  ipCounter += 1
  return `10.0.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`
}

export async function createUser(
  app: FastifyInstance,
  user: { username: string; role: PortalRole; password?: string }
): Promise<void> {
  await app.auth.api.createUser({
    body: {
      email: `${user.username}@test.local`,
      name: user.username,
      password: user.password ?? PASSWORD,
      role: user.role,
      data: { username: user.username },
    },
  })
  await choosePassword(app, user.username)
}

/** As if the user had picked their own password (new accounts must, first). */
export async function choosePassword(app: FastifyInstance, username: string) {
  await app.prisma.user.update({
    where: { username },
    data: { mustChangePassword: false },
  })
}

/** Signs in and returns the Cookie header value for later requests. */
export async function signIn(
  app: FastifyInstance,
  username: string,
  password = PASSWORD
): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/sign-in/username",
    remoteAddress: nextIp(),
    headers: { origin: "http://localhost:5173" },
    payload: { username, password },
  })
  if (res.statusCode !== 200) {
    throw new Error(`sign-in failed: ${res.statusCode} ${res.body}`)
  }
  return res.cookies.map((c) => `${c.name}=${c.value}`).join("; ")
}

/** Empties every table except Prisma's migration history. */
export async function resetDb(prisma: PrismaClient): Promise<void> {
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`
  if (rows.length === 0) return
  const tables = rows.map((r) => `"public"."${r.tablename}"`).join(", ")
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE`)
}
