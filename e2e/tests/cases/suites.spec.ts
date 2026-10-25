import { expect, test } from "../../fixtures/index.ts"
import {
  caseList,
  choose,
  listedTitles,
  suiteNav,
} from "../../fixtures/cases-helpers.ts"

test.use({ role: "lead" })

const suiteButton = (page: import("@playwright/test").Page, name: string) =>
  suiteNav(page).getByRole("button", { name: new RegExp(`^${name}\\s*\\d*$`) })

test("E2E-SUITE-001 create a suite", async ({ page, project }) => {
  await project.tester.createCase(project.key, { title: "Seed case" })
  await page.goto(`/projects/${project.key}/cases`)
  await suiteNav(page).getByRole("button", { name: "New suite" }).click()
  const dialog = page.getByRole("dialog", { name: "New suite" })
  await dialog.getByLabel("Name").fill("Payments")
  await dialog.getByRole("button", { name: "Create suite" }).click()
  await expect(page.getByText("Suite Payments created")).toBeVisible()
  await expect(suiteButton(page, "Payments")).toHaveAttribute(
    "aria-current",
    "true"
  )
})

test("E2E-SUITE-002 add a sub-suite and collapse it", async ({
  page,
  project,
}) => {
  await project.lead.createSuite(project.key, "Payments")
  await page.goto(`/projects/${project.key}/cases`)
  await suiteNav(page)
    .getByRole("button", { name: "Actions for Payments" })
    .click()
  await page.getByRole("menuitem", { name: "Add sub-suite…" }).click()
  const dialog = page.getByRole("dialog", { name: "New suite" })
  await expect(dialog.getByLabel("Inside")).toHaveText(/Payments/)
  await dialog.getByLabel("Name").fill("Refunds")
  await dialog.getByRole("button", { name: "Create suite" }).click()
  await expect(suiteButton(page, "Refunds")).toBeVisible()

  await suiteNav(page)
    .getByRole("button", { name: "Collapse Payments" })
    .click()
  await expect(suiteButton(page, "Refunds")).toBeHidden()
  await suiteNav(page).getByRole("button", { name: "Expand Payments" }).click()
  await expect(suiteButton(page, "Refunds")).toBeVisible()
})

test("E2E-SUITE-003 rename a suite", async ({ page, project }) => {
  await project.lead.createSuite(project.key, "Payments")
  await page.goto(`/projects/${project.key}/cases`)
  await suiteNav(page)
    .getByRole("button", { name: "Actions for Payments" })
    .click()
  await page.getByRole("menuitem", { name: "Rename or move…" }).click()
  const dialog = page.getByRole("dialog", { name: "Edit suite Payments" })
  await dialog.getByLabel("Name").fill("Billing")
  await dialog.getByRole("button", { name: "Save suite" }).click()
  await expect(page.getByText("Suite Billing saved")).toBeVisible()
  await expect(suiteButton(page, "Billing")).toBeVisible()
  await expect(suiteButton(page, "Payments")).toHaveCount(0)
})

test("E2E-SUITE-004 move a sub-suite to the top level", async ({
  page,
  project,
}) => {
  const parent = await project.lead.createSuite(project.key, "Payments")
  await project.lead.createSuite(project.key, "Refunds", parent.id)
  await page.goto(`/projects/${project.key}/cases`)
  await expect(
    suiteNav(page).getByRole("button", { name: "Collapse Payments" })
  ).toBeVisible()
  await suiteNav(page)
    .getByRole("button", { name: "Actions for Refunds" })
    .click()
  await page.getByRole("menuitem", { name: "Rename or move…" }).click()
  const dialog = page.getByRole("dialog", { name: "Edit suite Refunds" })
  await choose(page, dialog.getByLabel("Inside"), "Top level")
  await dialog.getByRole("button", { name: "Save suite" }).click()
  await expect(page.getByText("Suite Refunds saved")).toBeVisible()
  // Payments has no sub-suites left, so nothing to collapse.
  await expect(
    suiteNav(page).getByRole("button", { name: "Collapse Payments" })
  ).toHaveCount(0)
  await expect(suiteButton(page, "Refunds")).toBeVisible()
})

