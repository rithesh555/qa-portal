import { expect, test } from "../../fixtures/index.ts"
import { displayName } from "../../fixtures/roles.ts"
import { choose, currentCase, seedCases } from "../../fixtures/runs-helpers.ts"

test.use({ role: "tester" })

const summary = (page: import("@playwright/test").Page) =>
  page.getByRole("complementary", { name: "Summary" })

test("E2E-RUN-007 start a run with every ready case", async ({
  page,
  project,
}) => {
  await seedCases(project, { ready: 3, drafts: 1 })
  await page.goto(`/projects/${project.key}/runs/new`)
  await page.getByLabel("Name").fill("Release regression")
  await expect(summary(page)).toContainText("3 test cases")
  await expect(page.getByText("1 Draft case is left out")).toBeVisible()

  await page.getByRole("button", { name: "Create run with 3 cases" }).click()
  await expect(
    page.getByText(`${project.key}-R-1 started with 3 cases`)
  ).toBeVisible()
  await expect(page).toHaveURL(
    `/projects/${project.key}/runs/${project.key}-R-1`
  )
  await expect(
    page.getByRole("heading", { level: 1, name: "Release regression" })
  ).toBeVisible()
  await expect(currentCase(page)).toHaveText("Run case 1")
})

test("E2E-RUN-008 include draft cases adds them to the run", async ({
  page,
  project,
}) => {
  await seedCases(project, { ready: 2, drafts: 2 })
  await page.goto(`/projects/${project.key}/runs/new`)
  await expect(summary(page)).toContainText("2 test cases")
  await page.getByRole("checkbox", { name: "Include Draft cases" }).check()
  await expect(summary(page)).toContainText("4 test cases")
  await expect(page.getByText("Draft cases are included.")).toBeVisible()
})

test("E2E-RUN-009 choose cases by label", async ({ page, project }) => {
  await seedCases(project, { ready: 3, labelled: 2 })
  await page.goto(`/projects/${project.key}/runs/new`)
  await expect(summary(page)).toContainText("5 test cases")
  await page.getByText("By label or filter").click()
  await choose(page, "Label", "smoke")
  await expect(summary(page)).toContainText("2 test cases")
})

test("E2E-RUN-010 choose cases by suite", async ({ page, project }) => {
  await seedCases(project, { ready: 3, labelled: 2 })
  await page.goto(`/projects/${project.key}/runs/new`)
  await page.getByLabel("Name").fill("Payments only")
  await page.getByText("Choose suites").click()
  await page.getByRole("list", { name: "Suites" }).getByText("Payments").click()
  await expect(summary(page)).toContainText("2 test cases")
  await expect(summary(page).getByRole("listitem")).toHaveText(["Payments2"])

  await page.getByRole("button", { name: "Create run with 2 cases" }).click()
  await expect(currentCase(page)).toHaveText("Smoke case 1")
  await expect(page.getByText("0% complete (0 of 2)")).toBeVisible()
})

test("E2E-RUN-011 pick single cases by hand", async ({ page, project }) => {
  await seedCases(project, { ready: 3 })
  await page.goto(`/projects/${project.key}/runs/new`)
  await page.getByLabel("Name").fill("Just one")
  await page.getByText("Choose suites").click()
  await page.getByRole("button", { name: "Pick single cases…" }).click()

  const dialog = page.getByRole("dialog", { name: "Pick single cases" })
  await dialog
    .getByRole("searchbox", { name: "Search by ID or title" })
    .fill("Run case 2")
  await dialog.getByText("Run case 2").click()
  await expect(dialog.getByText("1 picked")).toBeVisible()
  await dialog.getByRole("button", { name: "Done" }).click()
  await expect(page.getByText("1 picked by hand")).toBeVisible()

  await page.getByRole("button", { name: "Create run with 1 case" }).click()
  await expect(currentCase(page)).toHaveText("Run case 2")
  await expect(page.getByText("(0 of 1)")).toBeVisible()
})

test("E2E-RUN-012 a run needs a name and at least one case", async ({
  page,
  project,
}) => {
  await seedCases(project, { ready: 1 })
  await page.goto(`/projects/${project.key}/runs/new`)
  await page.getByText("Choose suites").click()
  await page.getByRole("button", { name: "Create run with 0 cases" }).click()
  await expect(page.getByText("Choose at least one case.")).toBeVisible()
  await expect(page.getByText("Give the run a name")).toBeVisible()
  await expect(page).toHaveURL(`/projects/${project.key}/runs/new`)
})

test("E2E-RUN-013 release, environment and assignee carry into the run", async ({
  page,
  project,
  slot,
}) => {
  await seedCases(project, { ready: 2 })
  await project.lead.createRelease(project.key, {
    name: "5.0",
    status: "planned",
  })
  await page.goto(`/projects/${project.key}/runs/new`)
  await page.getByLabel("Name").fill("Chrome on staging")
  await choose(page, "Release", "5.0")
  await page
    .getByLabel("Environment / build (optional)")
    .fill("Chrome 130 · build 5.0.1")
  await page.getByRole("button", { name: /Assign all cases to/ }).click()
  await page.getByRole("dialog").getByText(displayName("tester", slot)).click()
  await page.keyboard.press("Escape")
  await expect(
    page.getByRole("button", { name: `Remove ${displayName("tester", slot)}` })
  ).toBeVisible()

  await page.getByRole("button", { name: "Create run with 2 cases" }).click()
  await expect(
    page.getByRole("heading", { level: 1, name: "Chrome on staging" })
  ).toBeVisible()
  await expect(
    page.getByText("Release: 5.0", { exact: false }).first()
  ).toBeVisible()
  await expect(
    page.getByText("Environment: Chrome 130 · build 5.0.1")
  ).toBeVisible()
  await expect(
    page.getByText(`Assigned to: ${displayName("tester", slot)}`)
  ).toBeVisible()
})
