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
import auth from "./plugins/auth.ts"
import errors from "./plugins/errors.ts"
import prisma from "./plugins/prisma.ts"
import health from "./routes/health.ts"
import caseRoutes from "./modules/cases/routes.ts"
import projectRoutes from "./modules/projects/routes.ts"
import runRoutes from "./modules/runs/routes.ts"
import defectRoutes from "./modules/defects/routes.ts"
import usersRoutes from "./modules/users/routes.ts"
import me from "./routes/me.ts"

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
  await app.register(rateLimit, { max: 300, timeWindow: "1 minute" })
  await app.register(prisma, { databaseUrl: env.DATABASE_URL })
  await app.register(auth, {
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    webOrigin: env.WEB_ORIGIN,
  })

  await app.register(swagger, {
    openapi: {
      info: { title: "QA Portal API", version: "0.1.0" },
    },
    transform: jsonSchemaTransform,
  })
  await app.register(swaggerUi, { routePrefix: "/api/docs" })

  await app.register(health, { prefix: "/api" })
  await app.register(me, { prefix: "/api" })
  await app.register(usersRoutes, { prefix: "/api" })
  await app.register(projectRoutes, { prefix: "/api" })
  await app.register(caseRoutes, { prefix: "/api" })
  await app.register(runRoutes, { prefix: "/api" })
  await app.register(defectRoutes, { prefix: "/api" })

  return app
}
