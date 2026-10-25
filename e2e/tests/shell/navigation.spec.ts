import { BASE, expect, test } from "../../fixtures/index.ts"

const main = (page: import("@playwright/test").Page) =>
  page.getByRole("navigation", { name: "Main" })

test("E2E-SHELL-001 admins see Home, Projects, All releases and Users", async ({
  page,
}) => {
  await page.goto("/projects")
  for (const item of ["Home", "Projects", "All releases", "Users"])
    await expect(
      main(page).getByRole("link", { name: item, exact: true })
    ).toBeVisible()
})

test.describe("as a tester", () => {
  test.use({ role: "tester" })
  test("E2E-SHELL-002 testers see only Home and Projects", async ({ page }) => {
    await page.goto("/projects")
    await expect(
      main(page).getByRole("link", { name: "Projects", exact: true })
    ).toBeVisible()
    await expect(
      main(page).getByRole("link", { name: "Home", exact: true })
    ).toBeVisible()
    await expect(
      main(page).getByRole("link", { name: "All releases" })
    ).toHaveCount(0)
    await expect(main(page).getByRole("link", { name: "Users" })).toHaveCount(0)
  })
})

test.describe("as a lead", () => {
  test.use({ role: "lead" })
  test("E2E-SHELL-003 a QA Lead of two projects also sees All releases", async ({
    page,
    project,
  }) => {
    // Leads BASE and the test's own project.
    void project
    await page.goto("/projects")
    await expect(
      main(page).getByRole("link", { name: "All releases" })
    ).toBeVisible()
  })

  test("E2E-SHELL-004 non-admins opening /users see no-access", async ({
    page,
  }) => {
    await page.goto("/users")
    await expect(
      page.getByRole("heading", { name: "You don't have access to this page" })
    ).toBeVisible()
  })
})

test("E2E-SHELL-005 inside a project the sidebar lists its seven pages", async ({
  page,
}) => {
  await page.goto(`/projects/${BASE.key}`)
  const pages = [
    "Overview",
    "Test cases",
    "Test runs",
    "Defects",
    "Releases",
    "Reports",
    "Members",
  ]
  for (const p of pages)
    await expect(
      main(page).getByRole("link", { name: p, exact: true })
    ).toBeVisible()
  await main(page)
    .getByRole("link", { name: "Test cases", exact: true })
    .click()
  await expect(page).toHaveURL(`/projects/${BASE.key}/cases`)
  await expect(
    main(page).getByRole("link", { name: "Test cases", exact: true })
  ).toHaveAttribute("aria-current", "page")
  await expect(page).toHaveTitle(`Test cases · ${BASE.name} · QA Portal`)
  await expect(page.locator("header")).toContainText("Test cases")
})

test("E2E-SHELL-006 switch project from the sidebar", async ({
  page,
  project,
}) => {
  await page.goto(`/projects/${BASE.key}`)
  await page
    .getByRole("button", { name: new RegExp(BASE.name) })
    .first()
    .click()
  const switcher = page.getByRole("dialog", { name: "Switch project" })
  await switcher
    .getByRole("combobox", { name: "Find a project" })
    .fill(project.name.slice(-7))
  await expect(switcher.getByText("Matching projects")).toBeVisible()
  await switcher.getByRole("option", { name: new RegExp(project.name) }).click()
  await expect(page).toHaveURL(`/projects/${project.key}`)
  await expect(
    page.getByRole("button", { name: new RegExp(project.name) }).first()
  ).toBeVisible()
})

test("E2E-SHELL-007 unknown pages and projects show not found", async ({
  page,
}) => {
  await page.goto("/no-such-page")
  await expect(
    page.getByRole("heading", { name: "Page not found" })
  ).toBeVisible()
  // F23: the tab says so too.
  await expect(page).toHaveTitle("Page not found · QA Portal")
  // Finding: a link to Home, exposed as a button (Button rendered as <Link>).
  await page.getByRole("button", { name: "Go to home" }).click()
  await expect(page).toHaveURL("/")
  await page.goto("/projects/NOPE9")
  await expect(
    page.getByRole("heading", { name: "Project not found" })
  ).toBeVisible()
  await expect(page).toHaveTitle("Project not found · QA Portal")
})

test.describe("as an outsider", () => {
  test.use({ role: "outsider" })
  test("E2E-SHELL-008 a project the person isn't in looks the same as one that doesn't exist", async ({
    page,
  }) => {
    await page.goto(`/projects/${BASE.key}`)
    await expect(
      page.getByRole("heading", { name: "Project not found" })
    ).toBeVisible()
    await expect(page.getByText("you're not a member")).toBeVisible()
    const res = await page.request.get(`/api/projects/${BASE.key}`)
    expect(res.status()).toBe(404)
  })
})
