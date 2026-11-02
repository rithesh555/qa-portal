import { BASE, expect, test } from "../../fixtures/index.ts"
import {
  choose,
  dayFromNow,
  readCsv,
  releaseWithResults,
} from "../../fixtures/defects-helpers.ts"

const search = (page: import("@playwright/test").Page) =>
  page.getByRole("searchbox", { name: "Search projects" })
const rowsFor = (page: import("@playwright/test").Page, name: string) =>
  page.getByRole("link", { name: new RegExp(`^${name}, Release `) })

test("E2E-RPT-001 admins search all active releases by project", async ({
  page,
  project,
}) => {
  await releaseWithResults(project)
  await page.goto("/releases")
  await expect(page.getByText(/Active releases in every project/)).toBeVisible()
  await search(page).fill(project.key)
  await expect(rowsFor(page, project.name)).toHaveText([
    `${project.name}, Release R1`,
  ])
  await expect(
    page.getByText(/^Showing 1 of \d+ active releases\.$/)
  ).toBeVisible()
})

test("E2E-RPT-002 not ready only hides releases that pass or have no runs", async ({
  page,
  project,
}) => {
  await releaseWithResults(project)
  await project.lead.createRelease(project.key, {
    name: "R2",
    status: "planned",
  })
  await page.goto("/releases")
  await search(page).fill(project.key)
  await expect(rowsFor(page, project.name)).toHaveCount(2)
  const notReady = page.getByRole("button", { name: "Not ready only" })
  await notReady.click()
  await expect(notReady).toHaveAttribute("aria-pressed", "true")
  await expect(rowsFor(page, project.name)).toHaveText([
    `${project.name}, Release R1`,
  ])
})

test("E2E-RPT-003 filter by target date", async ({ page, project }) => {
  await releaseWithResults(project, { targetInDays: 5 })
  await project.lead.createRelease(project.key, {
    name: "R2",
    status: "planned",
    targetDate: dayFromNow(60),
  })
  await page.goto("/releases")
  await search(page).fill(project.key)
  await expect(rowsFor(page, project.name)).toHaveCount(2)
  await choose(page, "Target date", "Next 7 days")
  await expect(rowsFor(page, project.name)).toHaveText([
    `${project.name}, Release R1`,
  ])
  await expect(page).toHaveURL(/within=7/)
  await choose(page, "Target date", "Any target date")
  await expect(rowsFor(page, project.name)).toHaveCount(2)
})

test("E2E-RPT-004 download the shown releases as CSV", async ({
  page,
  project,
}) => {
  await releaseWithResults(project)
  await page.goto("/releases")
  await search(page).fill(project.key)
  await expect(page).toHaveURL(new RegExp(`q=${project.key}`))
  // The URL changes before the list re-renders (F5): wait for the list.
  await expect(
    page.getByText(/^Showing 1 of \d+ active releases/)
  ).toBeVisible()
  await expect(rowsFor(page, project.name)).toHaveCount(1)
  const download = page.waitForEvent("download")
  await page.getByRole("button", { name: "CSV" }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(
    /^all-releases-\d{4}-\d{2}-\d{2}\.csv$/
  )
  const rows = await readCsv(file)
  expect(rows[0]![0]).toMatch(/^Active releases in every project · as of /)
  expect(rows[1]).toEqual([
    "Project",
    "Release",
    "Ready to ship?",
    "Failing checks",
    "Pass rate %",
    "Tested",
    "Ready cases",
    "Open Critical",
    "Open Major",
    "Target",
    "QA Lead",
  ])
  expect(rows.slice(2)).toHaveLength(1)
  expect(rows[2]!.slice(0, 3)).toEqual([
    project.key,
    "R1",
    expect.stringMatching(/^Not ready/),
  ])
  expect(rows[2]![4]).toBe("66.7")
})

test.describe("as a lead", () => {
  test.use({ role: "lead" })
  test("E2E-RPT-005 a lead's All releases covers the projects they lead", async ({
    page,
    project,
  }) => {
    await releaseWithResults(project)
    await page.goto("/releases")
    await expect(
      page.getByText(/Active releases in the projects you lead/)
    ).toBeVisible()
    await expect(rowsFor(page, project.name)).toHaveText([
      `${project.name}, Release R1`,
    ])
    await expect(rowsFor(page, BASE.name).first()).toBeVisible()
  })
})
