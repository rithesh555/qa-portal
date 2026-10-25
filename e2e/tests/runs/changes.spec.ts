import { expect, test } from "../../fixtures/index.ts"
import { displayName } from "../../fixtures/roles.ts"
import {
  currentCase,
  resultButton,
  retitleCase,
  runUrl,
  seedCases,
  startRun,
} from "../../fixtures/runs-helpers.ts"

test.use({ role: "tester" })

const stat = (page: import("@playwright/test").Page, text: string) =>
  page.getByText(text, { exact: true })

test("E2E-RUN-039 a case edited after the run started can be compared and updated", async ({
  page,
  project,
}) => {
  await seedCases(project, { ready: 2 })
  const run = await startRun(project)
  await retitleCase(
    project.lead,
    project.key,
    `${project.key}-TC-1`,
    "Run case 1, reworded"
  )
  await page.goto(runUrl(project, run.key))
  await expect(currentCase(page)).toHaveText("Run case 1")
  await expect(
    page.getByText("This case was edited after the run started")
  ).toBeVisible()

  await page.getByRole("button", { name: "Compare" }).click()
  const compare = page.getByRole("dialog", {
    name: `${project.key}-TC-1: version 1 → 2`,
  })
  const title = compare.getByRole("row", { name: /Title/ })
  await expect(title).toContainText("Run case 1")
  await expect(title).toContainText("Run case 1, reworded")
  await compare.getByRole("button", { name: "Use the latest version…" }).click()

  await expect(currentCase(page)).toHaveText("Run case 1, reworded")
  await expect(
    page.getByText("This case was edited after the run started")
  ).toBeHidden()
})

test("E2E-RUN-040 using the latest version of a tested case asks first and resets it", async ({
  page,
  project,
}) => {
  await seedCases(project, { ready: 2 })
  const run = await startRun(project)
  const [first] = await project.tester.runCases(project.key, run.key)
  await project.tester.recordResult(project.key, run.key, first!.id, {
    status: "passed",
    note: "",
    expectedVersion: first!.version,
  })
  await retitleCase(
    project.lead,
    project.key,
    `${project.key}-TC-1`,
    "Run case 1, v2"
  )
  await page.goto(`${runUrl(project, run.key)}?case=${first!.id}`)
  await expect(stat(page, "1 passed")).toBeVisible()

  await page.getByRole("button", { name: "Use the latest version…" }).click()
  const confirm = page.getByRole("alertdialog", {
    name: `Use version 2 of ${project.key}-TC-1?`,
  })
  await expect(confirm).toContainText("sets it back to untested")
  await confirm.getByRole("button", { name: "Use version 2" }).click()
  await expect(currentCase(page)).toHaveText("Run case 1, v2")
  await expect(stat(page, "0 passed")).toBeVisible()
})

test("E2E-RUN-041 someone else recorded first: record mine anyway or keep theirs", async ({
  page,
  project,
  slot,
}) => {
  await seedCases(project, { ready: 2 })
  const run = await startRun(project)
  const [first] = await project.tester.runCases(project.key, run.key)
  await page.goto(runUrl(project, run.key))
  await expect(currentCase(page)).toHaveText("Run case 1")
  await page.getByText("Go to the next untested case after saving").click()

  // The lead records while the tester's screen still shows the case untested.
  await project.lead.recordResult(project.key, run.key, first!.id, {
    status: "passed",
    note: "",
    expectedVersion: first!.version,
  })
  await resultButton(page, "Skipped").click()
  await expect(
    page.getByText(
      `${displayName("lead", slot)} recorded Passed on this case meanwhile.`,
      { exact: false }
    )
  ).toBeVisible()
  await page.getByRole("button", { name: "Keep theirs" }).click()
  await expect(page.getByRole("button", { name: "Keep theirs" })).toBeHidden()

  const latest = (await project.lead.runCases(project.key, run.key)).find(
    (c) => c.id === first!.id
  )!
  await project.lead.recordResult(project.key, run.key, first!.id, {
    status: "failed",
    note: "Declined",
    expectedVersion: latest.version,
  })
  await resultButton(page, "Skipped").click()
  await expect(
    page.getByText(
      `${displayName("lead", slot)} recorded Failed on this case meanwhile.`,
      { exact: false }
    )
  ).toBeVisible()
  await page.getByRole("button", { name: "Record mine anyway" }).click()
  await expect(stat(page, "1 skipped")).toBeVisible()
  await expect(stat(page, "0 failed")).toBeVisible()
})

test("E2E-RUN-042 a run keeps its copy of an archived case", async ({
  page,
  project,
}) => {
  await seedCases(project, { ready: 2 })
  const run = await startRun(project)
  await project.lead.post(
    `/projects/${project.key}/cases/${project.key}-TC-1/archive`,
    { reason: "Gone" }
  )
  await page.goto(runUrl(project, run.key))
  await expect(currentCase(page)).toHaveText("Run case 1")
  await expect(
    page.getByText(
      "The original test case has been archived. The run keeps its copy."
    )
  ).toBeVisible()
})

test("E2E-RUN-043 an unknown run shows run not found", async ({
  page,
  project,
}) => {
  await page.goto(runUrl(project, `${project.key}-R-99`))
  await expect(page.getByText("Run not found")).toBeVisible()
  await page.getByRole("link", { name: "Back to test runs" }).click()
  await expect(page).toHaveURL(`/projects/${project.key}/runs`)
})

test("E2E-RUN-044 on a phone the case list opens as a sheet @mobile", async ({
  page,
  project,
  isMobile,
}) => {
  test.skip(!isMobile, "Phone layout only")
  await seedCases(project, { ready: 3 })
  const run = await startRun(project)
  await page.goto(runUrl(project, run.key))
  await page.getByRole("button", { name: "Cases (3 left)" }).click()
  const sheet = page.getByRole("dialog", { name: "Cases · 3 left" })
  await expect(sheet).toBeVisible()
  await sheet.getByRole("button", { name: /Run case 3/ }).click()
  await expect(sheet).toBeHidden()
  await expect(currentCase(page)).toHaveText("Run case 3")
})
