import {
  homeSchema,
  releaseSummarySchema,
  reportExportQuerySchema,
  reportExportSchema,
  reportQuerySchema,
  reportSchema,
} from "@qa/shared"
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"
import { requireAuth } from "../../plugins/auth.ts"
import { assertCan, loadProjectAccess } from "../projects/access.ts"
import { exportReport } from "./export.ts"
import { getHome, releasesOverview } from "./home.ts"
import { getReport } from "./service.ts"

const keyParams = z.object({ key: z.string().min(1).max(16) })

const reportRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma } = app
  const tags = ["reports"]
  app.addHook("onRequest", requireAuth)

  app.get(
    "/home",
    {
      schema: {
        tags,
        summary: "My work across my projects, and how their releases are doing",
        response: { 200: homeSchema },
      },
    },
    async (request) => getHome(prisma, request.user!)
  )

  app.get(
    "/releases/overview",
    {
      schema: {
        tags,
        summary:
          "Active releases side by side: all for admins, those of projects I lead otherwise",
        response: { 200: z.object({ items: z.array(releaseSummarySchema) }) },
      },
    },
    async (request) => ({
      items: await releasesOverview(prisma, request.user!),
    })
  )

  app.get(
    "/projects/:key/reports",
    {
      schema: {
        tags,
        summary:
          "A release's report: its frozen snapshot once released, unless live=true",
        params: keyParams,
        querystring: reportQuerySchema,
        response: { 200: reportSchema },
      },
    },
    async (request) => {
      const a = await loadProjectAccess(
        prisma,
        request.user!,
        request.params.key
      )
      assertCan(a, "project:view")
      return getReport(prisma, a, request.query)
    }
  )

  app.get(
    "/projects/:key/reports/export",
    {
      schema: {
        tags,
        summary: "The rows behind a release's report, for CSV",
        params: keyParams,
        querystring: reportExportQuerySchema,
        response: { 200: reportExportSchema },
      },
    },
    async (request) => {
      const a = await loadProjectAccess(
        prisma,
        request.user!,
        request.params.key
      )
      assertCan(a, "project:view")
      return exportReport(prisma, a, request.query)
    }
  )
}

export default reportRoutes
