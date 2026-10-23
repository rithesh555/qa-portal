import { z } from "zod"
import { portalRoleSchema } from "./roles.ts"

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Usernames are at least 3 characters")
    .max(30, "Usernames are at most 30 characters"),
  password: z.string().min(1, "Enter your password"),
})

export type LoginInput = z.infer<typeof loginSchema>

/** Response of `GET /api/me`. */
export const sessionUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string(),
  email: z.string(),
  role: portalRoleSchema,
  /** An admin chose their password: they must pick their own before anything else. */
  mustChangePassword: z.boolean(),
})

export type SessionUser = z.infer<typeof sessionUserSchema>

/** GET /api/me: the session user plus what the app chrome needs about them. */
export const meSchema = sessionUserSchema.extend({
  /** Active projects they're QA Lead of ("All releases" shows from 2). */
  projectsLed: z.number().int(),
})

export type Me = z.infer<typeof meSchema>
