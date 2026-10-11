import { z } from "zod"

/** Ordered from most to least privileged. */
export const ROLES = ["admin", "qa_lead", "tester", "viewer"] as const

export const roleSchema = z.enum(ROLES)

export type Role = z.infer<typeof roleSchema>

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  qa_lead: "QA Lead",
  tester: "Tester",
  viewer: "Viewer",
}

/** True when `actual` is at least as privileged as `required`. Unknown roles never pass. */
export function hasRole(actual: Role, required: Role): boolean {
  const have = ROLES.indexOf(actual)
  const need = ROLES.indexOf(required)
  return have !== -1 && need !== -1 && have <= need
}

/**
 * The role a user acts with. Better Auth stores several roles as a
 * comma-separated string; the most privileged known one wins. Anything
 * unusable falls back to the least privilege.
 */
export function effectiveRole(stored: string | null | undefined): Role {
  const known = (stored ?? "")
    .split(",")
    .map((part) => roleSchema.safeParse(part.trim()))
    .flatMap((parsed) => (parsed.success ? [parsed.data] : []))
  return ROLES.find((role) => known.includes(role)) ?? "viewer"
}
