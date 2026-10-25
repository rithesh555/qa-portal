import { BASE, expect, test } from "../../fixtures/index.ts"
import { displayName } from "../../fixtures/roles.ts"
import { pickMenu } from "../../fixtures/cases-helpers.ts"
import {
  choose,
  readCsv,
  releaseWithResults,
} from "../../fixtures/defects-helpers.ts"

const reports = (key: string) => `/projects/${key}/reports`
const loaded = (page: import("@playwright/test").Page) =>
  expect(page.getByRole("button", { name: "Download data" })).toBeEnabled()

test.describe("as a tester", () => {
  test.use({ role: "tester" })

  test("E2E-RPT-006 the report opens on the current release; no release can be chosen", async ({
    page,
    project,
  }) => {
    await releaseWithResults(project)
    await page.goto(reports(project.key))
    await expect(page.getByRole("combobox", { name: "Release" })).toContainText(
      "R1 (in progress)"
    )
    await expect(page.getByText(/Release R1 · live, as of/)).toBeVisible()
    await choose(page, "Release", "No release")
    await expect(
      page.getByRole("heading", { name: "No runs for this choice yet" })
    ).toBeVisible()
    await page.getByText("Start a run").click()
    await expect(page).toHaveURL(`/projects/${project.key}/runs/new`)
  })

  test("E2E-RPT-010 download data › defects gives the release's defects as CSV", async ({
    page,
    project,
  }) => {
    const r = await releaseWithResults(project)
    await page.goto(reports(project.key))
    await loaded(page)
    const download = page.waitForEvent("download")
    await pickMenu(
      page,
      page.getByRole("button", { name: "Download data" }),
      "Defects"
    )
    const file = await download
    expect(file.suggestedFilename()).toBe(`${project.key}-r1-defects.csv`)
    const rows = await readCsv(file)
    expect(rows[0]![0]).toMatch(
      new RegExp(`^${project.name} · Release R1 · as of `)
    )
    expect(rows[1]!.slice(0, 5)).toEqual([
      "Defect",
      "Title",
      "Severity",
      "Priority",
      "Status",
    ])
    expect(rows.slice(2).map((row) => row[1])).toEqual([r.defect.title])
  })

  test("E2E-RPT-013 workload is shown to leads only", async ({
    page,
    project,
    as,
    slot,
  }) => {
    await releaseWithResults(project, { leaveUntested: true })
    await page.goto(reports(project.key))
    await loaded(page)
    await expect(page.getByRole("region", { name: "Workload" })).toHaveCount(0)
    const lead = await as("lead")
    await lead.page.goto(reports(project.key))
    const workload = lead.page.getByRole("region", { name: "Workload" })
    await expect(workload).toContainText(displayName("tester", slot))
  })

  test("E2E-RPT-016 the report fits a phone screen @mobile", async ({
    page,
    project,
    isMobile,
  }) => {
    test.skip(!isMobile, "Phone layout only")
    await releaseWithResults(project)
    await page.goto(reports(project.key))
    await expect(
      page.getByRole("region", { name: /Not ready to ship/ })
    ).toBeVisible()
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})

test.describe("as a viewer", () => {
  test.use({ role: "viewer" })

  test("E2E-RPT-007 a shipped release shows its sign-off snapshot, or live numbers", async ({
    page,
  }) => {
    await page.goto(reports(BASE.key))
    await choose(page, "Release", `${BASE.releases.shipped} (released)`)
    const snapshot = page.getByText(
      `snapshot taken when ${BASE.releases.shipped} was released`
    )
    await expect(snapshot).toBeVisible()
    await page
      .getByRole("button", { name: "Show live numbers instead" })
      .click()
    await expect(page).toHaveURL(/live=true/)
    await expect(
      page.getByText("Showing live numbers for a released release")
    ).toBeVisible()
    await page.getByRole("button", { name: "Show the snapshot" }).click()
    await expect(snapshot).toBeVisible()
    await expect(page).not.toHaveURL(/live=true/)
  })

  test("E2E-RPT-011 download the latest result per case and the runs", async ({
    page,
    project,
  }) => {
    const r = await releaseWithResults(project)
    await page.goto(reports(project.key))
    await loaded(page)
    const menu = page.getByRole("button", { name: "Download data" })

    let download = page.waitForEvent("download")
    await pickMenu(page, menu, "Latest result per case")
    let file = await download
    expect(file.suggestedFilename()).toBe(
      `${project.key}-r1-latest-result-per-case.csv`
    )
    let rows = await readCsv(file)
    expect(rows[1]![0]).toBe("Case")
    expect(
      rows
        .slice(2)
        .map((row) => row[5])
        .sort()
    ).toEqual(["failed", "passed", "passed"])

    await expect(menu).toBeEnabled()
    download = page.waitForEvent("download")
    await pickMenu(page, menu, "Runs")
    file = await download
    expect(file.suggestedFilename()).toBe(`${project.key}-r1-runs.csv`)
    rows = await readCsv(file)
    expect(rows[1]![0]).toBe("Run")
    expect(rows.slice(2).map((row) => row[0])).toEqual([r.runKey])
  })

  test("E2E-RPT-015 viewers read reports and download data, but can't start runs", async ({
    page,
    project,
  }) => {
    await releaseWithResults(project)
    await page.goto(reports(project.key))
    await loaded(page)
    const download = page.waitForEvent("download")
    await pickMenu(
      page,
      page.getByRole("button", { name: "Download data" }),
      "Runs"
    )
    expect((await download).suggestedFilename()).toBe(
      `${project.key}-r1-runs.csv`
    )
    await choose(page, "Release", "No release")
    await expect(
      page.getByRole("heading", { name: "No runs for this choice yet" })
    ).toBeVisible()
    await expect(page.getByText("Start a run")).toHaveCount(0)
  })
})

test.describe("as a lead", () => {
  test.use({ role: "lead" })

  test("E2E-RPT-008 exit checks say whether the release can ship and link to the blockers", async ({
    page,
    project,
  }) => {
    const r = await releaseWithResults(project)
    await page.goto(reports(project.key))
    const ready = page.getByRole("region", {
      name: /Not ready to ship: \d+ of \d+ checks fail/,
    })
    await expect(ready).toBeVisible()
    await ready
      .getByRole("listitem")
      .filter({ hasText: /Critical/ })
      .getByRole("link", { name: "See them" })
      .click()
    await expect(page).toHaveURL(
      new RegExp(
        `/projects/${project.key}/defects\\?releaseId=${r.id}&severity=critical`
      )
    )
    await expect(page.getByRole("link", { name: r.defect.title })).toBeVisible()
  })

  test("E2E-RPT-014 print the one-page release report", async ({
    page,
    project,
  }) => {
    await releaseWithResults(project)
    await page.addInitScript(() => {
      ;(window as unknown as { printed: number }).printed = 0
      window.print = () => {
        ;(window as unknown as { printed: number }).printed++
      }
    })
    await page.goto(reports(project.key))
    await loaded(page)
    await page.getByText("Print report").click()
    await expect(page).toHaveURL(
      new RegExp(`/projects/${project.key}/reports/print\\?release=`)
    )
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      `${project.name} · Release R1`
    )
    await page.getByRole("button", { name: "Print or save as PDF" }).click()
    expect(
      await page.evaluate(
        () => (window as unknown as { printed: number }).printed
      )
    ).toBe(1)

    await page.emulateMedia({ media: "print" })
    await expect(
      page.getByRole("button", { name: "Print or save as PDF" })
    ).toBeHidden()
    await page.emulateMedia({ media: "screen" })
    await page.getByText("Back to reports").click()
    await expect(page).toHaveURL(new RegExp(`/projects/${project.key}/reports`))
    await expect(
      page.getByRole("heading", { level: 1, name: "Reports" })
    ).toBeVisible()
  })
})

test.describe("as an admin", () => {
  test("E2E-RPT-009 key numbers count the latest result per case", async ({
    page,
    project,
  }) => {
    await releaseWithResults(project)
    await page.goto(reports(project.key))
    const numbers = page.getByRole("region", { name: "Key numbers" })
    await expect(numbers).toContainText("Pass rate67%")
    await expect(numbers).toContainText("3 of 3 Ready cases")
    await expect(numbers).toContainText("1 Critical · 0 Major")
  })

  test("E2E-RPT-012 every chart has a table view and its own CSV", async ({
    page,
    project,
  }) => {
    const r = await releaseWithResults(project)
    await page.goto(reports(project.key))
    const card = page.getByRole("region", { name: "Pass rate by run" })
    await card
      .getByRole("button", { name: "Table for pass rate by run" })
      .click()
    await expect(card.getByRole("table")).toContainText(
      r.runKey.slice(project.key.length + 1)
    )
    await expect(
      card.getByRole("button", { name: "Chart for pass rate by run" })
    ).toBeVisible()
    const download = page.waitForEvent("download")
    await card.getByRole("button", { name: "CSV for pass rate by run" }).click()
    const file = await download
    expect(file.suggestedFilename()).toBe(
      `${project.key}-r1-pass-rate-by-run.csv`
    )
    const rows = await readCsv(file)
    expect(rows.length).toBeGreaterThanOrEqual(3)
  })
})
