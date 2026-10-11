import { z } from "zod"

/**
 * Portal-wide role, stored in Better Auth's `role` column. Admins see and
 * manage everything; everyone else is a `user` whose rights come from their
 * project memberships.
 */
export const PORTAL_ROLES = ["admin", "user"] as const

export const portalRoleSchema = z.enum(PORTAL_ROLES)

export type PortalRole = z.infer<typeof portalRoleSchema>

export const PORTAL_ROLE_LABELS: Record<PortalRole, string> = {
  admin: "Admin",
  user: "Member",
}

/** Role inside one project. Ordered from most to least privileged. */
export const PROJECT_ROLES = ["lead", "tester", "viewer"] as const

export const projectRoleSchema = z.enum(PROJECT_ROLES)

export type ProjectRole = z.infer<typeof projectRoleSchema>

export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  lead: "QA Lead",
  tester: "Tester",
  viewer: "Viewer",
}

/**
 * The portal role a user acts with. Better Auth stores several roles as a
 * comma-separated string; only an exact `admin` entry grants admin, anything
 * else is a plain user.
 */
export function effectivePortalRole(
  stored: string | null | undefined
): PortalRole {
  const parts = (stored ?? "").split(",").map((part) => part.trim())
  return parts.includes("admin") ? "admin" : "user"
}
