import { createAccessControl } from "better-auth/plugins/access"
import {
  adminAc,
  defaultStatements,
  userAc,
} from "better-auth/plugins/admin/access"

/**
 * Better Auth access control for the portal-wide roles only. Project rights
 * (lead/tester/viewer) live on project memberships and are checked with
 * `can()` from @qa/shared.
 */
export const ac = createAccessControl({ ...defaultStatements })

export const roles = {
  admin: ac.newRole({ ...adminAc.statements }),
  user: ac.newRole({ ...userAc.statements }),
}