test("E2E-SUITE-005 an empty suite offers to add a case in it", async ({
  page,
  project,
}) => {
  await project.lead.createSuite(project.key, "Empty")
  await project.tester.createCase(project.key, { title: "Elsewhere" })
  await page.goto(`/projects/${project.key}/cases`)
  await suiteButton(page, "Empty").click()
  await expect(page.getByText("No test cases in Empty yet")).toBeVisible()
  await page.getByText("New case in this suite").click()
  await expect(page).toHaveURL(/\/cases\/new\?suite=/)
  await expect(
    page.getByRole("button", { name: "Create test case" })
  ).toBeVisible()
  await expect(
    page.getByRole("combobox", { name: "Suite", exact: true })
  ).toHaveText(/Empty/)
})

test("E2E-SUITE-006 archiving a suite archives its cases", async ({
  page,
  project,
}) => {
  const legacy = await project.lead.createSuite(project.key, "Legacy")
  await project.tester.createCase(project.key, {
    title: "Old one",
    suiteId: legacy.id,
  })
  await project.tester.createCase(project.key, {
    title: "Old two",
    suiteId: legacy.id,
  })
  await project.tester.createCase(project.key, { title: "Keeps going" })
  await page.goto(`/projects/${project.key}/cases`)
  await suiteNav(page)
    .getByRole("button", { name: "Actions for Legacy" })
    .click()
  await page.getByRole("menuitem", { name: "Archive suite…" }).click()
  const confirm = page.getByRole("alertdialog", {
    name: "Archive suite Legacy?",
  })
  await expect(confirm).toContainText("Its 2 test cases are archived with it")
  await confirm
    .getByRole("button", { name: "Archive suite and 2 cases" })
    .click()
  await expect(page.getByText("Suite Legacy archived")).toBeVisible()
  await expect(suiteButton(page, "Legacy")).toHaveCount(0)
  await choose(page, page.getByRole("combobox", { name: "Status" }), "Archived")
  await expect
    .poll(async () => (await listedTitles(page)).sort())
    .toEqual(["Old one", "Old two"])
})

test("E2E-SUITE-007 suite names can't contain path separators", async ({
  page,
  project,
}) => {
  await project.tester.createCase(project.key, { title: "Seed case" })
  await page.goto(`/projects/${project.key}/cases`)
  await suiteNav(page).getByRole("button", { name: "New suite" }).click()
  const dialog = page.getByRole("dialog", { name: "New suite" })
  await dialog.getByLabel("Name").fill("A / B")
  await dialog.getByRole("button", { name: "Create suite" }).click()
  await expect(
    dialog.getByText("Suite names can't contain / › or >")
  ).toBeVisible()
})

test.describe("as a tester", () => {
  test.use({ role: "tester" })
  test("E2E-SUITE-008 testers can't archive suites", async ({
    page,
    project,
  }) => {
    await project.lead.createSuite(project.key, "Payments")
    await page.goto(`/projects/${project.key}/cases`)
    await suiteNav(page)
      .getByRole("button", { name: "Actions for Payments" })
      .click()
    await expect(
      page.getByRole("menuitem", { name: "Rename or move…" })
    ).toBeVisible()
    await expect(
      page.getByRole("menuitem", { name: "Add sub-suite…" })
    ).toBeVisible()
    await expect(
      page.getByRole("menuitem", { name: "Archive suite…" })
    ).toHaveCount(0)
  })
})

test("E2E-SUITE-009 no suite lists cases outside any suite", async ({
  page,
  project,
}) => {
  const s = await project.lead.createSuite(project.key, "Payments")
  await project.tester.createCase(project.key, {
    title: "In a suite",
    suiteId: s.id,
  })
  await project.tester.createCase(project.key, { title: "Loose case" })
  await page.goto(`/projects/${project.key}/cases`)
  await expect(caseList(page)).toContainText("In a suite")
  await suiteNav(page)
    .getByRole("button", { name: /^No suite/ })
    .click()
  await expect.poll(() => listedTitles(page)).toEqual(["Loose case"])
})
