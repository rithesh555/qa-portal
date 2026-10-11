import {
  createUserSchema,
  directoryQuerySchema,
  directoryUserSchema,
  pageSchema,
  resetPasswordSchema,
  updateUserSchema,
  userListQuerySchema,
  userSchema,
} from "@qa/shared"
import { fromNodeHeaders } from "better-auth/node"
import type { FastifyRequest } from "fastify"
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"
import { requireAuth, requirePermission } from "../../plugins/auth.ts"
import * as users from "./service.ts"

const idParams = z.object({ id: z.string().min(1).max(64) })

function actingAdmin(request: FastifyRequest): users.ActingAdmin {
  return { id: request.user!.id, headers: fromNodeHeaders(request.headers) }
}

const usersRoutes: FastifyPluginAsyncZod = async (app) => {
  const deps = { prisma: app.prisma, auth: app.auth }
  // Auth runs before body validation, so anonymous/forbidden callers never
  // learn anything from validation errors.
  const adminOnly = { onRequest: requirePermission("users:manage") }
  const tags = ["users"]

  app.get(
    "/users/directory",
    {
      onRequest: requireAuth,
      schema: {
        tags,
        summary: "Search active users (for member pickers)",
        querystring: directoryQuerySchema,
        response: { 200: z.object({ items: z.array(directoryUserSchema) }) },
      },
    },
    async (request) => ({
      items: await users.searchDirectory(deps, request.query.q),
    })
  )

  app.get(
    "/users",
    {
      ...adminOnly,
      schema: {
        tags,
        summary: "List users",
        querystring: userListQuerySchema,
        response: { 200: pageSchema(userSchema) },
      },
    },
    async (request) => users.listUsers(deps, request.query)
  )

  app.post(
    "/users",
    {
      ...adminOnly,
      schema: {
        tags,
        summary: "Create a user",
        body: createUserSchema,
        response: { 201: userSchema },
      },
    },
    async (request, reply) => {
      const user = await users.createUser(
        deps,
        actingAdmin(request),
        request.body
      )
      return reply.code(201).send(user)
    }
  )

  app.get(
    "/users/:id",
    {
      ...adminOnly,
      schema: {
        tags,
        summary: "Get a user",
        params: idParams,
        response: { 200: userSchema },
      },
    },
    async (request) => users.getUser(deps, request.params.id)
  )

  app.patch(
    "/users/:id",
    {
      ...adminOnly,
      schema: {
        tags,
        summary: "Update a user's name, email or role",
        params: idParams,
        body: updateUserSchema,
        response: { 200: userSchema },
      },
    },
    async (request) =>
      users.updateUser(
        deps,
        actingAdmin(request),
        request.params.id,
        request.body
      )
  )

  app.post(
    "/users/:id/reset-password",
    {
      ...adminOnly,
      schema: {
        tags,
        summary: "Set a new password and end the user's sessions",
        params: idParams,
        body: resetPasswordSchema,
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      await users.resetPassword(
        deps,
        actingAdmin(request),
        request.params.id,
        request.body.password
      )
      return reply.code(204).send(null)
    }
  )

  app.post(
    "/users/:id/deactivate",
    {
      ...adminOnly,
      schema: {
        tags,
        summary: "Deactivate a user (blocks sign-in, ends sessions)",
        params: idParams,
        response: { 200: userSchema },
      },
    },
    async (request) =>
      users.deactivateUser(deps, actingAdmin(request), request.params.id)
  )

  app.post(
    "/users/:id/reactivate",
    {
      ...adminOnly,
      schema: {
        tags,
        summary: "Reactivate a deactivated user",
        params: idParams,
        response: { 200: userSchema },
      },
    },
    async (request) =>
      users.reactivateUser(deps, actingAdmin(request), request.params.id)
  )
}

export default usersRoutes
