import type { PortalRole, ProjectRole } from "./roles.ts"

/**
 * Which project roles may perform each action. Admins may do everything;
 * an empty list means admin only. The web hides what this denies and the API
 * enforces it.
 */
const MATRIX = {
  "users:manage": [],
  "projects:manage": [],
  "project:view": ["lead", "tester", "viewer"],
  "members:manage": ["lead"],
  "releases:manage": ["lead"],
  "cases:edit": ["lead", "tester"],
  "cases:archive": ["lead"],
  "runs:execute": ["lead", "tester"],
  // A tester may only close a run they own once no case is untested; that
  // needs the run itself, so the test-runs service checks it on top of this.
  "runs:close": ["lead", "tester"],
  // Reopening changes results already used in reports.
  "runs:reopen": ["lead"],
  "defects:edit": ["lead", "tester"],
  // Confirm or reject new defects, set priority, reopen closed or rejected ones.
  "defects:triage": ["lead"],
} as const satisfies Record<string, readonly ProjectRole[]>

export type Action = keyof typeof MATRIX

export const ACTIONS = Object.keys(MATRIX) as Action[]

export interface Actor {
  portalRole: PortalRole
  /** The actor's role in the project in question; null when not a member. */
  projectRole?: ProjectRole | null
}

/** True when the actor may perform `action`. Unknown roles or actions never pass. */
export function can(action: Action, actor: Actor): boolean {
  if (actor.portalRole === "admin") return Object.hasOwn(MATRIX, action)
  if (actor.portalRole !== "user" || !actor.projectRole) return false
  const allowed: readonly ProjectRole[] | undefined = Object.hasOwn(
    MATRIX,
    action
  )
    ? MATRIX[action]
    : undefined
  return allowed?.includes(actor.projectRole) ?? false
}
