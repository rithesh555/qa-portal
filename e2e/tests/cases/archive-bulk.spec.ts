import type { Page } from "@playwright/test"
import { expect, test, type TestProject } from "../../fixtures/index.ts"
import { caseList, choose, getCase } from "../../fixtures/cases-helpers.ts"

test.use({ role: "lead" })

const casePage = (project: TestProject, ref: string) =>
  `/projects/${project.key}/cases/${ref}`

test("E2E-CASE-034 archive a case with a reason", async ({ page, project }) => {
  const c = await project.tester.createCase(project.key, {
    title: "Pay by cheque",
  })
  await page.goto(casePage(project, c.key))
  await page.getByRole("button", { name: "Archive…" }).click()
  const dialog = page.getByRole("alertdialog", { name: `Archive ${c.key}?` })
  await dialog.getByLabel("Reason").fill("Cheques are no longer accepted")
  await dialog.getByRole("button", { name: "Archive", exact: true }).click()
  await expect(page.getByText(`${c.key} archived`)).toBeVisible()
  await expect(page.getByRole("article")).toContainText(
    "Archived: Cheques are no longer accepted"
  )
  await expect(page.getByText("Edit", { exact: true })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Restore" })).toBeVisible()
})

test("E2E-CASE-035 restore an archived case", async ({ page, project }) => {
  const c = await project.tester.createCase(project.key, {
    title: "Back again",
  })
  await project.lead.post(`/projects/${project.key}/cases/${c.key}/archive`, {
    reason: "",
  })
  await page.goto(casePage(project, c.key))
  await page.getByRole("button", { name: "Restore" }).click()
  await expect(page.getByText(`${c.key} restored`)).toBeVisible()
  await expect(page.getByText("Edit", { exact: true })).toBeVisible()
  expect((await getCase(project.lead, project.key, c.key)).archived).toBe(false)
})

test.describe("as a tester", () => {
  test.use({ role: "tester" })

  test("E2E-CASE-036 testers can edit but not archive cases", async ({
    page,
    project,
  }) => {
    const c = await project.tester.createCase(project.key, {
      title: "Tester's case",
    })
    await page.goto(casePage(project, c.key))
    await expect(page.getByText("Edit", { exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Duplicate" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Archive…" })).toHaveCount(0)
  })

  test("E2E-CASE-037 duplicate a case", async ({ page, project }) => {
    const c = await project.tester.createCase(project.key, {
      title: "Original",
    })
    await page.goto(casePage(project, c.key))
    await page.getByRole("button", { name: "Duplicate" }).click()
    const copy = `${project.key}-TC-2`
    await expect(page.getByText(`${copy} created as a copy`)).toBeVisible()
    await expect(page).toHaveURL(`${casePage(project, copy)}/edit`)
    await page.goto(casePage(project, copy))
    await expect(
      page.getByRole("article").getByRole("link", { name: c.key })
    ).toBeVisible()
  })
})

async function listWithTwoTicked(page: Page, project: TestProject) {
  for (const title of ["Bulk one", "Bulk two", "Bulk three"])
    await project.tester.createCase(project.key, { title, priority: "high" })
  await page.goto(`/projects/${project.key}/cases`)
  await caseList(page)
    .getByRole("checkbox", { name: `Select ${project.key}-TC-1` })
    .check()
  await caseList(page)
    .getByRole("checkbox", { name: `Select ${project.key}-TC-2` })
    .check()
  const bar = page.getByRole("region", { name: "Bulk actions" })
  await expect(bar).toContainText("2 selected")
  return bar
}

test("E2E-CASE-038 bulk set priority", async ({ page, project }) => {
  const bar = await listWithTwoTicked(page, project)
  await bar.getByRole("button", { name: "Set priority…" }).click()
  const dialog = page.getByRole("dialog", {
    name: "Set priority for 2 test cases",
  })
  await choose(page, dialog.getByLabel("Priority"), "Low")
  await dialog.getByRole("button", { name: "Update 2 test cases" }).click()
  await expect(page.getByText("2 test cases updated")).toBeVisible()
  for (const n of [1, 2])
    expect(
      (await getCase(project.lead, project.key, `${project.key}-TC-${n}`))
        .priority
    ).toBe("low")
  expect(
    (await getCase(project.lead, project.key, `${project.key}-TC-3`)).priority
  ).toBe("high")
})

test("E2E-CASE-039 bulk move to a suite", async ({ page, project }) => {
  const suite = await project.lead.createSuite(project.key, "Moved here")
  const bar = await listWithTwoTicked(page, project)
  await bar.getByRole("button", { name: "Move to suite…" }).click()
  const dialog = page.getByRole("dialog", {
    name: "Move to suite for 2 test cases",
  })
  await choose(page, dialog.getByLabel("Suite"), "Moved here")
  await dialog.getByRole("button", { name: "Move 2 test cases" }).click()
  await expect(page.getByText("2 test cases updated")).toBeVisible()
  for (const n of [1, 2])
    expect(
      (await getCase(project.lead, project.key, `${project.key}-TC-${n}`))
        .suiteId
    ).toBe(suite.id)
})

test("E2E-CASE-040 bulk add labels", async ({ page, project }) => {
  const bar = await listWithTwoTicked(page, project)
  await bar.getByRole("button", { name: "Add labels…" }).click()
  const dialog = page.getByRole("dialog", {
    name: "Add labels for 2 test cases",
  })
  await dialog.getByLabel("Labels to add").fill("wallet")
  await dialog.getByLabel("Labels to add").press("Enter")
  await dialog.getByRole("button", { name: "Add to 2 test cases" }).click()
  await expect(page.getByText("2 test cases updated")).toBeVisible()
  for (const n of [1, 2])
    expect(
      (await getCase(project.lead, project.key, `${project.key}-TC-${n}`))
        .labels
    ).toContain("wallet")
})

test("E2E-CASE-041 bulk archive", async ({ page, project }) => {
  const bar = await listWithTwoTicked(page, project)
  await bar.getByRole("button", { name: "Archive…" }).click()
  const dialog = page.getByRole("dialog", { name: "Archive 2 test cases?" })
  await dialog.getByLabel("Reason").fill("Duplicates")
  await dialog.getByRole("button", { name: "Archive 2 test cases" }).click()
  await expect(page.getByText("2 test cases archived")).toBeVisible()
  await expect(page.getByText("Showing 1 to 1 of 1 case")).toBeVisible()
})

test("E2E-CASE-042 select every matching case across pages", async ({
  page,
  project,
}) => {
  for (let i = 1; i <= 12; i++)
    await project.tester.createCase(project.key, { title: `Paged ${i}` })
  await page.goto(`/projects/${project.key}/cases?pageSize=10`)
  await caseList(page)
    .getByRole("checkbox", { name: "Select all on this page" })
    .check()
  const bar = page.getByRole("region", { name: "Bulk actions" })
  await expect(bar).toContainText("10 selected")
  await bar.getByRole("button", { name: "Select all 12 matching" }).click()
  await expect(bar).toContainText("All 12 matching cases selected")
  await bar.getByRole("button", { name: "Clear selection" }).click()
  await expect(bar).toBeHidden()
})
