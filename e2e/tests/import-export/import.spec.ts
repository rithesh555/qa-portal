import type { Page } from "@playwright/test"
import { BASE, expect, test, type TestProject } from "../../fixtures/index.ts"
import {
  choose,
  rowsOfCsv,
  rowsOfXlsx,
  SAMPLES,
} from "../../fixtures/cases-helpers.ts"

// Imports are limited per person (10 a minute): one at a time, spread over roles.
test.describe.configure({ mode: "serial" })

const importPage = (project: TestProject) =>
  `/projects/${project.key}/cases/import`
const fileInput = (page: Page) => page.locator('input[type="file"]')
const csv = (name: string, text: string) => ({
  name,
  mimeType: "text/csv",
  buffer: Buffer.from(text, "utf8"),
})
const SMALL = csv(
  "small.csv",
  "Title,Steps\nFirst imported,1. Do it\nSecond imported,1. Do that\n"
)

/** Upload → Check rows → Import; returns at the Done step. */
async function importFile(
  page: Page,
  file: string | ReturnType<typeof csv>,
  count: number
) {
  await fileInput(page).setInputFiles(file)
  await page.getByRole("button", { name: "Check rows" }).click()
  await page
    .getByRole("button", {
      name: `Import ${count} test ${count === 1 ? "case" : "cases"}`,
    })
    .click()
  await expect(
    page.getByRole("status").filter({
      hasText: `${count} test ${count === 1 ? "case" : "cases"} imported`,
    })
  ).toBeVisible()
}

test.describe("as a lead", () => {
  test.use({ role: "lead" })

  test("E2E-IMP-001 uploading the sample file matches its columns", async ({
    page,
    project,
  }) => {
    await page.goto(importPage(project))
    await expect(
      page.getByRole("heading", { level: 1, name: "Import test cases" })
    ).toBeVisible()
    await fileInput(page).setInputFiles(SAMPLES.clean)
    const map = page.getByRole("region", { name: "Match columns" })
    await expect(map).toBeVisible()
    await expect(
      map.getByRole("combobox", { name: "Title imports as" })
    ).toHaveText(/Title \(required\)/)
    for (const field of ["Suite", "Priority", "Steps", "Expected results"])
      await expect(
        map.getByRole("combobox", { name: `${field} imports as` })
      ).toHaveText(new RegExp(field))
  })

  test("E2E-IMP-002 import the sample file end to end", async ({
    page,
    project,
  }) => {
    await page.goto(importPage(project))
    await fileInput(page).setInputFiles(SAMPLES.clean)
    await page.getByRole("button", { name: "Check rows" }).click()
    const check = page.getByRole("region", { name: "Check rows" })
    await expect(check.getByText("40 rows ready")).toBeVisible()
    await check.getByRole("button", { name: "Import 40 test cases" }).click()
    await expect(
      page.getByRole("status").filter({ hasText: "40 test cases imported" })
    ).toBeVisible()
    await expect(page.getByText(`${project.key}-TC-1`)).toBeVisible()
    await expect(page.getByText(`${project.key}-TC-40`)).toBeVisible()
    await expect(page.getByText(/New suites: /)).toBeVisible()
    await page.getByText("View imported cases").click()
    await expect(page).toHaveURL(`/projects/${project.key}/cases`)
    await expect(
      page.getByText(/^40 active cases in \d+ suites$/)
    ).toBeVisible()
  })

  test("E2E-IMP-007 archive an import straight after, then restore it", async ({
    page,
    project,
  }) => {
    await page.goto(importPage(project))
    await importFile(page, SMALL, 2)
    await page.getByRole("button", { name: "Archive this import…" }).click()
    const dialog = page.getByRole("alertdialog", {
      name: "Archive every case from import #1?",
    })
    await dialog.getByRole("button", { name: "Archive import" }).click()
    await expect(
      page.getByRole("status").filter({ hasText: "Import #1 archived" })
    ).toBeVisible()
    await page.getByRole("button", { name: "Restore import" }).click()
    await expect(page.getByText("Import #1 restored")).toBeVisible()
    await expect(
      page.getByRole("status").filter({ hasText: "2 test cases imported" })
    ).toBeVisible()
    const list = await project.lead.get<{ total: number }>(
      `/projects/${project.key}/cases`
    )
    expect(list.total).toBe(2)
  })
})

