import { BASE, expect, test } from "../../fixtures/index.ts"
import {
  choose,
  defectLinks,
  manualDefect,
} from "../../fixtures/defects-helpers.ts"
import { displayName } from "../../fixtures/roles.ts"

const [CRITICAL, VOUCHER, , CLOSED] = BASE.defects

test.describe("in E2E Baseline", () => {
  test.use({ role: "viewer" })

  test("E2E-DEF-010 active and closed or rejected tabs split the defects, with counts", async ({
    page,
  }) => {
    await page.goto(`/projects/${BASE.key}/defects`)
    await expect(page.getByRole("tab", { name: "Active (3)" })).toBeVisible()
    await expect(defectLinks(page)).toHaveCount(3)
    await expect(
      defectLinks(page).filter({ hasText: CLOSED.title })
    ).toHaveCount(0)
    await page.getByRole("tab", { name: "Closed or rejected (1)" }).click()
    await expect(defectLinks(page)).toHaveText([CLOSED.title])
  })

  test("E2E-DEF-011 search by ID or title, and clear filters when nothing matches", async ({
    page,
  }) => {
    await page.goto(`/projects/${BASE.key}/defects`)
    const search = page.getByRole("searchbox", {
      name: "Search by ID or title",
    })
    await search.fill("voucher")
    await expect(defectLinks(page)).toHaveText([VOUCHER.title])
    await search.fill(`${BASE.key}-D-1`)
    await expect(defectLinks(page)).toHaveText([CRITICAL.title])
    await search.fill("zzz-no-such-defect")
    await expect(page.getByText("No defects match these filters")).toBeVisible()
    await page.getByRole("button", { name: "Clear filters" }).first().click()
    await expect(defectLinks(page)).toHaveCount(3)
    await expect(search).toHaveValue("")
  })

  test("E2E-DEF-012 filter by status and severity", async ({ page }) => {
    await page.goto(`/projects/${BASE.key}/defects`)
    await choose(page, "Status", "Open")
    await expect(defectLinks(page)).toHaveText([VOUCHER.title])
    await choose(page, "Status", "Any status")
    await choose(page, "Severity", "Critical")
    await expect(defectLinks(page)).toHaveText([CRITICAL.title])
  })

  test("E2E-DEF-015 sort by severity puts critical first", async ({ page }) => {
    await page.goto(`/projects/${BASE.key}/defects`)
    await expect(defectLinks(page).first()).not.toHaveText(CRITICAL.title)
    await choose(page, "Sort", "Sort: Severity")
    await expect(defectLinks(page).first()).toHaveText(CRITICAL.title)
  })

  test("E2E-DEF-017 filters live in the address, so reload and links keep them", async ({
    page,
  }) => {
    await page.goto(`/projects/${BASE.key}/defects`)
    await choose(page, "Severity", "Critical")
    await expect(page).toHaveURL(/severity=critical/)
    await page.reload()
    await expect(
      page.getByRole("combobox", { name: "Severity" })
    ).toContainText("Critical")
    await expect(defectLinks(page)).toHaveText([CRITICAL.title])
  })

  test("E2E-DEF-019 on a phone the list folds status and severity under the title @mobile", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Phone layout only")
    await page.goto(`/projects/${BASE.key}/defects`)
    const row = page.getByRole("row").filter({ hasText: CRITICAL.title })
    await expect(row).toContainText("New")
    await expect(row).toContainText("Critical")
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})

test.describe("in a project of its own", () => {
  test.use({ role: "tester" })

  test("E2E-DEF-013 filter by priority, assignee, reporter and release", async ({
    page,
    project,
    slot,
  }) => {
    const release = await project.lead.createRelease(project.key, {
      name: "5.0",
      status: "in_progress",
    })
    const mine = await manualDefect(project.tester, project.key, {
      title: "Mine: assigned and high",
      assigneeId: project.ids.tester,
    })
    await project.lead.patch(`/projects/${project.key}/defects/${mine.key}`, {
      priority: "high",
      version: mine.version,
    })
    await manualDefect(project.lead, project.key, {
      title: "Lead's: in release 5.0",
      foundInReleaseId: release.id,
    })
    await page.goto(`/projects/${project.key}/defects`)
    await expect(defectLinks(page)).toHaveCount(2)

    await choose(page, "Priority", "High")
    await expect(defectLinks(page)).toHaveText([mine.title])
    await choose(page, "Priority", "Any priority")
    await choose(page, "Assignee", displayName("tester", slot))
    await expect(defectLinks(page)).toHaveText([mine.title])
    await choose(page, "Assignee", "Any assignee")
    await choose(page, "Reported by", "Me")
    await expect(defectLinks(page)).toHaveText([mine.title])
    await choose(page, "Reported by", "Anyone reported")
    await choose(page, "Found in release", "5.0")
    await expect(defectLinks(page)).toHaveText(["Lead's: in release 5.0"])
  })

  test("E2E-DEF-014 assigned to me shows only my defects", async ({
    page,
    project,
  }) => {
    const mine = await manualDefect(project.tester, project.key, {
      assigneeId: project.ids.tester,
    })
    await manualDefect(project.tester, project.key)
    await page.goto(`/projects/${project.key}/defects`)
    await expect(defectLinks(page)).toHaveCount(2)
    const toggle = page.getByRole("button", { name: "Assigned to me" })
    await toggle.click()
    await expect(toggle).toHaveAttribute("aria-pressed", "true")
    await expect(defectLinks(page)).toHaveText([mine.title])
  })

  test("E2E-DEF-016 leads see new defects waiting for triage", async ({
    page,
    project,
    as,
  }) => {
    const fresh = await manualDefect(project.tester, project.key)
    await page.goto(`/projects/${project.key}/defects`)
    await expect(defectLinks(page)).toHaveText([fresh.title])
    await expect(page.getByText(/waiting for triage/)).toHaveCount(0)

    const lead = await as("lead")
    await lead.page.goto(`/projects/${project.key}/defects`)
    await expect(lead.page.getByText("1 new defect is")).toBeVisible()
    await lead.page.getByRole("button", { name: "Show new defects" }).click()
    await expect(
      lead.page.getByRole("combobox", { name: "Status" })
    ).toContainText("New")
    await expect(lead.page).toHaveURL(/status=new/)
  })

  test("E2E-DEF-018 a project with no defects explains where they come from", async ({
    page,
    project,
  }) => {
    await page.goto(`/projects/${project.key}/defects`)
    await expect(
      page.getByRole("heading", { name: "No defects yet" })
    ).toBeVisible()
    await expect(page.getByText("Go to test runs")).toBeVisible()
    await page.getByText("Log one by hand").click()
    await expect(page).toHaveURL(`/projects/${project.key}/defects/new`)
  })
})
