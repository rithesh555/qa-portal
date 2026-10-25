import type { Page } from "@playwright/test"
import {
  apiContext,
  expect,
  PortalApi,
  test,
  unique,
} from "../../fixtures/index.ts"
import {
  anonymousBrowser,
  choose,
  rowWith,
  search,
} from "../../fixtures/projects-helpers.ts"
import { displayName, username } from "../../fixtures/roles.ts"
import { freshUser, readyUser, signInWithForm } from "../../fixtures/users.ts"

// Users is admin-only; the default role is the slot admin.

async function openUsers(page: Page, term?: string) {
  await page.goto("/users")
  await expect(
    page.getByRole("heading", { level: 1, name: "Users" })
  ).toBeVisible()
  if (term) await search(page, "Search name, username or email", term)
}

const actionsFor = (page: Page, name: string) =>
  page.getByRole("button", { name: `Actions for ${name}` })

async function fillNewUser(page: Page, tag: string, role?: "Admin") {
  await page.getByRole("button", { name: "New user" }).click()
  const d = page.getByRole("dialog", { name: "New user" })
  await d.getByLabel("Full name").fill(`Created Person ${tag}`)
  await d.getByLabel("Username").fill(`e2e.made.${tag.toLowerCase()}`)
  await d
    .getByLabel("Email")
    .fill(`made.${tag.toLowerCase()}@e2e.qa-portal.local`)
  await d.getByRole("button", { name: "Generate" }).click()
  if (role) await choose(page, d.getByLabel("Portal role"), role)
  return d
}

test("E2E-USERS-001 find a user by name or username", async ({
  page,
  slot,
}) => {
  await openUsers(page)
  for (const tab of ["Active", "Deactivated", "All"])
    await expect(page.getByRole("tab", { name: tab })).toBeVisible()
  await search(page, "Search name, username or email", username("viewer", slot))
  const row = rowWith(page, `@${username("viewer", slot)}`)
  await expect(row).toBeVisible()
  await expect(row).toContainText(displayName("viewer", slot))
  await expect(row).toContainText("Member")
  await expect(
    page.getByRole("row").filter({ hasText: `@${username("tester", slot)}` })
  ).toHaveCount(0)
})

test("E2E-USERS-002 a search with no match says so", async ({ page }) => {
  await openUsers(page, `nobody-${unique()}`)
  await expect(page.getByText("No users match")).toBeVisible()
  await expect(page.getByText("Try another search or status.")).toBeVisible()
})

test("E2E-USERS-003 your own row is marked and can't be reset or deactivated", async ({
  page,
  slot,
}) => {
  await openUsers(page, username("admin", slot))
  const name = displayName("admin", slot)
  await expect(rowWith(page, `@${username("admin", slot)}`)).toContainText(
    "(you)"
  )
  await actionsFor(page, name).click()
  const menu = page.getByRole("menu")
  await expect(menu.getByRole("menuitem", { name: "Edit" })).toBeVisible()
  await expect(
    menu.getByRole("menuitem", { name: "Reset password" })
  ).toHaveCount(0)
  await expect(menu.getByRole("menuitem", { name: "Deactivate" })).toHaveCount(
    0
  )
})

test("E2E-USERS-004 create a user with a generated temporary password", async ({
  page,
}) => {
  const tag = unique()
  await openUsers(page)
  const d = await fillNewUser(page, tag)
  await expect(d.getByLabel("Temporary password")).toHaveAttribute(
    "type",
    "text"
  )
  expect(
    (await d.getByLabel("Temporary password").inputValue()).length
  ).toBeGreaterThanOrEqual(12)
  await d.getByRole("button", { name: "Create user" }).click()
  await expect(
    page.getByText(`Created Person ${tag} can now sign in`)
  ).toBeVisible()
  await expect(d).toBeHidden()
  await search(page, "Search name, username or email", tag.toLowerCase())
  const row = rowWith(page, `@e2e.made.${tag.toLowerCase()}`)
  await expect(row).toContainText("Member")
  await expect(row).toContainText("Active")
})

