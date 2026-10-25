import { expect, test } from "../../fixtures/index.ts"
import { manualDefect, moveDefect } from "../../fixtures/defects-helpers.ts"

const tile = (page: import("@playwright/test").Page, label: string) =>
  page.getByRole("link").filter({ hasText: label })

test.describe("as a tester", () => {
  test.use({ role: "tester" })

  test("E2E-HOME-001 runs with cases for me lead to my cases in the run", async ({
    page,
    project,
  }) => {
    await project.tester.createCase(project.key, { title: "Pay by card" })
    const run = await project.lead.createRun(project.key, {
      name: `Smoke for ${project.name}`,
      assigneeIds: [project.ids.tester],
    })
    await page.goto("/")
    await expect(tile(page, "Cases to test")).toBeVisible()
    const runs = page.getByRole("region", { name: "Runs with cases for you" })
    const row = runs.getByRole("listitem").filter({ hasText: run.key })
    await expect(row).toContainText(`Smoke for ${project.name}`)
    await expect(row).toContainText("1 of your 1 cases left")
    await row.getByText("Continue").click()
    await expect(page).toHaveURL(
      `/projects/${project.key}/runs/${run.key}?show=mine`
    )
  })

  test("E2E-HOME-002 defects assigned to me are listed on Home", async ({
    page,
    project,
  }) => {
    const d = await manualDefect(project.lead, project.key, {
      assigneeId: project.ids.tester,
    })
    await page.goto("/")
    await expect(tile(page, "My open defects")).toBeVisible()
    const defects = page.getByRole("region", { name: "Defects" })
    await expect(
      defects.getByRole("tab", { name: /Assigned to me/ })
    ).toHaveAttribute("aria-selected", "true")
    await expect(defects.getByRole("tabpanel")).toContainText(d.title)
  })

  test("E2E-HOME-003 defects I reported that are now fixed wait for my retest", async ({
    page,
    project,
  }) => {
    const d = await moveDefect(
      project,
      await manualDefect(project.tester, project.key),
      "fixed"
    )
    await page.goto("/")
    const defects = page.getByRole("region", { name: "Defects" })
    await defects.getByRole("tab", { name: /Ready to retest/ }).click()
    await expect(defects.getByRole("tabpanel")).toContainText(d.title)
    await defects
      .getByRole("tabpanel")
      .getByRole("link", { name: new RegExp(d.title) })
      .click()
    await expect(page).toHaveURL(`/projects/${project.key}/defects/${d.key}`)
  })

  test("E2E-HOME-004 leads see defects to triage; testers don't", async ({
    page,
    project,
    as,
  }) => {
    const d = await manualDefect(project.tester, project.key)
    await page.goto("/")
    // Home sums up every project the person is in: slow late in a full run.
    await expect(tile(page, "Runs ready to close")).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByRole("tab", { name: /To triage/ })).toHaveCount(0)

    const lead = await as("lead")
    await lead.page.goto("/")
    await expect(tile(lead.page, "Defects to triage")).toContainText(
      project.name
    )
    const defects = lead.page.getByRole("region", { name: "Defects" })
    await defects.getByRole("tab", { name: /To triage/ }).click()
    await expect(defects.getByRole("tabpanel")).toContainText(d.title)
  })

  test("E2E-HOME-005 releases in my projects, with a link to all releases", async ({
    page,
    project,
  }) => {
    await project.lead.createRelease(project.key, {
      name: "7.0",
      status: "in_progress",
    })
    await page.goto("/")
    const releases = page.getByRole("link", { name: `${project.name} · 7.0` })
    await expect(releases).toBeVisible()
    await expect(releases).toHaveAttribute(
      "href",
      new RegExp(`/projects/${project.key}/reports\\?release=`)
    )
    await page.getByRole("link", { name: "See all releases" }).click()
    await expect(page).toHaveURL("/releases")
  })

  test("E2E-HOME-007 recent activity shows what happened in my projects", async ({
    page,
    project,
    slot,
  }) => {
    await manualDefect(project.tester, project.key)
    await page.goto("/")
    const activity = page.locator("[data-slot=card]").filter({
      has: page.getByRole("heading", {
        name: "Recent activity in your projects",
      }),
    })
    const item = activity
      .getByRole("listitem")
      .filter({ hasText: project.name })
      .first()
    await expect(item).toContainText(`E2E Tester ${slot}`)
    await item.getByRole("link", { name: project.name }).click()
    await expect(page).toHaveURL(`/projects/${project.key}`)
  })

  test("E2E-HOME-008 home fits a phone screen @mobile", async ({
    page,
    project,
    isMobile,
  }) => {
    test.skip(!isMobile, "Phone layout only")
    await manualDefect(project.lead, project.key, {
      assigneeId: project.ids.tester,
    })
    await page.goto("/")
    await expect(tile(page, "My open defects")).toBeVisible()
    const a = await tile(page, "Cases to test").boundingBox()
    const b = await tile(page, "My open defects").boundingBox()
    expect(b!.y).toBeGreaterThan(a!.y)
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})

test.describe("as someone in no project", () => {
  test.use({ role: "outsider" })
  test("E2E-HOME-006 someone in no project is told how to get added", async ({
    page,
  }) => {
    await page.goto("/")
    await expect(
      page.getByRole("heading", { name: "You're not in any project yet" })
    ).toBeVisible()
    await expect(
      page.getByText(/Ask an admin or a project's QA Lead to add you/)
    ).toBeVisible()
  })
})
