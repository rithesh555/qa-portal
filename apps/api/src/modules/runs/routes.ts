import {
  type Action,
  addRunCasesSchema,
  assignSchema,
  bulkResultSchema,
  copyRunSchema,
  createRunSchema,
  pageSchema,
  recordResultSchema,
  refreshRunCaseSchema,
  removeRunCasesSchema,
  runCaseDetailSchema,
  runCaseSchema,
  runListQuerySchema,
  runPreviewResultSchema,
  runPreviewSchema,
  runSchema,
  runSummarySchema,
  updateRunSchema,
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
import * as runCases from "./cases.ts"
import { previewSelection } from "./select.ts"
import * as runs from "./service.ts"

const keyParams = z.object({ key: z.string().min(1).max(16) })
const runParams = keyParams.extend({ ref: z.string().min(1).max(40) })
const runCaseParams = runParams.extend({ id: z.uuid() })

const runRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma } = app
  const tags = ["test runs"]
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
    "/projects/:key/runs",
    {
      schema: {
        tags,
        summary: "Test runs, open or closed, newest first",
        params: keyParams,
        querystring: runListQuerySchema,
        response: { 200: pageSchema(runSummarySchema) },
      },
    },
    async (request) =>
      runs.listRuns(
        prisma,
        await access(request, "project:view"),
        request.query
      )
  )

  app.post(
    "/projects/:key/runs",
    {
      schema: {
        tags,
        summary: "Start a run from a choice of test cases",
        params: keyParams,
        body: createRunSchema,
        response: { 201: runSchema },
      },
    },
    async (request, reply) => {
      const a = await access(request, "runs:execute", write)
      return reply.code(201).send(await runs.createRun(prisma, a, request.body))
    }
  )

  app.post(
    "/projects/:key/runs/preview",
    {
      schema: {
        tags,
        summary: "How many cases a selection would take, per suite",
        params: keyParams,
        body: runPreviewSchema,
        response: { 200: runPreviewResultSchema },
      },
    },
    async (request) =>
      previewSelection(
        prisma,
        await access(request, "runs:execute", write),
        request.body.selection
      )
  )

  app.get(
    "/projects/:key/runs/:ref",
    {
      schema: {
        tags,
        summary: "A test run by key (PAY-R-12) or number",
        params: runParams,
        response: { 200: runSchema },
      },
    },
    async (request) =>
      runs.getRun(
        prisma,
        await access(request, "project:view"),
        request.params.ref
      )
  )

  app.patch(
    "/projects/:key/runs/:ref",
    {
      schema: {
        tags,
        summary: "Edit a run's details (its creator or a QA Lead)",
        params: runParams,
        body: updateRunSchema,
        response: { 200: runSchema },
      },
    },
    async (request) =>
      runs.updateRun(
        prisma,
        await access(request, "runs:execute", write),
        request.params.ref,
        request.body
      )
  )

  for (const [path, action, summary] of [
    [
      "close",
      "runs:close",
      "Close a run (QA Lead any time; its creator or assignees once nothing is untested)",
    ],
    ["reopen", "runs:reopen", "Reopen a closed run (QA Lead)"],
  ] as const) {
    app.post(
      `/projects/:key/runs/:ref/${path}`,
      {
        schema: {
          tags,
          summary,
          params: runParams,
          response: { 200: runSchema },
        },
      },
      async (request) => {
        const a = await access(request, action, write)
        return path === "close"
          ? runs.closeRun(prisma, a, request.params.ref)
          : runs.reopenRun(prisma, a, request.params.ref)
      }
    )
  }

  app.post(
    "/projects/:key/runs/:ref/copy",
    {
      schema: {
        tags,
        summary:
          "Duplicate a run, or start one from its failed and blocked cases",
        params: runParams,
        body: copyRunSchema,
        response: { 201: runSchema },
      },
    },
    async (request, reply) => {
      const a = await access(request, "runs:execute", write)
      return reply
        .code(201)
        .send(await runs.copyRun(prisma, a, request.params.ref, request.body))
    }
  )

  // --- Cases in a run ----------------------------------------------------------

  app.get(
    "/projects/:key/runs/:ref/cases",
    {
      schema: {
        tags,
        summary: "Every case in a run, in run order",
        params: runParams,
        response: { 200: z.object({ items: z.array(runCaseSchema) }) },
      },
    },
    async (request) => ({
      items: await runCases.listRunCases(
        prisma,
        await access(request, "project:view"),
        request.params.ref
      ),
    })
  )

  app.post(
    "/projects/:key/runs/:ref/cases",
    {
      schema: {
        tags,
        summary: "Add cases to an open run (its creator or a QA Lead)",
        params: runParams,
        body: addRunCasesSchema,
        response: { 200: z.object({ added: z.number().int() }) },
      },
    },
    async (request) =>
      runCases.addCases(
        prisma,
        await access(request, "runs:execute", write),
        request.params.ref,
        request.body
      )
  )

  app.post(
    "/projects/:key/runs/:ref/cases/remove",
    {
      schema: {
        tags,
        summary: "Remove cases that have no results (its creator or a QA Lead)",
        params: runParams,
        body: removeRunCasesSchema,
        response: {
          200: z.object({ removed: z.number().int(), kept: z.number().int() }),
        },
      },
    },
    async (request) =>
      runCases.removeCases(
        prisma,
        await access(request, "runs:execute", write),
        request.params.ref,
        request.body.runCaseIds
      )
  )

  app.get(
    "/projects/:key/runs/:ref/cases/:id",
    {
      schema: {
        tags,
        summary: "A case in a run, with its copy and every result",
        params: runCaseParams,
        response: { 200: runCaseDetailSchema },
      },
    },
    async (request) =>
      runCases.runCaseDetail(
        prisma,
        await access(request, "project:view"),
        request.params.ref,
        request.params.id
      )
  )

  app.post(
    "/projects/:key/runs/:ref/cases/:id/results",
    {
      schema: {
        tags,
        summary: "Record a result (write-once; a newer result supersedes it)",
        params: runCaseParams,
        body: recordResultSchema,
        response: { 200: runCaseDetailSchema },
      },
    },
    async (request) =>
      runCases.recordResult(
        prisma,
        await access(request, "runs:execute", write),
        request.params.ref,
        request.params.id,
        request.body
      )
  )

  app.post(
    "/projects/:key/runs/:ref/cases/:id/refresh",
    {
      schema: {
        tags,
        summary: "Use the case's latest version in this run",
        params: runCaseParams,
        body: refreshRunCaseSchema,
        response: { 200: runCaseDetailSchema },
      },
    },
    async (request) =>
      runCases.refreshCase(
        prisma,
        await access(request, "runs:execute", write),
        request.params.ref,
        request.params.id,
        request.body.expectedVersion
      )
  )

  app.post(
    "/projects/:key/runs/:ref/results/bulk",
    {
      schema: {
        tags,
        summary: "Record one result, with a shared note, on many cases",
        params: runParams,
        body: bulkResultSchema,
        response: { 200: z.object({ recorded: z.number().int() }) },
      },
    },
    async (request) =>
      runCases.bulkResults(
        prisma,
        await access(request, "runs:execute", write),
        request.params.ref,
        request.body
      )
  )

  app.post(
    "/projects/:key/runs/:ref/assign",
    {
      schema: {
        tags,
        summary: "Assign cases to someone (its creator or a QA Lead)",
        params: runParams,
        body: assignSchema,
        response: { 200: z.object({ assigned: z.number().int() }) },
      },
    },
    async (request) =>
      runCases.assignCases(
        prisma,
        await access(request, "runs:execute", write),
        request.params.ref,
        request.body
      )
  )
}

export default runRoutes
