import { apiContext, expect, PortalApi, test } from "../../fixtures/index.ts"
import { readyUser, signInWithForm } from "../../fixtures/users.ts"

test.use({ role: "anonymous" })

test("E2E-AUTH-008 sign out ends the session", async ({ page, slot }) => {
  const admin = new PortalApi(await apiContext(slot, "admin"))
  const user = await readyUser(admin, await apiContext(slot, "anonymous"))
  await signInWithForm(page, user.username, user.password)
  await expect(page).toHaveURL("/")
  await page.goto("/projects")
  await expect(
    page.getByRole("heading", { level: 1, name: "Projects" })
  ).toBeVisible()

  await page.getByRole("button", { name: new RegExp(user.name) }).click()
  await page.getByRole("menuitem", { name: "Sign out" }).click()
  await expect(page).toHaveURL(/\/login$/)

  await page.goBack()
  await page.reload()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()
})

test("E2E-AUTH-009 deactivating someone signs them out on their next action", async ({
  page,
  slot,
}) => {
  const admin = new PortalApi(await apiContext(slot, "admin"))
  const user = await readyUser(admin, await apiContext(slot, "anonymous"))
  await signInWithForm(page, user.username, user.password)
  await expect(page).toHaveURL("/")

  await admin.post(`/users/${user.id}/deactivate`)
  await page.goto("/projects")
  await expect(page).toHaveURL(/\/login$/)
})
