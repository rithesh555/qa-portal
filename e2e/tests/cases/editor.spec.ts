import type { Page } from "@playwright/test"
import { BASE, expect, test } from "../../fixtures/index.ts"
import {
  choose,
  editCase,
  getCase,
  pickMenu,
  suiteNav,
} from "../../fixtures/cases-helpers.ts"
import { displayName } from "../../fixtures/roles.ts"

test.use({ role: "tester" })

const action = (page: Page, n: number) =>
  page.getByLabel(`Step ${n} action`, { exact: true })
const expected = (page: Page, n: number) =>
  page.getByLabel(`Step ${n} expected result`)
const stepMenu = (page: Page, n: number, item: string) =>
  pickMenu(page, page.getByRole("button", { name: `Step ${n} actions` }), item)
const suiteField = (page: Page) =>
  page.getByRole("combobox", { name: "Suite", exact: true })
const editorReady = (page: Page) =>
  expect(
    page.getByRole("button", { name: /^(Create test case|Save changes)$/ })
  ).toBeVisible()

test("E2E-CASE-021 create a test case with every field", async ({
  page,
  project,
}) => {
  await project.lead.createSuite(project.key, "Checkout")
  await page.goto(`/projects/${project.key}/cases/new`)
  await page.getByLabel("Title").fill("Pay with a saved card")
  await choose(page, suiteField(page), "Checkout")
  await choose(page, page.getByLabel("Priority"), "High")
  await choose(page, page.getByLabel("Type"), "Security")
  await page
    .getByRole("group", { name: "Status" })
    .getByRole("button", { name: "Ready" })
    .click()
  await page.getByLabel("Labels").fill("payments")
  await page.getByLabel("Labels").press("Enter")
  await page.getByLabel("References").fill("PAY-1402")
  await page
    .getByLabel("Preconditions")
    .fill("A customer with a saved Visa card")
  await action(page, 1).fill("Open checkout")
  await expected(page, 1).fill("The saved card is offered")
  await page.getByRole("button", { name: "Add step" }).click()
  await action(page, 2).fill("Pay")
  await expected(page, 2).fill("The order is confirmed")
  await page.getByRole("button", { name: "Create test case" }).click()

  await expect(page.getByText(`${project.key}-TC-1 created`)).toBeVisible()
  await expect(page).toHaveURL(
    `/projects/${project.key}/cases/${project.key}-TC-1`
  )
  const details = page.getByRole("article")
  await expect(details.getByRole("heading", { level: 1 })).toHaveText(
    "Pay with a saved card"
  )
  for (const text of [
    "Checkout",
    "High",
    "Security",
    "Ready",
    "payments",
    "PAY-1402",
    "A customer with a saved Visa card",
    "Open checkout",
    "The order is confirmed",
  ])
    await expect(details).toContainText(text)
})

test("E2E-CASE-022 required fields are checked before saving", async ({
  page,
  project,
}) => {
  await page.goto(`/projects/${project.key}/cases/new`)
  await page.getByRole("button", { name: "Create test case" }).click()
  await expect(page.getByText("Enter a title")).toBeVisible()
  await expect(page.getByText("Describe what the tester does")).toBeVisible()
  await expect(page).toHaveURL(/\/cases\/new$/)
})

test("E2E-CASE-023 save and add another keeps the suite and starts a fresh form", async ({
  page,
  project,
}) => {
  const suite = await project.lead.createSuite(project.key, "Checkout")
  await page.goto(`/projects/${project.key}/cases/new?suite=${suite.id}`)
  await expect(suiteField(page)).toHaveText(/Checkout/)
  await page.getByLabel("Title").fill("First of many")
  await action(page, 1).fill("Do the first thing")
  await page.getByRole("button", { name: "Save and add another" }).click()
  await expect(page.getByText(`${project.key}-TC-1 created`)).toBeVisible()
  await expect(page.getByLabel("Title")).toHaveValue("")
  await expect(page.getByLabel("Title")).toBeFocused()
  await expect(suiteField(page)).toHaveText(/Checkout/)
  await expect(action(page, 1)).toHaveValue("")
})

