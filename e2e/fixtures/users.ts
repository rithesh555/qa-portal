import { randomBytes } from "node:crypto"
import type { Page } from "@playwright/test"
import { type PortalApi, unique } from "./api.ts"

export interface FreshUser {
  id: string
  name: string
  username: string
  password: string
}

/** A brand-new account an admin just created: it must choose its own password. */
export async function freshUser(
  admin: PortalApi,
  role: "admin" | "user" = "user"
): Promise<FreshUser> {
  const tag = unique().toLowerCase()
  const username = `e2e.new.${tag}`
  const name = `New Person ${tag.toUpperCase()}`
  const password = randomBytes(12).toString("base64url")
  const { id } = await admin.createUser({
    name,
    username,
    email: `${username}@e2e.qa-portal.local`,
    password,
    role,
  })
  return { id, name, username, password }
}

/** Signs in through the sign-in screen. */
export async function signInWithForm(
  page: Page,
  username: string,
  password: string
) {
  await page.goto("/login")
  await page.getByLabel("Username").fill(username)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
}

/** A password nobody else uses. */
export const newPassword = () => `e2e-${randomBytes(12).toString("base64url")}`

/** A fresh account that has already chosen its own password (via the API). */
export async function readyUser(
  admin: PortalApi,
  anonymous: import("@playwright/test").APIRequestContext
): Promise<FreshUser> {
  const user = await freshUser(admin)
  const chosen = newPassword()
  const signIn = await anonymous.post("/api/auth/sign-in/username", {
    data: { username: user.username, password: user.password },
  })
  if (!signIn.ok()) throw new Error(`sign-in failed: ${signIn.status()}`)
  const changed = await anonymous.post("/api/auth/change-password", {
    data: {
      currentPassword: user.password,
      newPassword: chosen,
      revokeOtherSessions: true,
    },
  })
  if (!changed.ok())
    throw new Error(`change-password failed: ${changed.status()}`)
  await anonymous.post("/api/auth/sign-out")
  return { ...user, password: chosen }
}