test.describe("as a tester", () => {
  test.use({ role: "tester" })

  async function uploadProblems(page: Page, project: TestProject) {
    await page.goto(importPage(project))
    await fileInput(page).setInputFiles(SAMPLES.problems)
    await expect(
      page.getByRole("heading", { name: "Values to match" })
    ).toBeVisible()
  }

  test("E2E-IMP-003 other tools' values are matched, and errors block the import", async ({
    page,
    project,
  }) => {
    await uploadProblems(page, project)
    for (const value of ["Urgent", "P1", "P2", "Blocker"])
      await expect(
        page.getByRole("combobox", { name: `Priority “${value}” becomes` })
      ).toBeVisible()
    await expect(
      page.getByRole("combobox", { name: "Priority “Urgent” becomes" })
    ).toHaveText(/Critical/)
    await choose(
      page,
      page.getByRole("combobox", { name: "Priority “P2” becomes" }),
      "Low"
    )
    await page.getByRole("button", { name: "Check rows" }).click()
    const check = page.getByRole("region", { name: "Check rows" })
    await expect(check.getByText("4 rows with errors")).toBeVisible()
    await expect(check.getByText("Fix 4 rows before importing")).toBeVisible()
    // F25: a blocked import doesn't promise a count; it points at the fix.
    const importButton = check.getByRole("button", {
      name: "Import test cases",
    })
    await expect(importButton).toBeDisabled()
    await expect(importButton).toHaveAccessibleDescription(
      /Fix 4 rows before importing/
    )
    await expect(
      check.getByRole("row", { name: /Upgrade plan charges the difference/ })
    ).toContainText("Low")
  })

  test("E2E-IMP-004 only rows with problems narrows the check table", async ({
    page,
    project,
  }) => {
    await uploadProblems(page, project)
    await page.getByRole("button", { name: "Check rows" }).click()
    const check = page.getByRole("region", { name: "Check rows" })
    await expect(
      check.getByRole("row", { name: /Pay with Apple Pay on Safari/ })
    ).toBeVisible()
    await check
      .getByRole("checkbox", { name: "Only rows with problems" })
      .check()
    await expect(
      check.getByText("Showing rows with errors or warnings.")
    ).toBeVisible()
    await expect(
      check.getByRole("row", { name: /Pay with Apple Pay on Safari/ })
    ).toHaveCount(0)
    await expect(
      check.getByRole("row", { name: /Apple Pay on iPad/ })
    ).toBeVisible()
  })

  test("E2E-IMP-005 rows with errors can be downloaded to fix", async ({
    page,
    project,
  }) => {
    await uploadProblems(page, project)
    await page.getByRole("button", { name: "Check rows" }).click()
    const downloading = page.waitForEvent("download")
    await page
      .getByRole("button", { name: "Download rows with errors (.csv)" })
      .click()
    const download = await downloading
    expect(download.suggestedFilename()).toBe(
      "test-cases-with-problems-rows-with-errors.csv"
    )
    const rows = await rowsOfCsv(download)
    expect(rows).toHaveLength(5)
    expect(rows.slice(1).map((r) => r.join(" "))).toEqual(
      expect.arrayContaining([expect.stringContaining("Apple Pay on iPad")])
    )
  })

  test("E2E-IMP-006 column matching refuses duplicates and a missing title", async ({
    page,
    project,
  }) => {
    await page.goto(importPage(project))
    await fileInput(page).setInputFiles(SAMPLES.clean)
    await choose(
      page,
      page.getByRole("combobox", { name: "Suite imports as" }),
      "Title (required)"
    )
    await expect(
      page.getByText("Another column already imports as this.").first()
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Check rows" })
    ).toBeDisabled()
    await choose(
      page,
      page.getByRole("combobox", { name: "Suite imports as" }),
      "Suite"
    )
    await choose(
      page,
      page.getByRole("combobox", { name: "Title imports as" }),
      "— Don't import —"
    )
    await expect(
      page.getByText("Choose which column holds the Title.")
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Check rows" })
    ).toBeDisabled()
  })

  test("E2E-IMP-009 leaving an import half-way asks first", async ({
    page,
    project,
  }) => {
    await page.goto(importPage(project))
    await fileInput(page).setInputFiles(SMALL)
    await expect(
      page.getByRole("region", { name: "Match columns" })
    ).toBeVisible()
    const runs = page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Test runs", exact: true })
    await runs.click()
    const ask = page.getByRole("alertdialog", { name: "Leave the import?" })
    await ask.getByRole("button", { name: "Stay" }).click()
    await expect(
      page.getByRole("region", { name: "Match columns" })
    ).toBeVisible()
    await runs.click()
    await page
      .getByRole("alertdialog", { name: "Leave the import?" })
      .getByRole("button", { name: "Leave" })
      .click()
    await expect(page).toHaveURL(`/projects/${project.key}/runs`)
  })

  test("E2E-IMP-010 files that aren't CSV or Excel are refused", async ({
    page,
    project,
  }) => {
    await page.goto(importPage(project))
    await fileInput(page).setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("hello"),
    })
    const alert = page
      .getByRole("alert")
      .filter({ hasText: "Couldn't use that file" })
    await expect(alert).toContainText("Choose a .csv or .xlsx file.")
  })

  test("E2E-IMP-011 the import templates download with the right columns", async ({
    page,
    project,
  }) => {
    await page.goto(importPage(project))
    const xlsx = page.waitForEvent("download")
    await page
      .getByRole("button", { name: "Download template (.xlsx)" })
      .click()
    const xlsxRows = await rowsOfXlsx(await xlsx)
    const csvDl = page.waitForEvent("download")
    await page.getByRole("button", { name: "Template (.csv)" }).click()
    const csvRows = await rowsOfCsv(await csvDl)
    for (const rows of [xlsxRows, csvRows]) {
      expect(rows).toHaveLength(1)
      expect(rows[0]).toEqual(
        expect.arrayContaining(["Title", "Suite", "Steps", "Expected results"])
      )
    }
  })

  test("E2E-IMP-014 a formula-looking title is imported as plain text", async ({
    page,
    project,
  }) => {
    await page.goto(importPage(project))
    await importFile(
      page,
      csv("formula.csv", 'Title,Steps\n"=1+2",1. Check the title\n'),
      1
    )
    const list = await project.tester.get<{ items: { title: string }[] }>(
      `/projects/${project.key}/cases`
    )
    expect(list.items.map((c) => c.title)).toEqual(["=1+2"])
  })
})