test("E2E-USERS-005 new user checks every field", async ({ page }) => {
  await openUsers(page)
  await page.getByRole("button", { name: "New user" }).click()
  const d = page.getByRole("dialog", { name: "New user" })
  await d.getByRole("button", { name: "Create user" }).click()
  await expect(d.getByText("Enter a name")).toBeVisible()
  await expect(d.getByText("Usernames are at least 3 characters")).toBeVisible()
  await expect(d.getByText("Enter a valid email address")).toBeVisible()
  await expect(
    d.getByText("Passwords are at least 12 characters")
  ).toBeVisible()
  await d.getByLabel("Username").fill("has space")
  await d.getByRole("button", { name: "Create user" }).click()
  await expect(
    d.getByText("Use letters, digits, dots and underscores only")
  ).toBeVisible()
})

test("E2E-USERS-006 a username that's taken is refused", async ({
  page,
  slot,
}) => {
  await openUsers(page)
  await page.getByRole("button", { name: "New user" }).click()
  const d = page.getByRole("dialog", { name: "New user" })
  await d.getByLabel("Full name").fill("Second Viewer")
  await d.getByLabel("Username").fill(username("viewer", slot))
  await d
    .getByLabel("Email")
    .fill(`dup.${unique().toLowerCase()}@e2e.qa-portal.local`)
  await d.getByRole("button", { name: "Generate" }).click()
  await d.getByRole("button", { name: "Create user" }).click()
  // F11: on the Username field, which is marked and focused.
  const field = d.getByLabel("Username")
  await expect(field).toHaveAccessibleDescription(
    "That username is already taken"
  )
  await expect(field).toHaveAttribute("aria-invalid", "true")
  await expect(field).toBeFocused()
})

test("E2E-USERS-007 edit a user's name, email and portal role", async ({
  page,
  slot,
}) => {
  const admin = new PortalApi(await apiContext(slot, "admin"))
  const user = await freshUser(admin)
  const renamed = `Renamed ${unique()}`
  await openUsers(page, user.username)
  await actionsFor(page, user.name).click()
  await page.getByRole("menuitem", { name: "Edit" }).click()
  const d = page.getByRole("dialog", { name: `Edit ${user.name}` })
  await d.getByLabel("Full name").fill(renamed)
  await d
    .getByLabel("Email")
    .fill(`renamed.${unique().toLowerCase()}@e2e.qa-portal.local`)
  await choose(page, d.getByLabel("Portal role"), "Admin")
  await d.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByText(`Saved changes to ${renamed}`)).toBeVisible()
  const row = rowWith(page, `@${user.username}`)
  await expect(row).toContainText(renamed)
  await expect(row).toContainText("Admin")
  await expect(row).toContainText("renamed.")
})

test("E2E-USERS-008 a new user is created as an admin when asked", async ({
  page,
}) => {
  const tag = unique()
  await openUsers(page)
  const d = await fillNewUser(page, tag, "Admin")
  await d.getByRole("button", { name: "Create user" }).click()
  await expect(
    page.getByText(`Created Person ${tag} can now sign in`)
  ).toBeVisible()
  await search(page, "Search name, username or email", tag.toLowerCase())
  await expect(rowWith(page, `@e2e.made.${tag.toLowerCase()}`)).toContainText(
    "Admin"
  )
})

