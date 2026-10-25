import { expect, test } from "../../fixtures/index.ts"
import { displayName, username } from "../../fixtures/roles.ts"

test.use({ role: "viewer" })

const openUserMenu = (page: import("@playwright/test").Page, slot: number) =>
  page
    .getByRole("button", { name: new RegExp(displayName("viewer", slot)) })
    .click()

test("E2E-SHELL-009 the theme menu switches and remembers dark mode @dark", async ({
  page,
  slot,
}) => {
  await page.emulateMedia({ colorScheme: "light" })
  await page.goto("/projects")
  const html = page.locator("html")
  await expect(html).toHaveClass(/light/)

  await openUserMenu(page, slot)
  await page.getByRole("menuitemradio", { name: "Dark" }).click()
  await expect(html).toHaveClass(/dark/)
  await page.reload()
  await expect(html).toHaveClass(/dark/)

  await openUserMenu(page, slot)
  await page.getByRole("menuitemradio", { name: "Same as my device" }).click()
  await expect(html).toHaveClass(/light/)
  await page.emulateMedia({ colorScheme: "dark" })
  await expect(html).toHaveClass(/dark/)
})

test("E2E-SHELL-010 skip to content is the first thing the keyboard reaches", async ({
  page,
}) => {
  await page.goto("/projects")
  await expect(
    page.getByRole("heading", { level: 1, name: "Projects" })
  ).toBeVisible()
  await page.keyboard.press("Tab")
  const skip = page.getByRole("link", { name: "Skip to content" })
  await expect(skip).toBeFocused()
  await expect(skip).toBeVisible()
  // F18: readable when shown — padded, not squeezed onto the logo.
  await expect(skip).toHaveCSS("padding-left", "12px")
  await expect(skip).toHaveCSS("padding-top", "8px")
  await page.keyboard.press("Enter")
  await expect(page.locator("#content")).toBeFocused()
})

test("E2E-SHELL-011 the user menu shows who is signed in", async ({
  page,
  slot,
}) => {
  await page.goto("/projects")
  await openUserMenu(page, slot)
  const menu = page.getByRole("menu")
  await expect(menu).toContainText(displayName("viewer", slot))
  await expect(menu).toContainText(`@${username("viewer", slot)}`)
  for (const item of ["Change password", "Sign out"])
    await expect(menu.getByRole("menuitem", { name: item })).toBeVisible()
  for (const t of ["Light", "Dark", "Same as my device"])
    await expect(menu.getByRole("menuitemradio", { name: t })).toBeVisible()
})

test("E2E-SHELL-012 on a phone the navigation opens as a sheet @mobile", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Phone layout only")
  await page.goto("/")
  await page.getByRole("button", { name: "Toggle Sidebar" }).click()
  const nav = page.getByRole("navigation", { name: "Main" })
  await expect(nav).toBeVisible()
  await nav.getByRole("link", { name: "Projects", exact: true }).click()
  await expect(page).toHaveURL("/projects")
  await expect(nav).toBeHidden()
})
