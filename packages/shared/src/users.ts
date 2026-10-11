import { z } from "zod"
import { listQuerySchema } from "./list.ts"
import { portalRoleSchema, projectRoleSchema } from "./roles.ts"

/** Matches Better Auth's username plugin: letters, digits, `_` and `.`. */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Usernames are at least 3 characters")
  .max(30, "Usernames are at most 30 characters")
  .regex(/^[a-z0-9_.]+$/, "Use letters, digits, dots and underscores only")

/** Same limits as Better Auth's `minPasswordLength` / default max. */
export const passwordSchema = z
  .string()
  .min(12, "Passwords are at least 12 characters")
  .max(128, "Passwords are at most 128 characters")

const nameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name")
  .max(100, "Names are at most 100 characters")

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address").max(254))

export const createUserSchema = z.object({
  name: nameSchema,
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: portalRoleSchema,
})

export type CreateUserInput = z.infer<typeof createUserSchema>

export const updateUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  role: portalRoleSchema,
  /** The `updatedAt` the client last saw; a mismatch means someone else edited. */
  updatedAt: z.iso.datetime(),
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>

export const resetPasswordSchema = z.object({ password: passwordSchema })

export const USER_STATUSES = ["active", "deactivated", "all"] as const

export const userListQuerySchema = listQuerySchema([
  "name",
  "username",
  "createdAt",
]).extend({
  status: z.enum(USER_STATUSES).default("active"),
})

export type UserListQuery = z.infer<typeof userListQuerySchema>

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  email: z.string(),
  role: portalRoleSchema,
  active: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export type User = z.infer<typeof userSchema>

/** Minimal public profile for pickers (e.g. adding project members). */
export const directoryUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  /** With `project` in the query: their role there, or null if not a member. */
  memberRole: projectRoleSchema.nullable().optional(),
})

export type DirectoryUser = z.infer<typeof directoryUserSchema>

export const directoryQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  /** A project key: leaves admins out and marks each person's role there. */
  project: z.string().min(1).max(16).optional(),
})

/** A signed-in user changing their own password. */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "Choose a password different from your current one",
    path: ["newPassword"],
  })
  .refine((v) => v.confirmPassword === v.newPassword, {
    message: "The passwords don't match",
    path: ["confirmPassword"],
  })

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
