import {
  type Action,
  commentSchema,
  createDefectSchema,
  defectActivitySchema,
  defectListQuerySchema,
  defectRefSchema,
  defectSchema,
  defectSummarySchema,
  linkResultSchema,
  logDefectSchema,
  pageSchema,
  transitionSchema,
  updateDefectSchema,
} from "@qa/shared"
import type { FastifyRequest } from "fastify"
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"
import { requireAuth } from "../../plugins/auth.ts"
import {
  assertCan,
  assertWritable,
  loadProjectAccess,
} from "../projects/access.ts"
import * as defects from "./service.ts"

const keyParams = z.object({ key: z.string().min(1).max(16) })
const defectParams = keyParams.extend({ ref: z.string().min(1).max(40) })

const defectRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma } = app
  const tags = ["defects"]
  app.addHook("onRequest", requireAuth)

  /** The project from `:key` (404 if hidden), checked for `action`; writes also need it active. */
  const access = async (
    request: FastifyRequest<{ Params: { key: string } }>,
    action: Action,
    { write = false } = {}
  ) => {
    const a = await loadProjectAccess(prisma, request.user!, request.params.key)
    assertCan(a, action)
    if (write) assertWritable(a)
    return a
  }
  const write = { write: true }

  app.get(
    "/projects/:key/defects",
    {
      schema: {
        tags,
        summary: "Defects, active or done, newest first",
        params: keyParams,
        querystring: defectListQuerySchema,
        response: { 200: pageSchema(defectSummarySchema) },
      },
    },
    async (request) =>
      defects.listDefects(
        prisma,
        await access(request, "project:view"),
        request.query
      )
  )

  app.post(
    "/projects/:key/defects",
    {
      schema: {
        tags,
        summary: "Log a defect found outside a run",
        params: keyParams,
        body: createDefectSchema,
        response: { 201: defectSchema },
      },
    },
    async (request, reply) => {
      const a = await access(request, "defects:edit", write)
      return reply
        .code(201)
        .send(await defects.createDefect(prisma, a, request.body))
    }
  )

  app.post(
    "/projects/:key/defects/log",
    {
      schema: {
        tags,
        summary:
          "Log a defect from a failed or blocked result, or link the result to one",
        params: keyParams,
        body: logDefectSchema,
        response: { 201: defectSchema },
      },
    },
    async (request, reply) => {
      const a = await access(request, "defects:edit", write)
      return reply
        .code(201)
        .send(await defects.logDefect(prisma, a, request.body))
    }
  )

  app.get(
    "/projects/:key/defects/known",
    {
      schema: {
        tags,
        summary: "Active defects on a run case's test case, and similar ones",
        params: keyParams,
        querystring: z.object({ runCaseId: z.uuid() }),
        response: { 200: z.object({ items: z.array(defectRefSchema) }) },
      },
    },
    async (request) => ({
      items: await defects.knownDefects(
        prisma,
        await access(request, "project:view"),
        request.query.runCaseId
      ),
    })
  )

  app.get(
    "/projects/:key/defects/:ref",
    {
      schema: {
        tags,
        summary: "A defect by key (PAY-D-14) or number",
        params: defectParams,
        response: { 200: defectSchema },
      },
    },
    async (request) =>
      defects.getDefect(
        prisma,
        await access(request, "project:view"),
        request.params.ref
      )
  )

  app.patch(
    "/projects/:key/defects/:ref",
    {
      schema: {
        tags,
        summary: "Change a defect's fields (priority: QA Lead)",
        params: defectParams,
        body: updateDefectSchema,
        response: { 200: defectSchema },
      },
    },
    async (request) =>
      defects.updateDefect(
        prisma,
        await access(request, "defects:edit", write),
        request.params.ref,
        request.body
      )
  )

  app.post(
    "/projects/:key/defects/:ref/transition",
    {
      schema: {
        tags,
        summary:
          "Move a defect along its workflow (triage and reopening closed ones: QA Lead)",
        params: defectParams,
        body: transitionSchema,
        response: { 200: defectSchema },
      },
    },
    async (request) =>
      defects.transitionDefect(
        prisma,
        await access(request, "defects:edit", write),
        request.params.ref,
        request.body
      )
  )

  app.get(
    "/projects/:key/defects/:ref/activity",
    {
      schema: {
        tags,
        summary: "A defect's comments and changes, newest first",
        params: defectParams,
        response: { 200: z.object({ items: z.array(defectActivitySchema) }) },
      },
    },
    async (request) => ({
      items: await defects.defectActivity(
        prisma,
        await access(request, "project:view"),
        request.params.ref
      ),
    })
  )

  app.post(
    "/projects/:key/defects/:ref/comments",
    {
      schema: {
        tags,
        summary: "Comment on a defect",
        params: defectParams,
        body: commentSchema,
        response: { 201: defectActivitySchema },
      },
    },
    async (request, reply) => {
      const a = await access(request, "defects:edit", write)
      return reply
        .code(201)
        .send(
          await defects.addComment(prisma, a, request.params.ref, request.body)
        )
    }
  )

  app.post(
    "/projects/:key/defects/:ref/links",
    {
      schema: {
        tags,
        summary: "Link a run result to a defect",
        params: defectParams,
        body: linkResultSchema,
        response: { 201: defectSchema },
      },
    },
    async (request, reply) => {
      const a = await access(request, "defects:edit", write)
      return reply
        .code(201)
        .send(
          await defects.addLink(
            prisma,
            a,
            request.params.ref,
            request.body.resultId
          )
        )
    }
  )

  app.delete(
    "/projects/:key/defects/:ref/links/:linkId",
    {
      schema: {
        tags,
        summary: "Unlink a run result from a defect",
        params: defectParams.extend({ linkId: z.uuid() }),
        response: { 200: defectSchema },
      },
    },
    async (request) =>
      defects.removeLink(
        prisma,
        await access(request, "defects:edit", write),
        request.params.ref,
        request.params.linkId
      )
  )
}

export default defectRoutes
