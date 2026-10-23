import {
  activityItemSchema,
  archiveCaseSchema,
  bulkCaseActionSchema,
  caseFilterSchema,
  caseInputSchema,
  caseListQuerySchema,
  caseSchema,
  caseSummarySchema,
  exportableCaseSchema,
  importBatchSchema,
  importCheckSchema,
  importRequestSchema,
  importResultSchema,
  pageSchema,
  suiteInputSchema,
  suiteSchema,
  updateCaseSchema,
  updateSuiteSchema,
} from "@qa/shared"
import type { FastifyReply, FastifyRequest } from "fastify"
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"
import { requireAuth } from "../../plugins/auth.ts"
import {
  assertCan,
  assertWritable,
  loadProjectAccess,
} from "../projects/access.ts"
import { bulkCases } from "./bulk.ts"
import * as imports from "./import.ts"
import * as cases from "./service.ts"
import * as suites from "./suites.ts"
import { EXPORT_LIMIT, IMPORT_LIMIT } from "../../lib/rate-limits.ts"

const keyParams = z.object({ key: z.string().min(1).max(16) })
const suiteParams = keyParams.extend({ id: z.uuid() })
const caseParams = keyParams.extend({ ref: z.string().min(1).max(40) })
const importParams = keyParams.extend({
  number: z.coerce.number().int().min(1).max(2_147_483_647),
})

/** Mapped rows of a 5 MB spreadsheet can grow when sent as JSON. */
const IMPORT_BODY_LIMIT = 12 * 1024 * 1024

const caseRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma } = app
  const tags = ["test cases"]
  app.addHook("onRequest", requireAuth)

  /** The project from `:key` (404 if hidden), checked for `action`; writes also need it active. */
  const access = async (
    request: FastifyRequest<{ Params: { key: string } }>,
    action: Parameters<typeof assertCan>[1],
    { write = false } = {}
  ) => {
    const a = await loadProjectAccess(prisma, request.user!, request.params.key)
    assertCan(a, action)
    if (write) assertWritable(a)
    return a
  }

  // --- Suites -----------------------------------------------------------------

  app.get(
    "/projects/:key/suites",
    {
      schema: {
        tags,
        summary: "Active suites of a project, with case counts",
        params: keyParams,
        response: {
          200: z.object({
            items: z.array(suiteSchema),
            noSuiteCount: z.number().int(),
            archivedCount: z.number().int(),
          }),
        },
      },
    },
    async (request) =>
      suites.listSuites(prisma, await access(request, "project:view"))
  )

  app.post(
    "/projects/:key/suites",
    {
      schema: {
        tags,
        summary: "Create a suite (one level of nesting)",
        params: keyParams,
        body: suiteInputSchema,
        response: { 201: suiteSchema },
      },
    },
    async (request, reply) => {
      const a = await access(request, "cases:edit", { write: true })
      return reply
        .code(201)
        .send(await suites.createSuite(prisma, a, request.body))
    }
  )

  app.patch(
    "/projects/:key/suites/:id",
    {
      schema: {
        tags,
        summary: "Rename or move a suite",
        params: suiteParams,
        body: updateSuiteSchema,
        response: { 200: suiteSchema },
      },
    },
    async (request) =>
      suites.updateSuite(
        prisma,
        await access(request, "cases:edit", { write: true }),
        request.params.id,
        request.body
      )
  )

  app.post(
    "/projects/:key/suites/:id/archive",
    {
      schema: {
        tags,
        summary: "Archive a suite with its sub-suites and cases (QA Lead)",
        params: suiteParams,
        response: { 200: z.object({ archivedCases: z.number().int() }) },
      },
    },
    async (request) =>
      suites.archiveSuite(
        prisma,
        await access(request, "cases:archive", { write: true }),
        request.params.id
      )
  )

  // --- Cases ------------------------------------------------------------------

  app.get(
    "/projects/:key/cases",
    {
      schema: {
        tags,
        summary: "Test cases, filtered and paged",
        params: keyParams,
        querystring: caseListQuerySchema,
        response: { 200: pageSchema(caseSummarySchema) },
      },
    },
    async (request) =>
      cases.listCases(
        prisma,
        await access(request, "project:view"),
        request.query
      )
  )

  app.get(
    "/projects/:key/cases/export",
    {
      preValidation: EXPORT_LIMIT,
      schema: {
        tags,
        summary: "Every case matching the filters, for CSV/Excel export",
        params: keyParams,
        querystring: caseFilterSchema,
        response: { 200: z.object({ items: z.array(exportableCaseSchema) }) },
      },
    },
    async (request) => ({
      items: await cases.exportCases(
        prisma,
        await access(request, "project:view"),
        request.query
      ),
    })
  )

  app.post(
    "/projects/:key/cases",
    {
      schema: {
        tags,
        summary: "Create a test case",
        params: keyParams,
        body: caseInputSchema,
        response: { 201: caseSchema },
      },
    },
    async (request, reply) => {
      const a = await access(request, "cases:edit", { write: true })
      return reply
        .code(201)
        .send(await cases.createCase(prisma, a, request.body))
    }
  )

  app.post(
    "/projects/:key/cases/bulk",
    {
      schema: {
        tags,
        summary: "Change or archive many cases at once (archiving: QA Lead)",
        params: keyParams,
        body: bulkCaseActionSchema,
        response: { 200: z.object({ updated: z.number().int() }) },
      },
    },
    async (request) =>
      bulkCases(
        prisma,
        await access(request, "cases:edit", { write: true }),
        request.body
      )
  )

  app.get(
    "/projects/:key/cases/:ref",
    {
      schema: {
        tags,
        summary: "A test case by key (PAY-TC-12) or number",
        params: caseParams,
        response: { 200: caseSchema },
      },
    },
    async (request) =>
      cases.getCase(
        prisma,
        await access(request, "project:view"),
        request.params.ref
      )
  )

  app.patch(
    "/projects/:key/cases/:ref",
    {
      schema: {
        tags,
        summary: "Update a test case (version-checked)",
        params: caseParams,
        body: updateCaseSchema,
        response: { 200: caseSchema },
      },
    },
    async (request) =>
      cases.updateCase(
        prisma,
        await access(request, "cases:edit", { write: true }),
        request.params.ref,
        request.body
      )
  )

  app.post(
    "/projects/:key/cases/:ref/duplicate",
    {
      schema: {
        tags,
        summary: "Copy a test case as a new draft",
        params: caseParams,
        response: { 201: caseSchema },
      },
    },
    async (request, reply) => {
      const a = await access(request, "cases:edit", { write: true })
      return reply
        .code(201)
        .send(await cases.duplicateCase(prisma, a, request.params.ref))
    }
  )

  app.post(
    "/projects/:key/cases/:ref/archive",
    {
      schema: {
        tags,
        summary: "Archive a test case (QA Lead)",
        params: caseParams,
        body: archiveCaseSchema,
        response: { 200: caseSchema },
      },
    },
    async (request) =>
      cases.archiveCase(
        prisma,
        await access(request, "cases:archive", { write: true }),
        request.params.ref,
        request.body.reason
      )
  )

  app.post(
    "/projects/:key/cases/:ref/restore",
    {
      schema: {
        tags,
        summary: "Restore an archived test case (QA Lead)",
        params: caseParams,
        response: { 200: caseSchema },
      },
    },
    async (request) =>
      cases.restoreCase(
        prisma,
        await access(request, "cases:archive", { write: true }),
        request.params.ref
      )
  )

  app.get(
    "/projects/:key/cases/:ref/history",
    {
      schema: {
        tags,
        summary: "Change history of a test case, newest first",
        params: caseParams,
        response: { 200: z.object({ items: z.array(activityItemSchema) }) },
      },
    },
    async (request) => ({
      items: await cases.caseHistory(
        prisma,
        await access(request, "project:view"),
        request.params.ref
      ),
    })
  )

  app.get(
    "/projects/:key/case-labels",
    {
      schema: {
        tags,
        summary: "Labels used by active cases",
        params: keyParams,
        response: { 200: z.object({ items: z.array(z.string()) }) },
      },
    },
    async (request) => ({
      items: await cases.listLabels(
        prisma,
        await access(request, "project:view")
      ),
    })
  )

  // --- Imports ----------------------------------------------------------------

  /**
   * Import bodies can be megabytes: refuse anyone who may not import before
   * the body is read and validated, not after.
   */
  const mayImport = async (
    request: FastifyRequest,
    reply: FastifyReply,
    payload: unknown
  ) => {
    // Counted before the (up to 12 MB) body is read, invalid or not.
    await IMPORT_LIMIT.call(app, request, reply)
    const { key } = request.params as { key: string }
    const a = await loadProjectAccess(prisma, request.user!, String(key))
    assertCan(a, "cases:edit")
    assertWritable(a)
    return payload
  }

  app.get(
    "/projects/:key/imports",
    {
      schema: {
        tags,
        summary: "Recent CSV/Excel imports",
        params: keyParams,
        response: { 200: z.object({ items: z.array(importBatchSchema) }) },
      },
    },
    async (request) => ({
      items: await imports.listImports(
        prisma,
        await access(request, "project:view")
      ),
    })
  )

  app.post(
    "/projects/:key/imports/check",
    {
      bodyLimit: IMPORT_BODY_LIMIT,
      preParsing: mayImport,
      schema: {
        tags,
        summary: "Check mapped spreadsheet rows without importing them",
        params: keyParams,
        body: importRequestSchema,
        response: { 200: importCheckSchema },
      },
    },
    async (request) =>
      imports.checkImport(
        prisma,
        await access(request, "cases:edit", { write: true }),
        request.body
      )
  )

  app.post(
    "/projects/:key/imports",
    {
      bodyLimit: IMPORT_BODY_LIMIT,
      preParsing: mayImport,
      schema: {
        tags,
        summary: "Import mapped spreadsheet rows, all or nothing",
        params: keyParams,
        body: importRequestSchema,
        response: { 201: importResultSchema },
      },
    },
    async (request, reply) => {
      const a = await access(request, "cases:edit", { write: true })
      return reply
        .code(201)
        .send(await imports.runImport(prisma, a, request.body))
    }
  )

  app.post(
    "/projects/:key/imports/:number/archive",
    {
      schema: {
        tags,
        summary: "Archive every case an import added (QA Lead)",
        params: importParams,
        response: { 200: z.object({ archivedCases: z.number().int() }) },
      },
    },
    async (request) =>
      imports.archiveImport(
        prisma,
        await access(request, "cases:archive", { write: true }),
        request.params.number
      )
  )

  app.post(
    "/projects/:key/imports/:number/restore",
    {
      schema: {
        tags,
        summary: "Restore the cases archiving an import archived (QA Lead)",
        params: importParams,
        response: { 200: z.object({ restoredCases: z.number().int() }) },
      },
    },
    async (request) =>
      imports.restoreImport(
        prisma,
        await access(request, "cases:archive", { write: true }),
        request.params.number
      )
  )
}

export default caseRoutes
