import { apiContext, expect, PortalApi, test } from "../../fixtures/index.ts"
import {
  freshUser,
  newPassword,
  readyUser,
  signInWithForm,
} from "../../fixtures/users.ts"

test.use({ role: "anonymous" })

const dialog = (page: import("@playwright/test").Page) =>
  page.getByRole("dialog", { name: "Choose your own password" })

test("E2E-AUTH-010 a new account must choose its own password before anything else", async ({
  page,
  slot,
}) => {
  const admin = new PortalApi(await apiContext(slot, "admin"))
  const user = await freshUser(admin)
  await signInWithForm(page, user.username, user.password)
  await expect(dialog(page)).toBeVisible()

  await page.keyboard.press("Escape")
  await page.mouse.click(5, 5)
  await expect(dialog(page)).toBeVisible()

  const res = await page.request.get("/api/projects")
  expect(res.status()).toBe(403)
  expect(await res.text()).toContain("Change your password first")
})

test("E2E-AUTH-011 choosing a password checks it differs and is confirmed", async ({
  page,
  slot,
}) => {
  const admin = new PortalApi(await apiContext(slot, "admin"))
  const user = await freshUser(admin)
  await signInWithForm(page, user.username, user.password)
  const d = dialog(page)
  await d.getByLabel("Current password").fill(user.password)
  await d.getByLabel("New password", { exact: true }).fill(user.password)
  await d.getByLabel("Confirm new password").fill(user.password)
  await d.getByRole("button", { name: "Save my password" }).click()
  await expect(
    d.getByText("Choose a password different from your current one")
  ).toBeVisible()

  await d.getByLabel("New password", { exact: true }).fill(newPassword())
  await d.getByLabel("Confirm new password").fill(newPassword())
  await d.getByRole("button", { name: "Save my password" }).click()
  await expect(d.getByText("The passwords don't match")).toBeVisible()
})

test("E2E-AUTH-012 after choosing a password the app opens and the new password works", async ({
  page,
  slot,
}) => {
  const admin = new PortalApi(await apiContext(slot, "admin"))
  const user = await freshUser(admin)
  const chosen = newPassword()
  await signInWithForm(page, user.username, user.password)
  const d = dialog(page)
  await d.getByLabel("Current password").fill(user.password)
  await d.getByLabel("New password", { exact: true }).fill(chosen)
  await d.getByLabel("Confirm new password").fill(chosen)
  await d.getByRole("button", { name: "Save my password" }).click()
  await expect(page.getByText("Password saved")).toBeVisible()
  await expect(d).toBeHidden()
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible()

  await page.getByRole("button", { name: new RegExp(user.name) }).click()
  await page.getByRole("menuitem", { name: "Sign out" }).click()
  await signInWithForm(page, user.username, chosen)
  await expect(page).toHaveURL("/")
  await expect(dialog(page)).toBeHidden()
})

test("E2E-AUTH-013 sign out from the choose-password dialog", async ({
  page,
  slot,
}) => {
  const admin = new PortalApi(await apiContext(slot, "admin"))
  const user = await freshUser(admin)
  await signInWithForm(page, user.username, user.password)
  await dialog(page).getByRole("button", { name: "Sign out" }).click()
  await expect(page).toHaveURL(/\/login$/)
})

test("E2E-AUTH-014 change password refuses a wrong current password", async ({
  page,
  slot,
}) => {
  const admin = new PortalApi(await apiContext(slot, "admin"))
  const user = await readyUser(admin, await apiContext(slot, "anonymous"))
  await signInWithForm(page, user.username, user.password)
  await page.getByRole("button", { name: new RegExp(user.name) }).click()
  await page.getByRole("menuitem", { name: "Change password" }).click()
  const d = page.getByRole("dialog", { name: "Change password" })
  await d.getByLabel("Current password").fill("not-my-password")
  const chosen = newPassword()
  await d.getByLabel("New password", { exact: true }).fill(chosen)
  await d.getByLabel("Confirm new password").fill(chosen)
  await d.getByRole("button", { name: "Change password" }).click()
  await expect(d.getByText("Your current password isn't right")).toBeVisible()
})

test("E2E-AUTH-015 changing the password signs out other devices", async ({
  page,
  browser,
  slot,
}) => {
  const admin = new PortalApi(await apiContext(slot, "admin"))
  const user = await readyUser(admin, await apiContext(slot, "anonymous"))
  const other = await browser.newContext()
  const otherPage = await other.newPage()
  await signInWithForm(otherPage, user.username, user.password)
  await expect(otherPage).toHaveURL("/")

  await signInWithForm(page, user.username, user.password)
  await page.getByRole("button", { name: new RegExp(user.name) }).click()
  await page.getByRole("menuitem", { name: "Change password" }).click()
  const d = page.getByRole("dialog", { name: "Change password" })
  const chosen = newPassword()
  await d.getByLabel("Current password").fill(user.password)
  await d.getByLabel("New password", { exact: true }).fill(chosen)
  await d.getByLabel("Confirm new password").fill(chosen)
  await d.getByRole("button", { name: "Change password" }).click()
  await expect(page.getByText("Password changed")).toBeVisible()

  await otherPage.reload()
  await expect(otherPage).toHaveURL(/\/login$/)
  await other.close()
})
