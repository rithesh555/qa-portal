import { type Action, can, type Me, type Project } from "@qa/shared"
import { useOutletContext } from "react-router"
import { useSession } from "@/features/auth/session"
import type { ProjectContext } from "@/features/projects/project-layout"

/**
 * What `user` may do, inside `project` when given. Archived projects are
 * read-only for everyone except restoring them.
 */
export function canFor(
  user: Me | null | undefined,
  project?: Pick<Project, "myRole" | "archived">
): (action: Action) => boolean {
  return (action) => {
    if (!user) return false
    if (project?.archived && action !== "projects:manage") return false
    return can(action, {
      portalRole: user.role,
      projectRole: project?.myRole ?? null,
    })
  }
}

/**
 * The one permission check for UI: hides or disables what the shared matrix
 * denies (the API still enforces it). Inside a `/projects/:key` route it
 * answers for that project.
 */
export function useCan(): (action: Action) => boolean {
  const { data: user } = useSession()
  const project = useOutletContext<ProjectContext | undefined>()?.project
  return canFor(user, project)
}
