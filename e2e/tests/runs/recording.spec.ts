import type { Page } from "@playwright/test"
import { expect, test, type TestProject } from "../../fixtures/index.ts"
import {
  caseList,
  choose,
  currentCase,
  resultButton,
  runUrl,
  seedCases,
  startRun,
} from "../../fixtures/runs-helpers.ts"

test.use({ role: "tester" })

/** A run of three Ready cases (Run case 1–3), open on the first. */
async function openRun(page: Page, project: TestProject) {
  await seedCases(project, { ready: 3 })
  const run = await startRun(project)
  const cases = await project.tester.runCases(project.key, run.key)
  await page.goto(runUrl(project, run.key))
  await expect(currentCase(page)).toHaveText("Run case 1")
  // Results (and their shortcuts) work once the case's steps have loaded.
  await expect(resultButton(page, "Passed")).toBeEnabled()
  return { run, cases }
}

const stat = (page: Page, text: string) => page.getByText(text, { exact: true })

test("E2E-RUN-014 record passed and move to the next untested case @mobile", async ({
  page,
  project,
}) => {
  await openRun(page, project)
  await resultButton(page, "Passed").click()
  await expect(page.getByRole("button", { name: /^Undo/ })).toBeVisible()
  await expect(
    page.getByText(`${project.key}-TC-1 marked Passed`).first()
  ).toBeVisible()
  await expect(currentCase(page)).toHaveText("Run case 2")
  await expect(page.getByText("33% complete (1 of 3)")).toBeVisible()
  await expect(stat(page, "1 passed")).toBeVisible()
})

test("E2E-RUN-015 failing a case needs a note and can name the step @mobile", async ({
  page,
  project,
}) => {
  const { run, cases } = await openRun(page, project)
  await resultButton(page, "Failed").click()
  await page.getByRole("button", { name: /^Save Failed/ }).click()
  await expect(
    page.getByText("Say what went wrong before saving")
  ).toBeVisible()

  await page
    .getByLabel("What went wrong? (required)")
    .fill("Card form never loads")
  await choose(page, "At step (optional)", "Step 2")
  await page.getByRole("button", { name: /^Save Failed/ }).click()
  await expect(stat(page, "1 failed")).toBeVisible()

  await page.goto(`${runUrl(project, run.key)}?case=${cases[0]!.id}`)
  await expect(currentCase(page)).toHaveText("Run case 1")
  await expect(page.getByText("Failed at step 2")).toBeVisible()
  await expect(page.getByText("“Card form never loads”")).toBeVisible()
})

test("E2E-RUN-016 ctrl+enter saves a blocked note", async ({
  page,
  project,
}) => {
  await openRun(page, project)
  await resultButton(page, "Blocked").click()
  const note = page.getByLabel("What went wrong? (required)")
  await expect(note).toBeFocused()
  await note.fill("Staging is down")
  await note.press("Control+Enter")
  await expect(stat(page, "1 blocked")).toBeVisible()
})

test("E2E-RUN-017 p and s record passed and skipped from the keyboard", async ({
  page,
  project,
}) => {
  await openRun(page, project)
  await page.keyboard.press("p")
  await expect(stat(page, "1 passed")).toBeVisible()
  await expect(currentCase(page)).toHaveText("Run case 2")
  // A key pressed before the next case's steps load is ignored.
  await expect(resultButton(page, "Skipped")).toBeEnabled()
  await page.keyboard.press("s")
  await expect(stat(page, "1 skipped")).toBeVisible()
  await expect(currentCase(page)).toHaveText("Run case 3")
})

test("E2E-RUN-018 f opens the note, and letters typed there aren't shortcuts", async ({
  page,
  project,
}) => {
  await openRun(page, project)
  await page.keyboard.press("f")
  const note = page.getByLabel("What went wrong? (required)")
  await expect(note).toBeFocused()
  await page.keyboard.type("page stuck")
  await expect(note).toHaveValue("page stuck")
  await expect(page.getByText("0% complete (0 of 3)")).toBeVisible()
  await expect(currentCase(page)).toHaveText("Run case 1")
})

test("E2E-RUN-019 j, n and k move between cases", async ({ page, project }) => {
  await openRun(page, project)
  const position = (n: number) => page.getByText(`Position: ${n} of 3`)
  await expect(position(1)).toBeVisible()
  await page.keyboard.press("j")
  await expect(position(2)).toBeVisible()
  await expect(currentCase(page)).toHaveText("Run case 2")
  await page.keyboard.press("n")
  await expect(position(3)).toBeVisible()
  await page.keyboard.press("k")
  await expect(position(2)).toBeVisible()
  await expect(currentCase(page)).toHaveText("Run case 2")
})

test("E2E-RUN-045 an unsaved fail note survives moving between cases; leaving the run asks first", async ({
  page,
  project,
}) => {
  await openRun(page, project)
  await page.keyboard.press("f")
  const note = page.getByLabel("What went wrong? (required)")
  await note.fill("Spinner never stops")
  await page.getByRole("button", { name: /^Next/ }).click()
  await expect(currentCase(page)).toHaveText("Run case 2")
  await expect(note).toBeHidden()
  await page.getByRole("button", { name: /^Previous/ }).click()
  await expect(currentCase(page)).toHaveText("Run case 1")
  await expect(note).toHaveValue("Spinner never stops")

  await page
    .getByRole("navigation", { name: /breadcrumb/i })
    .getByRole("link", { name: "Test runs" })
    .click()
  const leave = page.getByRole("alertdialog", { name: "Leave without saving?" })
  await expect(leave).toBeVisible()
  await leave.getByRole("button", { name: "Keep editing" }).click()
  await expect(note).toHaveValue("Spinner never stops")
  await expect(page.getByText("0% complete (0 of 3)")).toBeVisible()
})

