import {
  activityItemSchema,
  addMembersSchema,
  createProjectSchema,
  memberListQuerySchema,
  memberSchema,
  pageSchema,
  projectListQuerySchema,
  projectSchema,
  projectSummarySchema,
  releaseInputSchema,
  releaseSchema,
  updateMemberSchema,
  updateProjectSchema,
  updateReleaseSchema,
} from "@qa/shared"
import type { FastifyRequest } from "fastify"
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"
import { requireAuth, requirePermission } from "../../plugins/auth.ts"
import { assertCan, assertWritable, loadProjectAccess } from "./access.ts"
import * as members from "./members.ts"
import * as releases from "./releases.ts"
import * as projects from "./service.ts"

const keyParams = z.object({ key: z.string().min(1).max(16) })
const memberParams = keyParams.extend({ userId: z.string().min(1).max(64) })
const releaseParams = keyParams.extend({ id: z.uuid() })

const projectRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma } = app
  const tags = ["projects"]
  // Every route needs a session, checked before the body is validated.
  app.addHook("onRequest", requireAuth)

  /** The project from `:key`, or 404 if it's not visible to the caller. */
  const access = (request: FastifyRequest<{ Params: { key: string } }>) =>
    loadProjectAccess(prisma, request.user!, request.params.key)

  // --- Projects -------------------------------------------------------------

  app.get(
    "/projects",
    {
      schema: {
        tags,
        summary: "Projects you can see (admins: all)",
        querystring: projectListQuerySchema,
        response: { 200: pageSchema(projectSummarySchema) },
      },
    },
    async (request) =>
      projects.listProjects(prisma, request.user!, request.query)
  )

  app.post(
    "/projects",
    {
      onRequest: requirePermission("projects:manage"),
      schema: {
        tags,
        summary: "Create a project with its first QA Lead (admin)",
        body: createProjectSchema,
        response: { 201: projectSchema },
      },
    },
    async (request, reply) => {
      const project = await projects.createProject(
        prisma,
        request.user!,
        request.body
      )
      return reply.code(201).send(project)
    }
  )

  app.get(
    "/projects/:key",
    {
      schema: {
        tags,
        summary: "A project",
        params: keyParams,
        response: { 200: projectSchema },
      },
    },
    async (request) => {
      const a = await access(request)
      assertCan(a, "project:view")
      return projects.getProject(prisma, a)
    }
  )

  app.patch(
    "/projects/:key",
    {
      schema: {
        tags,
        summary: "Rename or re-describe a project (admin)",
        params: keyParams,
        body: updateProjectSchema,
        response: { 200: projectSchema },
      },
    },
    async (request) => {
      const a = await access(request)
      assertCan(a, "projects:manage")
      assertWritable(a)
      return projects.updateProject(prisma, a, request.body)
    }
  )

  for (const [path, archived] of [
    ["archive", true],
    ["unarchive", false],
  ] as const) {
    app.post(
      `/projects/:key/${path}`,
      {
        schema: {
          tags,
          summary: archived
            ? "Archive a project (read-only from then on; admin)"
            : "Restore an archived project (admin)",
          params: keyParams,
          response: { 200: projectSchema },
        },
      },
      async (request) => {
        const a = await access(request)
        assertCan(a, "projects:manage")
        return projects.setArchived(prisma, a, archived)
      }
    )
  }

  app.get(
    "/projects/:key/activity",
    {
      schema: {
        tags,
        summary: "Recent activity in a project",
        params: keyParams,
        querystring: z.object({
          limit: z.coerce.number().int().min(1).max(50).default(20),
        }),
        response: { 200: z.object({ items: z.array(activityItemSchema) }) },
      },
    },
    async (request) => {
      const a = await access(request)
      assertCan(a, "project:view")
      return {
        items: await projects.listActivity(prisma, a, request.query.limit),
      }
    }
  )

  // --- Members --------------------------------------------------------------

  app.get(
    "/projects/:key/members",
    {
      schema: {
        tags,
        summary: "Members of a project",
        params: keyParams,
        querystring: memberListQuerySchema,
        response: { 200: pageSchema(memberSchema) },
      },
    },
    async (request) => {
      const a = await access(request)
      assertCan(a, "project:view")
      return members.listMembers(prisma, a, request.query)
    }
  )

  app.post(
    "/projects/:key/members",
    {
      schema: {
        tags,
        summary: "Add people to a project with one role",
        params: keyParams,
        body: addMembersSchema,
        response: {
          200: z.object({ added: z.number(), alreadyMembers: z.number() }),
        },
      },
    },
    async (request) => {
      const a = await access(request)
      assertCan(a, "members:manage")
      assertWritable(a)
      return members.addMembers(prisma, a, request.body)
    }
  )

  app.patch(
    "/projects/:key/members/:userId",
    {
      schema: {
        tags,
        summary: "Change a member's project role",
        params: memberParams,
        body: updateMemberSchema,
        response: { 200: memberSchema },
      },
    },
    async (request) => {
      const a = await access(request)
      assertCan(a, "members:manage")
      assertWritable(a)
      return members.changeRole(
        prisma,
        a,
        request.params.userId,
        request.body.role
      )
    }
  )

  app.delete(
    "/projects/:key/members/:userId",
    {
      schema: {
        tags,
        summary: "Remove someone from a project",
        params: memberParams,
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      const a = await access(request)
      assertCan(a, "members:manage")
      assertWritable(a)
      await members.removeMember(prisma, a, request.params.userId)
      return reply.code(204).send(null)
    }
  )

  // --- Releases -------------------------------------------------------------

  app.get(
    "/projects/:key/releases",
    {
      schema: {
        tags,
        summary: "Releases of a project",
        params: keyParams,
        response: { 200: z.object({ items: z.array(releaseSchema) }) },
      },
    },
    async (request) => {
      const a = await access(request)
      assertCan(a, "project:view")
      return { items: await releases.listReleases(prisma, a) }
    }
  )

  app.post(
    "/projects/:key/releases",
    {
      schema: {
        tags,
        summary: "Create a release",
        params: keyParams,
        body: releaseInputSchema,
        response: { 201: releaseSchema },
      },
    },
    async (request, reply) => {
      const a = await access(request)
      assertCan(a, "releases:manage")
      assertWritable(a)
      const release = await releases.createRelease(prisma, a, request.body)
      return reply.code(201).send(release)
    }
  )

  app.patch(
    "/projects/:key/releases/:id",
    {
      schema: {
        tags,
        summary: "Update a release",
        params: releaseParams,
        body: updateReleaseSchema,
        response: { 200: releaseSchema },
      },
    },
    async (request) => {
      const a = await access(request)
      assertCan(a, "releases:manage")
      assertWritable(a)
      return releases.updateRelease(prisma, a, request.params.id, request.body)
    }
  )
}

export default projectRoutes
