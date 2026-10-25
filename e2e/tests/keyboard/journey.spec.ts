import type { Locator, Page } from "@playwright/test"
import { apiContext, expect, test } from "../../fixtures/index.ts"
import { clientIp } from "../../fixtures/roles.ts"
import { seedCases, startRun } from "../../fixtures/runs-helpers.ts"
import { readyUser } from "../../fixtures/users.ts"

/** Presses Tab until `target` has focus, as a keyboard user would. */
async function tabTo(page: Page, target: Locator, max = 60) {
  await expect(target).toBeVisible()
  for (let i = 0; i < max; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return
    await page.keyboard.press("Tab")
  }
  throw new Error(`Couldn't reach ${target} with Tab in ${max} presses`)
}

test("E2E-KEY-001 sign in, open a run, fail a case and log its defect with the keyboard only", async ({
  browser,
  project,
  slot,
}) => {
  test.slow()
  await seedCases(project, { ready: 2 })
  const run = await startRun(project)
  const user = await readyUser(
    project.admin,
    await apiContext(slot, "anonymous")
  )
  await project.admin.addMembers(project.key, [user.id], "tester")
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
    extraHTTPHeaders: { "X-Forwarded-For": clientIp(slot) },
  })
  const page = await context.newPage()

  // Sign in: the username field has focus on arrival.
  await page.goto("/login")
  await expect(page.getByLabel("Username")).toBeFocused()
  await page.keyboard.type(user.username)
  await page.keyboard.press("Tab")
  await page.keyboard.type(user.password)
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL("/")

  // Projects → the project → Test runs → the run.
  const projects = page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Projects", exact: true })
  await tabTo(page, projects)
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL("/projects")
  const projectLink = page.getByRole("link", { name: new RegExp(project.name) })
  await tabTo(page, projectLink.first())
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(new RegExp(`/projects/${project.key}$`))
  const runs = page.getByRole("link", { name: "Test runs", exact: true })
  await tabTo(page, runs.first())
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(`/projects/${project.key}/runs`)
  const runLink = page.getByRole("link", { name: "Smoke run", exact: true })
  await tabTo(page, runLink.first())
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(new RegExp(`/runs/${run.key}`))

  // Fail the first case with a note, using the shortcuts.
  const passed = page
    .getByRole("group", { name: "Record a result" })
    .getByRole("button", { name: /^Passed/ })
  await expect(passed).toBeEnabled()
  await page.keyboard.press("f")
  const note = page.getByLabel("What went wrong? (required)")
  await expect(note).toBeFocused()
  await page.keyboard.type("Card is declined")
  await page.keyboard.press("Control+Enter")
  await expect(page.locator("#run-case-title")).toHaveText("Run case 2")
  // F4: shortcuts are ignored until the next case's steps have loaded.
  await expect(passed).toBeEnabled()
  await page.keyboard.press("k")
  await expect(page.locator("#run-case-title")).toHaveText("Run case 1")

  // Log a defect for that result.
  const log = page.getByRole("button", { name: /^Log defect/ })
  await tabTo(page, log.first())
  await page.keyboard.press("Enter")
  const dialog = page.getByRole("dialog", {
    name: "Log a defect for this result",
  })
  await expect(dialog).toBeVisible()
  const title = dialog.getByLabel(/^Title/)
  await tabTo(page, title)
  await page.keyboard.press("Control+a")
  await page.keyboard.type("Saved card is declined at checkout")
  // Severity is a select: open it, arrow to Major, Enter.
  const severity = dialog.getByRole("combobox", { name: /Severity/ })
  await tabTo(page, severity)
  await page.keyboard.press("Enter")
  const major = page.getByRole("option", { name: /^Major/ })
  await expect(major).toBeVisible()
  for (let i = 0; i < 6; i++) {
    if (await major.evaluate((el) => el === document.activeElement)) break
    await page.keyboard.press("ArrowDown")
  }
  await expect(major).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(severity).toHaveText(/Major/)
  const submit = dialog.getByRole("button", { name: "Log defect" })
  await tabTo(page, submit)
  await page.keyboard.press("Enter")
  await expect(dialog).toBeHidden()
  await expect(
    page.getByText(new RegExp(`${project.key}-D-1`)).first()
  ).toBeVisible()
  await context.close()
})
