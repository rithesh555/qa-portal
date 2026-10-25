import type { Page } from "@playwright/test"
import { EXPORT_HEADERS } from "@qa/shared"
import { BASE, expect, test } from "../../fixtures/index.ts"
import { choose, rowsOfCsv, rowsOfXlsx } from "../../fixtures/cases-helpers.ts"

const CASES = `/projects/${BASE.key}/cases`

async function exportAs(page: Page, format: "Excel (.xlsx)" | "CSV (.csv)") {
  await page.getByRole("button", { name: "Export" }).click()
  const dialog = page.getByRole("dialog", { name: "Export test cases" })
  await dialog
    .getByRole("group", { name: "Format" })
    .getByRole("button", { name: format })
    .click()
  const downloading = page.waitForEvent("download")
  await dialog.getByRole("button", { name: "Download" }).click()
  return downloading
}

test.describe("as a tester", () => {
  test.use({ role: "tester" })

  test("E2E-EXP-001 export the filtered list as Excel", async ({ page }) => {
    await page.goto(CASES)
    await choose(page, page.getByRole("combobox", { name: "Label" }), "smoke")
    await expect(page.getByText("Showing 1–10 of 10 cases")).toBeVisible()
    const download = await exportAs(page, "Excel (.xlsx)")
    expect(download.suggestedFilename()).toMatch(/^BASE-test-cases-.*\.xlsx$/)
    const rows = await rowsOfXlsx(download)
    expect(rows[0]).toEqual([...EXPORT_HEADERS])
    expect(rows).toHaveLength(11)
    const labels = EXPORT_HEADERS.indexOf("Labels")
    for (const row of rows.slice(1)) expect(row[labels]).toContain("smoke")
    await expect(page.getByText("Exported 10 test cases")).toBeVisible()
  })

  test("E2E-EXP-002 export every case as CSV", async ({ page }) => {
    await page.goto(CASES)
    const download = await exportAs(page, "CSV (.csv)")
    expect(download.suggestedFilename()).toMatch(/\.csv$/)
    const rows = await rowsOfCsv(download)
    expect(rows[0]).toEqual([...EXPORT_HEADERS])
    expect(rows).toHaveLength(BASE.activeCases + 1)
    for (const row of rows.slice(1)) expect(row[0]).toMatch(/^BASE-TC-\d+$/)
  })

  test("E2E-EXP-003 the export dialog says how many cases it exports", async ({
    page,
  }) => {
    await page.goto(CASES)
    await choose(
      page,
      page.getByRole("combobox", { name: "Priority" }),
      "Critical"
    )
    await expect(page.getByText("Showing 1–8 of 8 cases")).toBeVisible()
    await page.getByRole("button", { name: "Export" }).click()
    await expect(
      page.getByRole("dialog", { name: "Export test cases" })
    ).toContainText(
      "Exports the 8 cases that match your current suite, search and filters"
    )
  })
})

test.describe("as a lead", () => {
  test.use({ role: "lead" })

  test("E2E-EXP-004 formula-looking cells are neutralised in CSV exports", async ({
    page,
    project,
  }) => {
    await project.tester.createCase(project.key, { title: "=1+2" })
    await page.goto(`/projects/${project.key}/cases`)
    const rows = await rowsOfCsv(await exportAs(page, "CSV (.csv)"))
    expect(rows[1]![1]).toBe("'=1+2")
  })

  test("E2E-EXP-006 an exported file imports back as new cases", async ({
    page,
    project,
  }, testInfo) => {
    for (const title of [
      "Round trip one",
      "Round trip two",
      "Round trip three",
    ])
      await project.tester.createCase(project.key, { title })
    await page.goto(`/projects/${project.key}/cases`)
    const download = await exportAs(page, "CSV (.csv)")
    const file = testInfo.outputPath(download.suggestedFilename())
    await download.saveAs(file)

    await page.goto(`/projects/${project.key}/cases/import`)
    await page.locator('input[type="file"]').setInputFiles(file)
    await expect(
      page.getByText("IDs are ignored — every row becomes a new case.")
    ).toBeVisible()
    await page.getByRole("button", { name: "Check rows" }).click()
    await page.getByRole("button", { name: "Import 3 test cases" }).click()
    await expect(
      page.getByRole("status").filter({ hasText: "3 test cases imported" })
    ).toBeVisible()
    await expect(page.getByText(`${project.key}-TC-4`)).toBeVisible()
    await expect(page.getByText(`${project.key}-TC-6`)).toBeVisible()
  })
})

test.describe("as a viewer", () => {
  test.use({ role: "viewer" })
  test("E2E-EXP-005 viewers can export @mobile", async ({ page }) => {
    await page.goto(CASES)
    const download = await exportAs(page, "CSV (.csv)")
    expect((await rowsOfCsv(download)).length).toBe(BASE.activeCases + 1)
  })
})