test("E2E-CASE-024 steps can be inserted, duplicated and reordered from their menu", async ({
  page,
  project,
}) => {
  await page.goto(`/projects/${project.key}/cases/new`)
  await page.getByLabel("Title").fill("Reordered steps")
  await action(page, 1).fill("A")
  await stepMenu(page, 1, "Insert step below")
  await expect(action(page, 2)).toBeFocused()
  await action(page, 2).fill("B")
  await stepMenu(page, 2, "Duplicate step")
  await expect(action(page, 3)).toHaveValue("B")
  await action(page, 3).fill("C")
  await stepMenu(page, 3, "Move up")
  await expect(action(page, 2)).toHaveValue("C")
  await expect(action(page, 3)).toHaveValue("B")
  await stepMenu(page, 1, "Move down")
  await page.getByRole("button", { name: "Create test case" }).click()
  await expect(page).toHaveURL(
    `/projects/${project.key}/cases/${project.key}-TC-1`
  )
  const saved = await getCase(
    project.tester,
    project.key,
    `${project.key}-TC-1`
  )
  expect(saved.steps.map((s) => s.action)).toEqual(["C", "A", "B"])
})

test("E2E-CASE-025 a removed step can be brought back with Undo", async ({
  page,
  project,
}) => {
  const c = await project.tester.createCase(project.key, {
    title: "Three steps",
    steps: [
      { action: "A", expected: "" },
      { action: "B", expected: "b happens" },
      { action: "C", expected: "" },
    ],
  })
  await page.goto(`/projects/${project.key}/cases/${c.key}/edit`)
  await stepMenu(page, 2, "Remove step")
  await expect(
    page
      .locator("p")
      .filter({ hasText: "Step 2 removed." })
      .getByRole("button", { name: "Undo" })
  ).toBeVisible()
  await expect(action(page, 2)).toHaveValue("C")
  await page.getByRole("button", { name: "Undo" }).click()
  await expect(action(page, 2)).toHaveValue("B")
  await expect(expected(page, 2)).toHaveValue("b happens")
  await expect(action(page, 3)).toHaveValue("C")
})

test("E2E-CASE-026 labels are added with Enter, checked and removable", async ({
  page,
  project,
}) => {
  await page.goto(`/projects/${project.key}/cases/new`)
  const labels = page.getByLabel("Labels")
  await labels.fill("UI Flow")
  await labels.press("Enter")
  await expect(
    page.getByRole("button", { name: "Remove label ui-flow" })
  ).toBeVisible()
  await labels.fill("gift card!")
  await labels.press("Enter")
  await expect(
    page.getByText("Use letters, digits, dots, dashes or underscores")
  ).toBeVisible()
  await labels.fill("")
  await page.getByRole("button", { name: "Remove label ui-flow" }).click()
  await expect(
    page.getByRole("button", { name: "Remove label ui-flow" })
  ).toHaveCount(0)
  await expect(labels).toBeFocused()
})

test("E2E-CASE-027 editing a case saves a new version and records it", async ({
  page,
  project,
  slot,
}) => {
  const c = await project.tester.createCase(project.key, { title: "Old title" })
  await page.goto(`/projects/${project.key}/cases/${c.key}/edit`)
  await page.getByLabel("Title").fill("New title")
  await expect(page.getByText("Unsaved changes")).toBeVisible()
  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByText(`${c.key} saved`)).toBeVisible()
  await expect(page.getByText("Version 2")).toBeVisible()
  await expect(page).toHaveURL(`/projects/${project.key}/cases/${c.key}`)
  await expect(page.getByText("· version 2")).toBeVisible()
  await page.getByRole("tab", { name: "History" }).click()
  await expect(page.getByRole("tabpanel", { name: "History" })).toContainText(
    `${displayName("tester", slot)} renamed it to “New title”`
  )
})

