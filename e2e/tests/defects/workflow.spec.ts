import { expect, test } from "../../fixtures/index.ts"
import {
  manualDefect,
  moveDefect,
  openDefect,
} from "../../fixtures/defects-helpers.ts"

const history = (page: import("@playwright/test").Page) =>
  page.getByRole("list", { name: "Status history" })
const moves = (page: import("@playwright/test").Page) =>
  page.getByRole("group", { name: "Move this defect on" })

test.describe("as a tester", () => {
  test.use({ role: "tester" })

  test("E2E-DEF-026 a new defect waits for a lead; the lead confirms it", async ({
    page,
    project,
    as,
  }) => {
    const d = await manualDefect(project.tester, project.key)
    await openDefect(page, project.key, d.key, d.title)
    await expect(
      page.getByText("Waiting for a QA Lead to confirm it and set a priority.")
    ).toBeVisible()
    await expect(moves(page).getByRole("button")).toHaveCount(0)

    const lead = await as("lead")
    await openDefect(lead.page, project.key, d.key, d.title)
    await moves(lead.page)
      .getByRole("button", { name: "Confirm (Open)" })
      .click()
    await expect(history(lead.page)).toHaveText(/New\s*Open/)
    await expect(
      moves(lead.page).getByRole("button", { name: "Start work" })
    ).toBeFocused()
  })

  test("E2E-DEF-028 start work and mark fixed with the build", async ({
    page,
    project,
  }) => {
    const d = await moveDefect(
      project,
      await manualDefect(project.tester, project.key),
      "open"
    )
    await openDefect(page, project.key, d.key, d.title)
    await moves(page).getByRole("button", { name: "Start work" }).click()
    await expect(history(page)).toHaveText(/In progress$/)
    await moves(page).getByRole("button", { name: "Mark fixed…" }).click()
    await page.getByLabel(/Fixed in build/).fill("4.2.0-rc2")
    await page
      .getByRole("button", { name: "Mark fixed, awaiting retest" })
      .click()
    await expect(history(page)).toHaveText(/Fixed – awaiting retest$/)
    await expect(
      page.getByRole("complementary", { name: "Fields" })
    ).toContainText("4.2.0-rc2")
  })

  test("E2E-DEF-029 close a fixed defect as verified", async ({
    page,
    project,
  }) => {
    const d = await moveDefect(
      project,
      await manualDefect(project.tester, project.key),
      "fixed"
    )
    await openDefect(page, project.key, d.key, d.title)
    await moves(page).getByRole("button", { name: "Verified, close…" }).click()
    await expect(
      page.getByRole("heading", { name: "Close as verified" })
    ).toBeVisible()
    await page.getByRole("button", { name: "Close defect" }).click()
    await expect(history(page)).toHaveText(/Closed$/)
    await expect(
      page.getByText(/Failing again\? Log a new defect/)
    ).toBeVisible()
    await expect(moves(page).getByRole("button")).toHaveCount(0)
  })

  test("E2E-DEF-030 reopening a fixed defect needs a note and counts", async ({
    page,
    project,
  }) => {
    const d = await moveDefect(
      project,
      await manualDefect(project.tester, project.key),
      "fixed"
    )
    await openDefect(page, project.key, d.key, d.title)
    await moves(page)
      .getByRole("button", { name: "Still failing, reopen…" })
      .click()
    await page.getByRole("button", { name: "Reopen defect" }).click()
    await expect(page.getByText("Say what still fails")).toBeVisible()
    await page
      .getByLabel("What still fails? (required)")
      .fill("Still wrong on build 9")
    await page.getByRole("button", { name: "Reopen defect" }).click()
    await expect(history(page)).toHaveText(/Reopened$/)
    await expect(
      page.getByRole("complementary", { name: "Fields" })
    ).toContainText("1×")
    await expect(page.getByRole("region", { name: "Activity" })).toContainText(
      "Still wrong on build 9"
    )
  })
})

test.describe("as a lead", () => {
  test.use({ role: "lead" })

  test("E2E-DEF-027 rejecting as a duplicate needs the original defect", async ({
    page,
    project,
  }) => {
    const original = await manualDefect(project.tester, project.key, {
      title: "Original: receipt total wrong",
    })
    const dup = await manualDefect(project.tester, project.key, {
      title: "Receipt total off by tax",
    })
    await openDefect(page, project.key, dup.key, dup.title)
    await moves(page).getByRole("button", { name: "Reject…" }).click()
    await expect(
      page.getByRole("heading", { name: "Reject this defect" })
    ).toBeVisible()
    await expect(page.getByRole("combobox", { name: "Reason" })).toContainText(
      "Duplicate"
    )
    await page.getByRole("button", { name: "Reject defect" }).click()
    await expect(page.getByText("Choose the original defect")).toBeVisible()
    await page
      .getByLabel("Search the original defect by ID or title")
      .fill(original.key)
    await page.getByRole("radio", { name: new RegExp(original.title) }).check()
    await page.getByRole("button", { name: "Reject defect" }).click()
    await expect(history(page)).toHaveText(/Rejected$/)
    await expect(page.getByText("Resolution: Duplicate")).toBeVisible()
    await page
      .getByRole("link", {
        name: new RegExp(`${original.key}: ${original.title}`),
      })
      .click()
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      original.title
    )
  })

  test("E2E-DEF-031 only a lead reopens a closed or rejected defect", async ({
    page,
    project,
  }) => {
    const d = await moveDefect(
      project,
      await manualDefect(project.tester, project.key),
      "closed"
    )
    await openDefect(page, project.key, d.key, d.title)
    await moves(page).getByRole("button", { name: "Reopen…" }).click()
    await page
      .getByLabel("What still fails? (required)")
      .fill("Customers report it again")
    await page.getByRole("button", { name: "Reopen defect" }).click()
    await expect(history(page)).toHaveText(/Reopened$/)
  })
})
