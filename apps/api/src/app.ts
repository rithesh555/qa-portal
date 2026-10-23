import cors from "@fastify/cors"
import helmet from "@fastify/helmet"
import rateLimit from "@fastify/rate-limit"
import swagger from "@fastify/swagger"
import swaggerUi from "@fastify/swagger-ui"
import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
  LogController,
} from "fastify"
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod"
import type { Env } from "./env.ts"
import { httpError } from "./lib/http-error.ts"
import { logSafeUrl } from "./lib/log-safety.ts"
import auth from "./plugins/auth.ts"
import errors from "./plugins/errors.ts"
import prisma from "./plugins/prisma.ts"
import health from "./routes/health.ts"
import caseRoutes from "./modules/cases/routes.ts"
import projectRoutes from "./modules/projects/routes.ts"
import runRoutes from "./modules/runs/routes.ts"
import defectRoutes from "./modules/defects/routes.ts"
import reportRoutes from "./modules/reports/routes.ts"
import usersRoutes from "./modules/users/routes.ts"
import me from "./routes/me.ts"

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

export interface BuildAppOptions {
  env: Env
}

function loggerOptions(env: Env): FastifyServerOptions["logger"] {
  const base = {
    level: env.LOG_LEVEL,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        'res.headers["set-cookie"]',
        "*.password",
        "*.token",
      ],
      censor: "[REDACTED]",
    },
    serializers: {
      // Fastify's request fields, minus the query string (searches carry names).
      req: (req: {
        method: string
        url: string
        host?: string
        ip?: string
      }) => ({
        method: req.method,
        url: logSafeUrl(req.url),
        host: req.host,
        remoteAddress: req.ip,
      }),
    },
  }
  if (env.NODE_ENV !== "development") return base
  return {
    ...base,
    transport: {
      target: "pino-pretty",
      options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" },
    },
  }
}

export async function buildApp({
  env,
}: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: loggerOptions(env),
    trustProxy: env.TRUST_PROXY,
    logController: new LogController({
      // Quiet tests; skip probe noise from health checks.
      disableRequestLogging: (request) =>
        env.NODE_ENV === "test" ||
        request.url === "/api/health" ||
        request.url === "/api/ready",
    }),
  })

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(errors)
  await app.register(helmet)
  await app.register(cors, {
    origin: [env.WEB_ORIGIN],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
  // Writes must come from the portal itself. The session cookie is SameSite=Lax,
  // which still lets a page on a sibling subdomain send body-less POSTs.
  const ownOrigins = new Set([
    new URL(env.WEB_ORIGIN).origin,
    new URL(env.BETTER_AUTH_URL).origin,
  ])
  app.addHook("onRequest", async (request) => {
    // Every unsafe request, whatever its path: the router decodes paths
    // (/%61pi/... is /api/...), so a raw-URL prefix test could be dodged.
    if (SAFE_METHODS.has(request.method)) return
    const origin = request.headers.origin
    if (!origin || !ownOrigins.has(origin))
      throw httpError(403, "Requests must come from the QA Portal")
  })

  // Per IP, and generous: an office of people behind one address shares it.
  // Not per session cookie: an unverified cookie would let a client pick a
  // fresh budget each request. Expensive routes add a per-person limit once
  // the session is verified (lib/rate-limits.ts).
  await app.register(rateLimit, { max: 1000, timeWindow: "1 minute" })
  await app.register(prisma, { databaseUrl: env.DATABASE_URL })
  await app.register(auth, {
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    webOrigin: env.WEB_ORIGIN,
  })

  // API docs only in development: elsewhere nobody gets a list of every route.
  if (env.NODE_ENV === "development") {
    await app.register(swagger, {
      openapi: {
        info: { title: "QA Portal API", version: "0.1.0" },
      },
      transform: jsonSchemaTransform,
    })
    await app.register(swaggerUi, { routePrefix: "/api/docs" })
  }

  await app.register(health, { prefix: "/api" })
  await app.register(me, { prefix: "/api" })
  await app.register(usersRoutes, { prefix: "/api" })
  await app.register(projectRoutes, { prefix: "/api" })
  await app.register(caseRoutes, { prefix: "/api" })
  await app.register(runRoutes, { prefix: "/api" })
  await app.register(defectRoutes, { prefix: "/api" })
  await app.register(reportRoutes, { prefix: "/api" })

  return app
}