test.describe("as an admin", () => {
  test.use({ role: "admin" })

  test("E2E-IMP-008 recent imports can be archived and restored later", async ({
    page,
    project,
  }) => {
    await project.admin.post(`/projects/${project.key}/imports`, {
      fileName: "earlier.csv",
      defaultSuiteId: null,
      rows: [{ row: 2, title: "From an earlier import", steps: "1. Do it" }],
    })
    await page.goto(importPage(project))
    const recent = page.getByRole("region", { name: "Recent imports" })
    const item = recent.getByRole("listitem").filter({ hasText: "Import #1" })
    await expect(item).toContainText("earlier.csv")
    await item.getByRole("button", { name: "Archive this import…" }).click()
    await page
      .getByRole("alertdialog", { name: "Archive every case from import #1?" })
      .getByRole("button", { name: "Archive import" })
      .click()
    await expect(page.getByText("Import #1 archived")).toBeVisible()
    await expect(item).toContainText("Archived")
    await item.getByRole("button", { name: "Restore this import…" }).click()
    await page
      .getByRole("alertdialog", { name: "Restore import #1?" })
      .getByRole("button", { name: "Restore import" })
      .click()
    await expect(page.getByText("Import #1 restored")).toBeVisible()
    await expect(
      item.getByRole("button", { name: "Archive this import…" })
    ).toBeVisible()
  })

  test("E2E-IMP-013 rows without a suite go to the chosen suite", async ({
    page,
    project,
  }) => {
    const inbox = await project.lead.createSuite(project.key, "Inbox")
    await page.goto(importPage(project))
    await choose(page, page.getByLabel("Rows without a suite go to"), "Inbox")
    await importFile(page, SMALL, 2)
    const inSuite = await project.admin.get<{ total: number }>(
      `/projects/${project.key}/cases?suite=${inbox.id}`
    )
    expect(inSuite.total).toBe(2)
  })
})

test.describe("as a viewer", () => {
  test.use({ role: "viewer" })
  test("E2E-IMP-012 viewers can't import", async ({ page }) => {
    await page.goto(`/projects/${BASE.key}/cases/import`)
    await expect(
      page.getByText("You can't import test cases here")
    ).toBeVisible()
    await expect(page.getByRole("button", { name: "Choose file" })).toHaveCount(
      0
    )
  })
})
