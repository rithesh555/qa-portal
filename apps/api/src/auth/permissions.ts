import { createAccessControl } from "better-auth/plugins/access"
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access"

/**
 * Better Auth access control. Only the built-in `user`/`session` admin
 * statements for now; QA modules add their own resources in later phases.
 */
export const ac = createAccessControl({ ...defaultStatements })

export const roles = {
  admin: ac.newRole({ ...adminAc.statements }),
  qa_lead: ac.newRole({ user: [], session: [] }),
  tester: ac.newRole({ user: [], session: [] }),
  viewer: ac.newRole({ user: [], session: [] }),
}
