import { z } from "zod"
import { listQuerySchema } from "./list.ts"
import { projectRoleSchema } from "./roles.ts"

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

/** Appears in every ID (PAY-TC-12), so it can't change after creation. */
export const projectKeySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[A-Z][A-Z0-9]{1,5}$/,
    "Use 2–6 capital letters or digits, starting with a letter"
  )

/** A key suggestion from a project name, or "" when none is sensible. */
export function suggestProjectKey(name: string): string {
  const words = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean)
  const fromInitials = words
    .map((word) => word[0])
    .join("")
    .replace(/^[0-9]+/, "")
  const key =
    fromInitials.length >= 2
      ? fromInitials
      : words
          .join("")
          .replace(/^[0-9]+/, "")
          .slice(0, 3)
  const trimmed = key.slice(0, 6)
  return projectKeySchema.safeParse(trimmed).success ? trimmed : ""
}

const projectNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a project name")
  .max(80, "Names are at most 80 characters")

const projectDescriptionSchema = z
  .string()
  .trim()
  .max(500, "Descriptions are at most 500 characters")
  .default("")

export const createProjectSchema = z.object({
  name: projectNameSchema,
  key: projectKeySchema,
  description: projectDescriptionSchema,
  leadUserId: z.string().min(1, "Choose the first QA Lead"),
})

export type CreateProjectInput = z.input<typeof createProjectSchema>

export const updateProjectSchema = z.object({
  name: projectNameSchema,
  description: projectDescriptionSchema,
  /** The version the client last saw; a mismatch means someone else edited. */
  version: z.number().int().min(1),
})

export type UpdateProjectInput = z.input<typeof updateProjectSchema>

export const PROJECT_STATUSES = ["active", "archived"] as const

export const projectListQuerySchema = listQuerySchema([
  "name",
  "key",
  "createdAt",
]).extend({ status: z.enum(PROJECT_STATUSES).default("active") })

export type ProjectListQuery = z.infer<typeof projectListQuerySchema>

const personSchema = z.object({ id: z.string(), name: z.string() })

export const projectSummarySchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  description: z.string(),
  archived: z.boolean(),
  /** The caller's role in this project; null for an admin who isn't a member. */
  myRole: projectRoleSchema.nullable(),
  memberCount: z.number().int(),
  /** Active QA Leads. Empty means the project has no one to manage it. */
  leads: z.array(personSchema),
  currentRelease: z.object({ id: z.string(), name: z.string() }).nullable(),
  createdAt: z.iso.datetime(),
})

export type ProjectSummary = z.infer<typeof projectSummarySchema>

export const projectSchema = projectSummarySchema.extend({
  version: z.number().int(),
  roleCounts: z.object({
    lead: z.number().int(),
    tester: z.number().int(),
    viewer: z.number().int(),
  }),
  updatedAt: z.iso.datetime(),
})

export type Project = z.infer<typeof projectSchema>

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export const memberSchema = z.object({
  userId: z.string(),
  name: z.string(),
  username: z.string(),
  role: projectRoleSchema,
  active: z.boolean(),
  addedAt: z.iso.datetime(),
})

export type Member = z.infer<typeof memberSchema>

export const memberListQuerySchema = listQuerySchema([
  "name",
  "addedAt",
]).extend({ role: projectRoleSchema.optional() })

export type MemberListQuery = z.infer<typeof memberListQuerySchema>

export const addMembersSchema = z.object({
  userIds: z
    .array(z.string().min(1))
    .min(1, "Pick at least one person")
    .max(50, "Add at most 50 people at a time")
    .refine((ids) => new Set(ids).size === ids.length, "Each person once"),
  role: projectRoleSchema,
})

export type AddMembersInput = z.infer<typeof addMembersSchema>

export const updateMemberSchema = z.object({ role: projectRoleSchema })

// ---------------------------------------------------------------------------
// Releases
// ---------------------------------------------------------------------------

export const RELEASE_STATUSES = ["planned", "in_progress", "released"] as const

export const releaseStatusSchema = z.enum(RELEASE_STATUSES)

export type ReleaseStatus = z.infer<typeof releaseStatusSchema>

export const RELEASE_STATUS_LABELS: Record<ReleaseStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  released: "Released",
}

const optionalDate = z
  .union([z.iso.date("Enter a valid date"), z.literal(""), z.null()])
  .optional()
  .transform((value) => value || null)

const releaseFields = {
  name: z
    .string()
    .trim()
    .min(1, "Enter a release name")
    .max(40, "Release names are at most 40 characters"),
  description: z
    .string()
    .trim()
    .max(200, "Descriptions are at most 200 characters")
    .default(""),
  status: releaseStatusSchema,
  startDate: optionalDate,
  targetDate: optionalDate,
}

function datesInOrder(value: {
  startDate: string | null
  targetDate: string | null
}) {
  return (
    !value.startDate || !value.targetDate || value.targetDate >= value.startDate
  )
}

const DATE_ORDER = {
  message: "The target date can't be before the start date",
  path: ["targetDate"],
}

export const releaseInputSchema = z
  .object(releaseFields)
  .refine(datesInOrder, DATE_ORDER)

export type ReleaseInput = z.input<typeof releaseInputSchema>

export const updateReleaseSchema = z
  .object({ ...releaseFields, version: z.number().int().min(1) })
  .refine(datesInOrder, DATE_ORDER)

export type UpdateReleaseInput = z.input<typeof updateReleaseSchema>

export const releaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  status: releaseStatusSchema,
  startDate: z.iso.date().nullable(),
  targetDate: z.iso.date().nullable(),
  version: z.number().int(),
  createdAt: z.iso.datetime(),
})

export type Release = z.infer<typeof releaseSchema>

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

export const activityItemSchema = z.object({
  id: z.string(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  actor: personSchema,
  changes: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.iso.datetime(),
})

export type ActivityItem = z.infer<typeof activityItemSchema>
