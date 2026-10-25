import type { Page } from "@playwright/test"
import { expect, test } from "../../fixtures/index.ts"
import { displayName } from "../../fixtures/roles.ts"
import {
  caseList,
  choose,
  currentCase,
  runUrl,
  seedCases,
  startRun,
} from "../../fixtures/runs-helpers.ts"

test.use({ role: "tester" })

async function select(page: Page, keys: string[]) {
  const list = caseList(page)
  await list.getByRole("button", { name: "Select", exact: true }).click()
  for (const key of keys)
    await list.getByRole("checkbox", { name: `Select ${key}` }).check()
  await expect(list.getByText(`${keys.length} selected`)).toBeVisible()
}

test("E2E-RUN-025 set one result on several cases", async ({
  page,
  project,
}) => {
  await seedCases(project, { ready: 3 })
  const run = await startRun(project)
  await page.goto(runUrl(project, run.key))
  await select(page, [`${project.key}-TC-1`, `${project.key}-TC-2`])
  await caseList(page).getByRole("button", { name: "Set result…" }).click()

  const dialog = page.getByRole("dialog", { name: "Set a result on 2 cases" })
  await choose(dialog, "Result", "Passed")
  await dialog.getByRole("button", { name: "Save 2 results" }).click()
  await expect(page.getByText("2 cases marked Passed")).toBeVisible()
  await expect(page.getByText("67% complete (2 of 3)")).toBeVisible()
})

test("E2E-RUN-026 a bulk failed needs a note", async ({ page, project }) => {
  await seedCases(project, { ready: 2 })
  const run = await startRun(project)
  await page.goto(runUrl(project, run.key))
  await select(page, [`${project.key}-TC-1`])
  await caseList(page).getByRole("button", { name: "Set result…" }).click()

  const dialog = page.getByRole("dialog", { name: "Set a result on 1 case" })
  await choose(dialog, "Result", "Failed")
  await dialog.getByRole("button", { name: "Save 1 result" }).click()
  await expect(dialog.getByText("Say what went wrong")).toBeVisible()
  await dialog.getByLabel(/^Note/).fill("Every card is declined")
  await dialog.getByRole("button", { name: "Save 1 result" }).click()
  await expect(page.getByText("1 case marked Failed")).toBeVisible()
})

test("E2E-RUN-027 assign cases to someone", async ({ page, project, slot }) => {
  await seedCases(project, { ready: 2 })
  const run = await startRun(project)
  await page.goto(runUrl(project, run.key))
  await expect(currentCase(page)).toHaveText("Run case 1")
  await expect(page.getByText(/· unassigned$/)).toBeVisible()
  await select(page, [`${project.key}-TC-1`])
  await caseList(page).getByRole("button", { name: "Assign to…" }).click()

  const dialog = page.getByRole("dialog", { name: "Assign 1 case" })
  await choose(dialog, "Assign to", displayName("tester", slot))
  await dialog.getByRole("button", { name: "Assign", exact: true }).click()
  await expect(
    page.getByText(`1 case assigned to ${displayName("tester", slot)}`)
  ).toBeVisible()
  await expect(
    page
      .getByText(`assigned to ${displayName("tester", slot)}`, { exact: false })
      .first()
  ).toBeVisible()
})

test("E2E-RUN-028 remove untested cases; cases with results stay", async ({
  page,
  project,
}) => {
  await seedCases(project, { ready: 3 })
  const run = await startRun(project)
  const [first] = await project.tester.runCases(project.key, run.key)
  await project.tester.recordResult(project.key, run.key, first!.id, {
    status: "passed",
    note: "",
    expectedVersion: first!.version,
  })
  await page.goto(runUrl(project, run.key))
  await select(page, [`${project.key}-TC-1`, `${project.key}-TC-2`])
  await caseList(page).getByRole("button", { name: "Remove…" }).click()

  const confirm = page.getByRole("alertdialog", {
    name: `Remove 2 cases from ${run.key}?`,
  })
  await confirm.getByRole("button", { name: "Remove" }).click()
  await expect(page.getByText("1 case removed")).toBeVisible()
  await expect(page.getByText("1 with results stays in the run.")).toBeVisible()
  await expect(page.getByText("(1 of 2)")).toBeVisible()
})

