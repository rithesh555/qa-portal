import { BASE, expect, test } from "../../fixtures/index.ts"
import { displayName } from "../../fixtures/roles.ts"
import {
  currentCase,
  recordAll,
  resultButton,
  runUrl,
  seedCases,
  startRun,
} from "../../fixtures/runs-helpers.ts"

const resultBar = (page: import("@playwright/test").Page) =>
  page.getByRole("group", { name: "Record a result" })

test.describe("as a QA Lead", () => {
  test.use({ role: "lead" })

  test("E2E-RUN-033 a QA Lead can close a run with untested cases", async ({
    page,
    project,
    slot,
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
    // A lead may close early, so the button isn't disabled and needs no hint.
    await expect(page.getByRole("button", { name: "Close run" })).toBeEnabled()
    await expect(page.getByText(/You can close this run once/)).toHaveCount(0)

    await page.getByRole("button", { name: "Close run" }).click()
    const confirm = page.getByRole("alertdialog", { name: `Close ${run.key}?` })
    await expect(confirm).toContainText("2 cases have no result")
    await confirm.getByRole("button", { name: "Close run" }).click()
    await expect(page.getByText(`${run.key} closed`)).toBeVisible()
    await expect(
      page.getByText(new RegExp(`Closed by ${displayName("lead", slot)}`))
    ).toBeVisible()
    await expect(page.getByText("Results are read-only.")).toBeVisible()
    await expect(resultBar(page)).toHaveCount(0)
  })

  test("E2E-RUN-036 a QA Lead reopens a closed run", async ({
    page,
    project,
  }) => {
    await seedCases(project, { ready: 1 })
    const run = await startRun(project)
    await project.lead.post(`/projects/${project.key}/runs/${run.key}/close`)
    await page.goto(runUrl(project, run.key))
    await expect(resultBar(page)).toHaveCount(0)

    await page.getByRole("button", { name: "Reopen run" }).click()
    await expect(page.getByText(`${run.key} reopened`)).toBeVisible()
    await expect(resultBar(page)).toBeVisible()
    await expect(page.getByRole("button", { name: "Close run" })).toBeVisible()
  })
})

test.describe("as a tester", () => {
  test.use({ role: "tester" })

  test("E2E-RUN-034 a tester closes their own run only once every case has a result", async ({
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
    await page.goto(runUrl(project, run.key))
    const close = page.getByRole("button", { name: "Close run" }).first()
    await expect(close).toBeDisabled()
    await expect(
      page.getByText(
        "You can close this run once every case has a result (1 left)."
      )
    ).toBeVisible()

    await expect(currentCase(page)).toHaveText("Run case 2")
    await resultButton(page, "Passed").click()
    await expect(close).toBeEnabled()
    await close.click()
    await page
      .getByRole("alertdialog", { name: `Close ${run.key}?` })
      .getByRole("button", { name: "Close run" })
      .click()
    await expect(page.getByText(`${run.key} closed`)).toBeVisible()
    await expect(
      page.getByText("Results are read-only; a QA Lead can reopen it.")
    ).toBeVisible()
  })

  test("E2E-RUN-035 a tester can't close someone else's run", async ({
    page,
    project,
  }) => {
    await seedCases(project, { ready: 1 })
    const run = await startRun(project, "The lead's run", project.lead)
    await recordAll(project, run.key, "passed", project.lead)
    await page.goto(runUrl(project, run.key))
    await expect(
      page.getByRole("heading", { level: 1, name: "The lead's run" })
    ).toBeVisible()
    await expect(page.getByText("Every case has a result.")).toBeVisible()
    await expect(page.getByRole("button", { name: "Close run" })).toHaveCount(0)
  })

  test("E2E-RUN-037 testers see a closed run as read-only", async ({
    page,
  }) => {
    await page.goto(`/projects/${BASE.key}/runs/${BASE.runs.closed}`)
    await expect(
      page.getByRole("heading", { level: 1, name: BASE.runs.closedName })
    ).toBeVisible()
    await expect(
      page.getByText("Results are read-only; a QA Lead can reopen it.")
    ).toBeVisible()
    await expect(page.getByRole("button", { name: "Reopen run" })).toHaveCount(
      0
    )
    await expect(resultBar(page)).toHaveCount(0)
  })
})

test.describe("as a viewer", () => {
  test.use({ role: "viewer" })

  test("E2E-RUN-038 viewers follow a run without recording @mobile", async ({
    page,
  }) => {
    await page.goto(`/projects/${BASE.key}/runs/${BASE.runs.open}`)
    await expect(
      page.getByRole("heading", { level: 1, name: BASE.runs.openName })
    ).toBeVisible()
    await expect(
      page.getByText(
        "You're a Viewer in this project, so you can follow the run but not record results."
      )
    ).toBeVisible()
    await expect(currentCase(page)).toBeVisible()
    await expect(resultBar(page)).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Run actions" })).toHaveCount(
      0
    )
  })
})
