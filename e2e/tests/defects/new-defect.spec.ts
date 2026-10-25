import { BASE, expect, test } from "../../fixtures/index.ts"
import { choose } from "../../fixtures/defects-helpers.ts"

test.describe("as a tester", () => {
  test.use({ role: "tester" })

  test("E2E-DEF-006 an empty new defect highlights what's missing", async ({
    page,
    project,
  }) => {
    await page.goto(`/projects/${project.key}/defects/new`)
    await expect(
      page.getByRole("heading", { level: 1, name: "New defect" })
    ).toBeVisible()
    await page.getByLabel("Title").fill("")
    await page.getByRole("button", { name: "Log defect" }).click()
    await expect(
      page.getByText("Fill in the highlighted fields to log the defect.")
    ).toBeVisible()
    for (const msg of [
      "Give the defect a title",
      "Choose a severity",
      "Add the steps, so someone else can see it happen",
      "Say what actually happens",
    ])
      await expect(page.getByText(msg)).toBeVisible()
    await expect(page.getByLabel("Title")).toBeFocused()
  })

  test("E2E-DEF-007 a tracker link must be a full web address", async ({
    page,
    project,
  }) => {
    await page.goto(`/projects/${project.key}/defects/new`)
    await page.getByLabel(/Tracker link/).fill("jira/PAY-1")
    await page.getByRole("button", { name: "Log defect" }).click()
    await expect(
      page.getByText("Use a full link starting with https://")
    ).toBeVisible()
  })

  test("E2E-DEF-008 log a defect by hand", async ({ page, project }) => {
    const release = await project.lead.createRelease(project.key, {
      name: "3.1",
      status: "in_progress",
    })
    await page.goto(`/projects/${project.key}/defects/new`)
    await page.getByLabel("Title").fill("Receipt shows the wrong currency")
    await choose(page, "Severity", "Minor")
    await page
      .getByLabel("Steps to reproduce")
      .fill("1. Pay in EUR\n2. Open the receipt")
    await page.getByLabel("Actual", { exact: true }).fill("Shows USD")
    await choose(page, "Found in release", release.name)
    await page.getByRole("button", { name: "Log defect" }).click()

    const key = `${project.key}-D-1`
    await expect(page.getByText(`${key} logged as New`)).toBeVisible()
    await expect(page).toHaveURL(`/projects/${project.key}/defects/${key}`)
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Receipt shows the wrong currency",
      })
    ).toBeVisible()
    await expect(page.getByText(/Logged by hand by/)).toBeVisible()
    await expect(page.getByRole("list", { name: "Status history" })).toHaveText(
      "New"
    )
    await expect(
      page.getByRole("complementary", { name: "Fields" })
    ).toContainText(release.name)
  })
})

test.describe("as a viewer", () => {
  test.use({ role: "viewer" })
  test("E2E-DEF-009 viewers can't log defects", async ({ page }) => {
    await page.goto(`/projects/${BASE.key}/defects`)
    await expect(
      page.getByRole("heading", { level: 1, name: "Defects" })
    ).toBeVisible()
    await expect(page.getByRole("link", { name: "New defect" })).toHaveCount(0)
    await page.goto(`/projects/${BASE.key}/defects/new`)
    await expect(
      page.getByRole("heading", { name: "You don't have access to this page" })
    ).toBeVisible()
  })
})