test("E2E-RUN-029 add cases to an open run", async ({ page, project }) => {
  const { checkout } = await seedCases(project, { ready: 2 })
  const run = await startRun(project)
  await project.tester.createCase(project.key, {
    title: "Run case 3",
    suiteId: checkout.id,
  })
  await page.goto(runUrl(project, run.key))

  for (const toast of ["1 case added", "Those cases are already in the run"]) {
    await page.getByRole("button", { name: "Run actions" }).click()
    await page.getByRole("menuitem", { name: "Add cases…" }).click()
    const dialog = page.getByRole("dialog", { name: `Add cases to ${run.key}` })
    await expect(dialog.getByText("Up to 3 cases")).toBeVisible()
    await dialog.getByRole("button", { name: "Add cases" }).click()
    await expect(page.getByText(toast)).toBeVisible()
    await expect(dialog).toBeHidden()
  }
  await expect(page.getByText("(0 of 3)")).toBeVisible()
})

test("E2E-RUN-030 edit a run's name and environment", async ({
  page,
  project,
}) => {
  await seedCases(project, { ready: 1 })
  const run = await startRun(project)
  await page.goto(runUrl(project, run.key))
  await page.getByRole("button", { name: "Run actions" }).click()
  await page
    .getByRole("menuitem", { name: "Edit details and environment…" })
    .click()

  const dialog = page.getByRole("dialog", { name: `Edit ${run.key}` })
  await dialog.getByLabel("Name").fill("Smoke on Safari")
  await dialog.getByLabel("Environment / build").fill("Safari 18")
  await dialog.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByText("Run details saved")).toBeVisible()
  await expect(
    page.getByRole("heading", { level: 1, name: "Smoke on Safari" })
  ).toBeVisible()
  await expect(page.getByText("Environment: Safari 18")).toBeVisible()
})

test("E2E-RUN-031 duplicate a run", async ({ page, project }) => {
  await seedCases(project, { ready: 3 })
  const run = await startRun(project, "Chrome pass")
  await page.goto(runUrl(project, run.key))
  await page.getByRole("button", { name: "Run actions" }).click()
  await page.getByRole("menuitem", { name: "Duplicate run…" }).click()

  await expect(
    page.getByRole("heading", { level: 1, name: "Duplicate run" })
  ).toBeVisible()
  await expect(page.getByLabel("Name")).toHaveValue("Chrome pass (copy)")
  await page.getByRole("button", { name: "Start run" }).click()
  await expect(page.getByText(`${project.key}-R-2 started`)).toBeVisible()
  await expect(page).toHaveURL(runUrl(project, `${project.key}-R-2`))
  await expect(
    page.getByRole("heading", { level: 1, name: "Chrome pass (copy)" })
  ).toBeVisible()
  await expect(page.getByText("(0 of 3)")).toBeVisible()
})

test("E2E-RUN-032 start a new run from the failed and blocked cases", async ({
  page,
  project,
}) => {
  await seedCases(project, { ready: 3 })
  const run = await startRun(project)
  const cases = await project.tester.runCases(project.key, run.key)
  for (const [i, status] of (["failed", "blocked"] as const).entries())
    await project.tester.recordResult(project.key, run.key, cases[i]!.id, {
      status,
      note: "Broken",
      expectedVersion: cases[i]!.version,
    })
  await page.goto(runUrl(project, run.key))
  await page.getByRole("button", { name: "Run actions" }).click()
  await page
    .getByRole("menuitem", { name: "New run from failed and blocked (2)…" })
    .click()

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "New run from failed and blocked cases",
    })
  ).toBeVisible()
  await expect(page.getByLabel("Name")).toHaveValue(
    `Re-test failures from ${run.key}`
  )
  await page.getByRole("button", { name: "Start run" }).click()
  await expect(page).toHaveURL(runUrl(project, `${project.key}-R-2`))
  await expect(page.getByText("(0 of 2)")).toBeVisible()
})