test("E2E-RUN-020 u undoes the last result", async ({ page, project }) => {
  await openRun(page, project)
  await page.keyboard.press("p")
  await expect(stat(page, "1 passed")).toBeVisible()
  await page.keyboard.press("u")
  await expect(stat(page, "0 passed")).toBeVisible()
  await expect(currentCase(page)).toHaveText("Run case 1")
  await expect(page.getByText(/is Untested again/)).toBeAttached()
})

test("E2E-RUN-021 ? lists the shortcuts, and they can be switched off", async ({
  page,
  project,
}) => {
  await openRun(page, project)
  await page.keyboard.press("?")
  const help = page.getByRole("dialog", { name: "Keyboard shortcuts" })
  await expect(help).toBeVisible()
  await expect(help.getByText("Undo the last result")).toBeVisible()
  await help
    .getByRole("checkbox", { name: "Use single-key shortcuts" })
    .uncheck()
  await help.getByRole("button", { name: "Got it" }).click()
  await expect(help).toBeHidden()

  await page.keyboard.press("p")
  // Give a keypress the chance to record something; it mustn't.
  await page.waitForTimeout(500)
  await expect(stat(page, "0 passed")).toBeVisible()

  await page.reload()
  await expect(resultButton(page, "Passed")).toBeEnabled()
  await page.getByRole("button", { name: "Shortcuts" }).click()
  await expect(
    page
      .getByRole("dialog", { name: "Keyboard shortcuts" })
      .getByRole("checkbox", { name: "Use single-key shortcuts" })
  ).not.toBeChecked()
})

test("E2E-RUN-046 a shortcut pressed right after closing the help works", async ({
  page,
  project,
}) => {
  await openRun(page, project)
  await page.keyboard.press("?")
  const help = page.getByRole("dialog", { name: "Keyboard shortcuts" })
  await expect(help).toBeVisible()
  // F20: no waiting for the dialog to finish fading out.
  await page.keyboard.press("Escape")
  await page.keyboard.press("p")
  await expect(stat(page, "1 passed")).toBeVisible()
})

test("E2E-RUN-047 a shortcut pressed before the next case loads is kept", async ({
  page,
  project,
}) => {
  const { cases } = await openRun(page, project)
  // F4: hold the second case's steps back, so S lands before they load.
  await page.route(`**/cases/${cases[1]!.id}`, async (route) => {
    await new Promise((r) => setTimeout(r, 800))
    await route.continue()
  })
  await page.keyboard.press("p")
  await expect(currentCase(page)).toHaveText("Run case 2")
  await page.keyboard.press("s")
  await expect(stat(page, "1 passed")).toBeVisible()
  await expect(stat(page, "1 skipped")).toBeVisible()
  await expect(currentCase(page)).toHaveText("Run case 3")
})

test("E2E-RUN-022 with auto-advance off, saving stays on the case", async ({
  page,
  project,
}) => {
  await openRun(page, project)
  await page.getByText("Go to the next untested case after saving").click()
  await resultButton(page, "Passed").click()
  await expect(stat(page, "1 passed")).toBeVisible()
  await expect(currentCase(page)).toHaveText("Run case 1")
  await expect(resultButton(page, "Passed")).toHaveAttribute(
    "aria-pressed",
    "true"
  )
})

test("E2E-RUN-023 search the run's cases and show only some", async ({
  page,
  project,
}) => {
  await seedCases(project, { ready: 3 })
  const run = await startRun(project)
  const cases = await project.tester.runCases(project.key, run.key)
  await project.tester.recordResult(project.key, run.key, cases[2]!.id, {
    status: "failed",
    note: "Broken",
    expectedVersion: cases[2]!.version,
  })
  await page.goto(runUrl(project, run.key))
  const list = caseList(page)
  await expect(list.getByRole("button", { name: /Run case/ })).toHaveCount(3)

  await list
    .getByRole("searchbox", { name: "Search cases in this run" })
    .fill("case 2")
  await expect(list.getByRole("button", { name: /Run case/ })).toHaveCount(1)
  await expect(list.getByRole("button", { name: /Run case 2/ })).toBeVisible()

  await list
    .getByRole("searchbox", { name: "Search cases in this run" })
    .fill("")
  await choose(list, "Show", "Failed or blocked (1)")
  await expect(list.getByRole("button", { name: /Run case/ })).toHaveCount(1)
  await expect(list.getByRole("button", { name: /Run case 3/ })).toBeVisible()
})

test("E2E-RUN-024 when every case has a result the run says so", async ({
  page,
  project,
}) => {
  await seedCases(project, { ready: 3 })
  const run = await startRun(project)
  const cases = await project.tester.runCases(project.key, run.key)
  await project.tester.recordResult(project.key, run.key, cases[0]!.id, {
    status: "passed",
    note: "",
    expectedVersion: cases[0]!.version,
  })
  await project.tester.recordResult(project.key, run.key, cases[1]!.id, {
    status: "failed",
    note: "Broken",
    expectedVersion: cases[1]!.version,
  })
  await page.goto(runUrl(project, run.key))
  await expect(currentCase(page)).toHaveText("Run case 3")
  await resultButton(page, "Passed").click()
  await expect(page.getByText("Every case has a result.")).toBeVisible()
  await expect(
    page.getByText("1 failed or blocked: review them before closing.")
  ).toBeVisible()

  await page.getByRole("button", { name: "Review failed and blocked" }).click()
  await expect(page).toHaveURL(/show=failed/)
  await expect(
    caseList(page).getByRole("button", { name: /Run case/ })
  ).toHaveCount(1)
})
