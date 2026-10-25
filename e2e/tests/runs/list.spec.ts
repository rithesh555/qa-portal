import { expect, test } from "../../fixtures/index.ts"
import { choose, seedCases, startRun } from "../../fixtures/runs-helpers.ts"

test.describe("as a tester", () => {
  test.use({ role: "tester" })

  test("E2E-RUN-001 a project without runs offers to start the first one", async ({
    page,
    project,
  }) => {
    await page.goto(`/projects/${project.key}/runs`)
    await expect(
      page.getByRole("heading", { name: "No test runs yet" })
    ).toBeVisible()
    await page.getByRole("button", { name: "Start the first run" }).click()
    await expect(page).toHaveURL(`/projects/${project.key}/runs/new`)
    await expect(
      page.getByRole("heading", { level: 1, name: "New test run" })
    ).toBeVisible()
  })

  test("E2E-RUN-003 open and closed tabs show their runs with counts", async ({
    page,
    project,
  }) => {
    await seedCases(project, { ready: 1 })
    await startRun(project, "Still going")
    const done = await startRun(project, "All wrapped up")
    await project.lead.post(`/projects/${project.key}/runs/${done.key}/close`)

    await page.goto(`/projects/${project.key}/runs`)
    await expect(page.getByRole("tab", { name: "Open (1)" })).toHaveAttribute(
      "aria-selected",
      "true"
    )
    await expect(page.getByRole("link", { name: "Still going" })).toBeVisible()
    await expect(
      page.getByRole("link", { name: "All wrapped up" })
    ).toHaveCount(0)

    await page.getByRole("tab", { name: "Closed (1)" }).click()
    await expect(
      page.getByRole("link", { name: "All wrapped up" })
    ).toBeVisible()
    await expect(page.getByText(/Closed by E2E Lead/)).toBeVisible()
  })

  test("E2E-RUN-004 search runs by ID or name, and clear the filters", async ({
    page,
    project,
  }) => {
    await seedCases(project, { ready: 1 })
    await startRun(project, "Chrome pass")
    await startRun(project, "Firefox pass")
    await page.goto(`/projects/${project.key}/runs`)

    const search = page.getByRole("searchbox", { name: "Search by ID or name" })
    await search.fill("Firefox")
    await expect(page.getByRole("link", { name: "Firefox pass" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Chrome pass" })).toHaveCount(0)

    await search.fill("nothing like this")
    await expect(page.getByText("No open runs match")).toBeVisible()
    await page.getByRole("button", { name: "Clear filters" }).click()
    await expect(page.getByRole("link", { name: "Chrome pass" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Firefox pass" })).toBeVisible()
  })

  test("E2E-RUN-005 filter runs by release", async ({ page, project }) => {
    await seedCases(project, { ready: 1 })
    const release = await project.lead.createRelease(project.key, {
      name: "3.4",
      status: "in_progress",
    })
    await startRun(project, "Release run", project.tester, {
      releaseId: release.id,
    })
    await startRun(project, "Loose run")
    await page.goto(`/projects/${project.key}/runs`)
    await expect(page.getByRole("link", { name: "Loose run" })).toBeVisible()

    await choose(page, "Release", "3.4")
    await expect(page.getByRole("link", { name: "Release run" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Loose run" })).toHaveCount(0)
  })

  test("E2E-RUN-006 my runs shows only runs I started or have cases in", async ({
    page,
    project,
  }) => {
    await seedCases(project, { ready: 1 })
    await startRun(project, "Mine")
    await startRun(project, "The lead's", project.lead)
    await page.goto(`/projects/${project.key}/runs`)
    await expect(page.getByRole("link", { name: "The lead's" })).toBeVisible()

    await page.getByRole("button", { name: "My runs" }).click()
    await expect(page.getByRole("link", { name: "Mine" })).toBeVisible()
    await expect(page.getByRole("link", { name: "The lead's" })).toHaveCount(0)
  })
})

test.describe("as a viewer", () => {
  test.use({ role: "viewer" })

  test("E2E-RUN-002 viewers can't start runs", async ({ page, project }) => {
    await page.goto(`/projects/${project.key}/runs`)
    await expect(
      page.getByRole("heading", { name: "No test runs yet" })
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Start the first run" })
    ).toHaveCount(0)
    await expect(page.getByRole("button", { name: "New run" })).toHaveCount(0)

    await page.goto(`/projects/${project.key}/runs/new`)
    await expect(
      page.getByRole("heading", { name: "You don't have access to this page" })
    ).toBeVisible()
  })
})