test("E2E-USERS-009 reset someone's password; they must choose their own next", async ({
  page,
  browser,
  slot,
}) => {
  const admin = new PortalApi(await apiContext(slot, "admin"))
  const user = await readyUser(admin, await apiContext(slot, "anonymous"))
  await openUsers(page, user.username)
  await actionsFor(page, user.name).click()
  await page.getByRole("menuitem", { name: "Reset password" }).click()
  const d = page.getByRole("dialog", {
    name: `Reset password for ${user.name}`,
  })
  await d.getByRole("button", { name: "Generate" }).click()
  const fresh = await d.getByLabel("New password").inputValue()
  await d.getByRole("button", { name: "Set password" }).click()
  await expect(
    page.getByText(`New password set for ${user.name}`)
  ).toBeVisible()

  const other = await anonymousBrowser(browser, slot)
  const theirs = await other.newPage()
  await signInWithForm(theirs, user.username, fresh)
  await expect(
    theirs.getByRole("dialog", { name: "Choose your own password" })
  ).toBeVisible()
  await other.close()
})

test("E2E-USERS-010 deactivate someone after confirming", async ({
  page,
  slot,
}) => {
  const admin = new PortalApi(await apiContext(slot, "admin"))
  const user = await freshUser(admin)
  await openUsers(page, user.username)
  await actionsFor(page, user.name).click()
  await page.getByRole("menuitem", { name: "Deactivate" }).click()
  const confirm = page.getByRole("alertdialog", {
    name: `Deactivate ${user.name}?`,
  })
  await expect(confirm).toContainText("history stay as they are")
  await confirm.getByRole("button", { name: "Deactivate" }).click()
  await expect(
    page.getByText(`${user.name} has been deactivated`)
  ).toBeVisible()
  await expect(page.getByText("No users match")).toBeVisible()
  await page.getByRole("tab", { name: "Deactivated" }).click()
  await expect(rowWith(page, `@${user.username}`)).toContainText("Deactivated")
})

test("E2E-USERS-013 after deactivating, focus stays on the page and Reactivate undoes it", async ({
  page,
  slot,
}) => {
  const admin = new PortalApi(await apiContext(slot, "admin"))
  const user = await freshUser(admin)
  await openUsers(page, user.username)
  await actionsFor(page, user.name).click()
  await page.getByRole("menuitem", { name: "Deactivate" }).click()
  await page
    .getByRole("alertdialog", { name: `Deactivate ${user.name}?` })
    .getByRole("button", { name: "Deactivate" })
    .click()
  // F22: their row is gone, so focus goes to the page heading, not nowhere.
  await expect(
    page.getByRole("heading", { level: 1, name: "Users" })
  ).toBeFocused()
  const toast = page
    .getByRole("region", { name: "Notifications" })
    .getByRole("dialog")
    .filter({ hasText: `${user.name} has been deactivated` })
  await toast.getByRole("button", { name: "Reactivate" }).click()
  await expect(page.getByText(`${user.name} can sign in again`)).toBeVisible()
  await expect(rowWith(page, `@${user.username}`)).toBeVisible()
})

test("E2E-USERS-011 reactivate someone and they can sign in again", async ({
  page,
  browser,
  slot,
}) => {
  const admin = new PortalApi(await apiContext(slot, "admin"))
  const user = await readyUser(admin, await apiContext(slot, "anonymous"))
  await admin.post(`/users/${user.id}/deactivate`)
  await page.goto("/users?status=deactivated")
  await search(page, "Search name, username or email", user.username)
  await actionsFor(page, user.name).click()
  await page.getByRole("menuitem", { name: "Reactivate" }).click()
  await expect(page.getByText(`${user.name} can sign in again`)).toBeVisible()

  const other = await anonymousBrowser(browser, slot)
  const theirs = await other.newPage()
  await signInWithForm(theirs, user.username, user.password)
  await expect(theirs).toHaveURL("/")
  await other.close()
})

test("E2E-USERS-012 create a user on a phone @mobile", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Phone layout only")
  const tag = unique()
  await openUsers(page)
  const d = await fillNewUser(page, tag)
  const box = await d.boundingBox()
  const viewport = page.viewportSize()!
  expect(box!.width).toBeLessThanOrEqual(viewport.width)
  await d.getByRole("button", { name: "Create user" }).click()
  await expect(
    page.getByText(`Created Person ${tag} can now sign in`)
  ).toBeVisible()
})
