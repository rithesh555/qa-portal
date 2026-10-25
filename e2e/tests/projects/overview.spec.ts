import { newProjectKey } from "../../fixtures/api.ts"
import { expect, test, unique } from "../../fixtures/index.ts"
import { rowWith, search } from "../../fixtures/projects-helpers.ts"
import { displayName } from "../../fixtures/roles.ts"
import { freshUser } from "../../fixtures/users.ts"

test.describe("as the lead", () => {
  test.use({ role: "lead" })

  test("E2E-PROJ-015 the overview shows my role, the team and links by role", async ({
    page,
    project,
    slot,
    as,
  }) => {
    await page.goto(`/projects/${project.key}`)
    await expect(page.getByText("You: QA Lead")).toBeVisible()
    await expect(
      page.getByText(`QA Leads: ${displayName("lead", slot)}`)
    ).toBeVisible()
    // Team counts: one lead, one tester, one viewer.
    for (const label of ["QA Leads", "Testers", "Viewers"]) {
      const stat = page
        .locator("dl > div")
        .filter({ has: page.getByText(label, { exact: true }) })
      await expect(stat.getByRole("definition")).toHaveText("1")
    }
    await expect(
      page.getByRole("link", { name: "Manage members" })
    ).toBeVisible()

    const tester = await as("tester")
    await tester.page.goto(`/projects/${project.key}`)
    await expect(tester.page.getByText("You: Tester")).toBeVisible()
    await expect(
      tester.page.getByRole("link", { name: "See members" })
    ).toBeVisible()
  })

  test("E2E-PROJ-016 the current release card links to its report", async ({
    page,
    project,
  }) => {
    await page.goto(`/projects/${project.key}`)
    await expect(page.getByText("No release is in progress.")).toBeVisible()

    const name = `R${unique().slice(0, 5)}`
    const release = await project.lead.createRelease(project.key, {
      name,
      status: "in_progress",
      startDate: "2026-10-01",
      targetDate: "2026-12-31",
    })
    await page.reload()
    const card = page
      .locator("[data-slot=card]")
      .filter({ has: page.getByRole("heading", { name: "Current release" }) })
    await expect(card).toContainText(name)
    await expect(card).toContainText("In progress")
    await card
      .getByRole("link", { name: "Can it ship? See the release report" })
      .click()
    await expect(page).toHaveURL(
      `/projects/${project.key}/reports?release=${release.id}`
    )
  })

  test("E2E-PROJ-017 recent activity lists what happened in the project", async ({
    page,
    project,
    slot,
  }) => {
    const name = `Act${unique().slice(0, 4)}`
    await project.lead.createRelease(project.key, { name, status: "planned" })
    await page.goto(`/projects/${project.key}`)
    const activity = page
      .locator("[data-slot=card]")
      .filter({ has: page.getByRole("heading", { name: "Recent activity" }) })
    await expect(
      activity.getByRole("listitem").filter({ hasText: name })
    ).toContainText(displayName("lead", slot))
  })
})

test("E2E-PROJ-018 a project without an active QA Lead is flagged", async ({
  page,
  slot,
  project,
}) => {
  // project.admin is this slot's admin; give a new project a lead who then leaves.
  const lead = await freshUser(project.admin)
  const key = newProjectKey()
  await project.admin.createProject({
    key,
    name: `Orphan ${unique()}`,
    leadUserId: lead.id,
  })
  await project.admin.post(`/users/${lead.id}/deactivate`)

  await page.goto(`/projects/${key}`)
  await expect(
    page.getByText("No active QA Lead. An admin should assign one.")
  ).toBeVisible()
  await page.goto("/projects")
  await search(page, "Search name or key", key)
  await expect(rowWith(page, key)).toContainText("No active lead")
  void slot
})
