import { BASE, expect, test } from "../../fixtures/index.ts"
import {
  caseList,
  choose,
  editCase,
  listedTitles,
} from "../../fixtures/cases-helpers.ts"
import { e2eEnv } from "../../fixtures/env.ts"
import { displayName } from "../../fixtures/roles.ts"

const CASES = `/projects/${BASE.key}/cases`

test.describe("read-only list of E2E Baseline", () => {
  test.use({ role: "tester" })

  test("E2E-CASE-001 the list shows the project's active cases and suites", async ({
    page,
  }) => {
    await page.goto(CASES)
    await expect(
      page.getByRole("heading", { level: 1, name: "Test cases" })
    ).toBeVisible()
    await expect(page.getByText("30 active cases in 3 suites")).toBeVisible()
    await expect(page.getByText("Showing 1 to 25 of 30 cases")).toBeVisible()
  })

  test("E2E-CASE-002 search by title narrows the list", async ({ page }) => {
    await page.goto(CASES)
    await page.getByLabel("Search by ID or title").fill("case 07")
    await expect.poll(() => listedTitles(page)).toEqual(["Sign-in case 07"])
    await expect(page).toHaveURL(/q=case(\+|%20)07/)
  })

  test("E2E-CASE-003 search by case ID finds that case", async ({ page }) => {
    await page.goto(CASES)
    await page.getByLabel("Search by ID or title").fill(`${BASE.key}-TC-5`)
    await expect.poll(() => listedTitles(page)).toEqual(["Checkout case 05"])
  })

  test("E2E-CASE-004 filter by status shows only drafts", async ({ page }) => {
    await page.goto(CASES)
    await choose(page, page.getByRole("combobox", { name: "Status" }), "Draft")
    await expect(
      page.getByText(
        `Showing 1 to ${BASE.draftCases} of ${BASE.draftCases} cases`
      )
    ).toBeVisible()
    await expect(
      caseList(page).getByRole("table").getByText("Ready", { exact: true })
    ).toHaveCount(0)
  })

  test("E2E-CASE-005 filter by priority", async ({ page }) => {
    await page.goto(CASES)
    await choose(
      page,
      page.getByRole("combobox", { name: "Priority" }),
      "Critical"
    )
    await expect(page.getByText("Showing 1 to 8 of 8 cases")).toBeVisible()
    await expect(page).toHaveURL(/priority=critical/)
  })

  test("E2E-CASE-006 filter by type", async ({ page }) => {
    await page.goto(CASES)
    await choose(page, page.getByRole("combobox", { name: "Type" }), "Security")
    await expect(page.getByText("Showing 1 to 6 of 6 cases")).toBeVisible()
  })

  test("E2E-CASE-007 filter by label", async ({ page }) => {
    await page.goto(CASES)
    await choose(page, page.getByRole("combobox", { name: "Label" }), "smoke")
    await expect(page.getByText("Showing 1 to 10 of 10 cases")).toBeVisible()
  })

  test("E2E-CASE-008 the Archived status shows archived cases only", async ({
    page,
  }) => {
    await page.goto(CASES)
    await choose(
      page,
      page.getByRole("combobox", { name: "Status" }),
      "Archived"
    )
    await expect.poll(() => listedTitles(page)).toEqual([BASE.archivedCase])
    await expect(
      caseList(page)
        .getByRole("table")
        .getByText("Archived", { exact: true })
        .filter({ visible: true })
    ).toHaveCount(1)
  })

  test("E2E-CASE-009 sort by title", async ({ page }) => {
    await page.goto(CASES)
    await choose(
      page,
      page.getByRole("combobox", { name: "Sort" }),
      "Sort: Title"
    )
    await expect
      .poll(async () => (await listedTitles(page))[0])
      .toBe("Account case 02")
  })

  test("E2E-CASE-010 no matches shows an empty state with Clear filters", async ({
    page,
  }) => {
    await page.goto(CASES)
    await page.getByLabel("Search by ID or title").fill("zzz nothing like this")
    await expect(
      page.getByText("No test cases match these filters")
    ).toBeVisible()
    await page.getByRole("button", { name: "Clear filters" }).click()
    await expect(page.getByText("Showing 1 to 25 of 30 cases")).toBeVisible()
  })

  test("E2E-CASE-011 pagination moves through the list", async ({ page }) => {
    await page.goto(`${CASES}?pageSize=10`)
    await expect(page.getByText("Showing 1 to 10 of 30 cases")).toBeVisible()
    await expect(page.getByText("Page 1 of 3")).toBeVisible()
    await page.getByRole("link", { name: "Go to next page" }).click()
    await expect(page.getByText("Showing 11 to 20 of 30 cases")).toBeVisible()
    await expect(page.getByText("Page 2 of 3")).toBeVisible()
    await expect(page).toHaveURL(/page=2/)
  })

  test("E2E-CASE-012 filters are kept in the address and survive a reload", async ({
    page,
  }) => {
    await page.goto(CASES)
    await page.getByLabel("Search by ID or title").fill("case 0")
    await expect(page.getByText("Showing 1 to 9 of 9 cases")).toBeVisible()
    await choose(page, page.getByRole("combobox", { name: "Priority" }), "High")
    await expect(page.getByText("Showing 1 to 2 of 2 cases")).toBeVisible()
    await expect(page).toHaveURL(/priority=high/)
    await expect(page).toHaveURL(/q=case(\+|%20)0/)
    await page.reload()
    await expect(page.getByText("Showing 1 to 2 of 2 cases")).toBeVisible()
    await expect(page.getByLabel("Search by ID or title")).toHaveValue("case 0")
    await expect(page.getByRole("combobox", { name: "Priority" })).toHaveText(
      /High/
    )
  })

  test("E2E-CASE-014 selecting a title opens its preview beside the list", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Wide screens only")
    // The preview sits beside the list from 1600px; narrower, it's a sheet.
    await page.setViewportSize({ width: 1680, height: 900 })
    await page.goto(CASES)
    await caseList(page)
      .getByRole("link", { name: "Checkout case 01", exact: true })
      .click()
    const preview = page.getByRole("complementary", {
      name: "Test case preview",
    })
    await expect(
      preview.getByRole("heading", { name: "Checkout case 01" })
    ).toBeVisible()
    await expect(preview).toContainText("Open the checkout page")
    await expect(preview).toContainText("The basket is shown")
    await preview.getByRole("button", { name: "Close preview" }).click()
    await expect(preview).toBeHidden()
  })

  test("E2E-CASE-015 open a case as a full page from its preview", async ({
    page,
  }) => {
    await page.goto(CASES)
    await caseList(page)
      .getByRole("link", { name: "Checkout case 01", exact: true })
      .click()
    await page
      .getByRole("dialog", { name: "Test case preview" })
      .getByLabel(`Open ${BASE.key}-TC-1 as a full page`)
      .click()
    await expect(page).toHaveURL(`${CASES}/${BASE.key}-TC-1`)
    await expect(
      page.getByRole("heading", { level: 1, name: "Checkout case 01" })
    ).toBeVisible()
    await expect(
      page
        .getByRole("navigation", { name: "breadcrumb" })
        .getByRole("link", { name: "Test cases" })
    ).toBeVisible()
  })

  test("E2E-CASE-016 an unknown case ID shows not found", async ({ page }) => {
    await page.goto(`${CASES}/${BASE.key}-TC-999`)
    await expect(page.getByText("Test case not found")).toBeVisible()
  })

  test("E2E-CASE-017 copy link puts the case's address on the clipboard", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Desktop clipboard")
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"], {
        origin: e2eEnv.baseURL,
      })
    await page.goto(`${CASES}/${BASE.key}-TC-1`)
    await page
      .getByRole("button", { name: `Copy link to ${BASE.key}-TC-1` })
      .click()
    await expect(
      page.getByText(`Link to ${BASE.key}-TC-1 copied`)
    ).toBeVisible()
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied).toBe(`${e2eEnv.baseURL}${CASES}/${BASE.key}-TC-1`)
  })

  test("E2E-CASE-019 on a phone the preview opens as a full-width sheet @mobile", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Phone layout only")
    await page.goto(CASES)
    await caseList(page)
      .getByRole("link", { name: "Checkout case 01", exact: true })
      .click()
    const sheet = page.getByRole("dialog", { name: "Test case preview" })
    await expect(
      sheet.getByRole("heading", { name: "Checkout case 01" })
    ).toBeVisible()
    await sheet.getByRole("button", { name: "Close preview" }).click()
    await expect(sheet).toBeHidden()
  })

  test("E2E-CASE-020 on a phone the suite is chosen from a select @mobile", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Phone layout only")
    await page.goto(CASES)
    await choose(
      page,
      page.getByRole("combobox", { name: "Suite" }),
      BASE.suites.checkout
    )
    await expect(page.getByText("Showing 1 to 8 of 8 cases")).toBeVisible()
  })
})