test("E2E-CASE-028 leaving the editor with unsaved changes asks first", async ({
  page,
  project,
}) => {
  const c = await project.tester.createCase(project.key, { title: "Guarded" })
  await page.goto(`/projects/${project.key}/cases/${c.key}/edit`)
  await expect(page.getByLabel("Title")).toHaveValue("Guarded")
  await page.getByLabel("Title").fill("Guarded, changed")
  const runs = page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Test runs", exact: true })
  await runs.click()
  const ask = page.getByRole("alertdialog", { name: "Leave without saving?" })
  await expect(ask).toBeVisible()
  await ask.getByRole("button", { name: "Keep editing" }).click()
  await expect(page.getByLabel("Title")).toHaveValue("Guarded, changed")
  await runs.click()
  await page
    .getByRole("alertdialog", { name: "Leave without saving?" })
    .getByRole("button", { name: "Leave" })
    .click()
  await expect(page).toHaveURL(`/projects/${project.key}/runs`)
})

test("E2E-CASE-029 leaving an unchanged editor doesn't ask", async ({
  page,
  project,
}) => {
  const c = await project.tester.createCase(project.key, { title: "Unchanged" })
  await page.goto(`/projects/${project.key}/cases/${c.key}/edit`)
  await expect(page.getByLabel("Title")).toHaveValue("Unchanged")
  await page.getByText("Cancel", { exact: true }).click()
  await expect(page).toHaveURL(`/projects/${project.key}/cases/${c.key}`)
  await expect(page.getByRole("alertdialog")).toHaveCount(0)
})

async function clash(
  page: Page,
  project: import("../../fixtures/index.ts").TestProject
) {
  const c = await project.tester.createCase(project.key, {
    title: "Shared case",
  })
  await page.goto(`/projects/${project.key}/cases/${c.key}/edit`)
  await expect(page.getByLabel("Title")).toHaveValue("Shared case")
  await editCase(project.lead, project.key, c.key, { title: "Their title" })
  await page.getByLabel("Title").fill("My title")
  await page.getByRole("button", { name: "Save changes" }).click()
  return c
}

test("E2E-CASE-030 a save that clashes with someone else's shows both versions", async ({
  page,
  project,
  slot,
}) => {
  await clash(page, project)
  const conflict = page
    .getByRole("alert")
    .filter({ hasText: "saved a newer version" })
  await expect(conflict.getByRole("heading")).toHaveText(
    `${displayName("lead", slot)} saved a newer version (version 2) while you were editing.`
  )
  const row = conflict.getByRole("row", { name: /Title/ })
  await expect(row).toContainText("Their title")
  await expect(row).toContainText("My title")
  await expect(
    page.getByRole("button", { name: "Save changes" })
  ).toBeDisabled()
  await conflict
    .getByRole("button", { name: "Discard mine, load theirs" })
    .click()
  await expect(page.getByText("Loaded their version")).toBeVisible()
  await expect(page.getByLabel("Title")).toHaveValue("Their title")
})

test("E2E-CASE-031 save mine over theirs keeps my change after a clash", async ({
  page,
  project,
}) => {
  const c = await clash(page, project)
  await page.getByRole("button", { name: "Save mine over theirs" }).click()
  await expect(page.getByText(`${c.key} saved`)).toBeVisible()
  await expect(page).toHaveURL(`/projects/${project.key}/cases/${c.key}`)
  expect((await getCase(project.tester, project.key, c.key)).title).toBe(
    "My title"
  )
})

test.describe("as a viewer", () => {
  test.use({ role: "viewer" })
  test("E2E-CASE-032 viewers can't open the editor", async ({ page }) => {
    await page.goto(`/projects/${BASE.key}/cases/new`)
    await expect(page.getByText("You can't edit test cases here")).toBeVisible()
    await expect(page.getByLabel("Title")).toHaveCount(0)
  })
})

test("E2E-CASE-033 starting a case from a suite chooses that suite", async ({
  page,
  project,
}) => {
  await project.lead.createSuite(project.key, "Accounts")
  await project.tester.createCase(project.key, { title: "Seed" })
  await page.goto(`/projects/${project.key}/cases`)
  const accounts = suiteNav(page).getByRole("button", { name: /^Accounts/ })
  await accounts.click()
  await expect(accounts).toHaveAttribute("aria-current", "true")
  await expect(page.getByText("No test cases in Accounts yet")).toBeVisible()
  await page.getByText("New test case", { exact: true }).first().click()
  await expect(page).toHaveURL(/\/cases\/new\?suite=/)
  await editorReady(page)
  await expect(suiteField(page)).toHaveText(/Accounts/)
})
