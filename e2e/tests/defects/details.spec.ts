import { BASE, expect, test } from "../../fixtures/index.ts"
import {
  choose,
  manualDefect,
  openDefect,
} from "../../fixtures/defects-helpers.ts"
import { displayName } from "../../fixtures/roles.ts"

test.describe("as a tester", () => {
  test.use({ role: "tester" })

  test("E2E-DEF-020 edit a defect's details; required text can't be emptied", async ({
    page,
    project,
  }) => {
    const d = await manualDefect(project.tester, project.key)
    await openDefect(page, project.key, d.key, d.title)
    const details = page.getByRole("region", { name: "Details" })
    await details.getByRole("button", { name: "Edit" }).click()
    await details.getByLabel("Steps to reproduce").fill("")
    await details.getByRole("button", { name: "Save details" }).click()
    await expect(
      details.getByText("Steps to reproduce can't be empty")
    ).toBeVisible()
    await details
      .getByLabel("Steps to reproduce")
      .fill("1. Pay\n2. Look at the receipt")
    await details
      .getByLabel("Title")
      .fill("Receipt total is wrong after a refund")
    await details.getByRole("button", { name: "Save details" }).click()
    await expect(page.getByText("Details saved")).toBeVisible()
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Receipt total is wrong after a refund"
    )
  })

  test("E2E-DEF-021 editing over someone else's change says so and can load their version", async ({
    page,
    project,
  }) => {
    const d = await manualDefect(project.tester, project.key)
    await openDefect(page, project.key, d.key, d.title)
    const details = page.getByRole("region", { name: "Details" })
    await details.getByRole("button", { name: "Edit" }).click()
    await project.lead.patch(`/projects/${project.key}/defects/${d.key}`, {
      title: "Their title",
      version: d.version,
    })
    await details.getByLabel("Title").fill("My title")
    await details.getByRole("button", { name: "Save details" }).click()
    await expect(details.getByRole("alert")).toContainText(
      "Your text is still here"
    )
    await details.getByRole("button", { name: "Reload their version" }).click()
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Their title"
    )
  })

  test("E2E-DEF-022 testers change fields; priority is the lead's", async ({
    page,
    project,
  }) => {
    const d = await manualDefect(project.tester, project.key, {
      severity: "major",
    })
    await openDefect(page, project.key, d.key, d.title)
    const fields = page.getByRole("complementary", { name: "Fields" })
    await choose(page, "Severity", /^Critical/)
    await expect(fields.getByRole("status")).toHaveText("Saved")
    await expect(
      fields.getByRole("combobox", { name: "Priority" })
    ).toHaveCount(0)
    await expect(fields).toContainText("Not set yet, set by a QA Lead")
    await page.reload()
    await expect(
      fields.getByRole("combobox", { name: "Severity" })
    ).toContainText("Critical")
  })
})

test.describe("as a lead", () => {
  test.use({ role: "lead" })
  test("E2E-DEF-023 a lead sets priority and assignee; they stay after reload", async ({
    page,
    project,
    slot,
  }) => {
    const d = await manualDefect(project.tester, project.key)
    await openDefect(page, project.key, d.key, d.title)
    const fields = page.getByRole("complementary", { name: "Fields" })
    await choose(page, "Priority", /^High/)
    await expect(fields.getByRole("status")).toHaveText("Saved")
    await choose(page, "Assignee (QA)", displayName("tester", slot))
    await expect(fields.getByRole("status")).toHaveText("Saved")
    await page.reload()
    await expect(
      fields.getByRole("combobox", { name: "Priority" })
    ).toContainText("High")
    await expect(
      fields.getByRole("combobox", { name: "Assignee (QA)" })
    ).toContainText(displayName("tester", slot))
  })
})

test.describe("as a viewer", () => {
  test.use({ role: "viewer" })

  test("E2E-DEF-024 viewers read defects without edit controls", async ({
    page,
  }) => {
    const voucher = BASE.defects[1]
    await openDefect(page, BASE.key, `${BASE.key}-D-2`, voucher.title)
    await expect(
      page.getByText("You're a Viewer in this project")
    ).toBeVisible()
    await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0)
    await expect(
      page.getByRole("group", { name: "Move this defect on" })
    ).toHaveCount(0)
    await expect(
      page.getByRole("textbox", { name: "Add a comment" })
    ).toHaveCount(0)
    await expect(page.getByRole("combobox")).toHaveCount(0)
  })

  test("E2E-DEF-025 an unknown defect key shows not found", async ({
    page,
  }) => {
    await page.goto(`/projects/${BASE.key}/defects/${BASE.key}-D-999`)
    await expect(page.getByText("Defect not found")).toBeVisible()
    await page.getByRole("link", { name: "Back to defects" }).click()
    await expect(page).toHaveURL(`/projects/${BASE.key}/defects`)
  })
})