test.describe("as a viewer", () => {
  test.use({ role: "viewer" })
  test("E2E-CASE-013 viewers can read and export but not change test cases", async ({
    page,
  }) => {
    await page.goto(CASES)
    await expect(
      page.getByText(
        "You're a Viewer in this project, so you can read and export test cases"
      )
    ).toBeVisible()
    await expect(page.getByRole("button", { name: "Export" })).toBeVisible()
    await expect(page.getByText("New test case")).toHaveCount(0)
    await expect(page.getByText("Import", { exact: true })).toHaveCount(0)
    await expect(caseList(page).getByRole("checkbox")).toHaveCount(0)
    await expect(page.getByRole("button", { name: "New suite" })).toHaveCount(0)
  })
})

test.describe("history", () => {
  test.use({ role: "tester" })
  test("E2E-CASE-018 history lists who created and changed a case", async ({
    page,
    project,
    slot,
  }) => {
    const created = await project.tester.createCase(project.key, {
      title: "Refund to card",
    })
    await editCase(project.lead, project.key, created.key, {
      title: "Refund to the original card",
    })
    await page.goto(`/projects/${project.key}/cases/${created.key}`)
    await page.getByRole("tab", { name: "History" }).click()
    const history = page.getByRole("tabpanel", { name: "History" })
    await expect(history).toContainText(
      `${displayName("tester", slot)} created this case`
    )
    await expect(history).toContainText(
      `${displayName("lead", slot)} renamed it to “Refund to the original card”`
    )
  })
})
