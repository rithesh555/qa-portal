import { apiContext, expect, PortalApi, test } from "../../fixtures/index.ts"
import { clientIp } from "../../fixtures/roles.ts"
import {
  currentCase,
  resultButton,
  runUrl,
  seedCases,
  startRun,
} from "../../fixtures/runs-helpers.ts"
import { readyUser, signInWithForm } from "../../fixtures/users.ts"

const serverError = {
  status: 500,
  contentType: "application/json",
  body: JSON.stringify({ statusCode: 500, message: "Internal Server Error" }),
}

test.describe("as a tester", () => {
  test.use({ role: "tester" })

  test("E2E-ERR-001 a list that fails to load says so and recovers with try again", async ({
    page,
    project,
  }) => {
    const list = new RegExp(`/api/projects/${project.key}/runs(\\?|$)`)
    await page.route(list, (route) => route.fulfill(serverError))
    await page.goto(`/projects/${project.key}/runs`)
    const alert = page
      .getByRole("alert")
      .filter({ hasText: "Couldn't load test runs" })
    // The app retries server errors a few times before giving up.
    await expect(alert).toBeVisible({ timeout: 20_000 })
    await page.unroute(list)
    await alert.getByRole("button", { name: "Try again" }).click()
    await expect(alert).toBeHidden()
    await expect(page.getByRole("heading", { name: "Test runs" })).toBeVisible()
  })

  test("E2E-ERR-002 a result whose save fails says so and can be retried", async ({
    page,
    project,
  }) => {
    await seedCases(project, { ready: 2 })
    const run = await startRun(project)
    await page.goto(runUrl(project, run.key))
    await expect(currentCase(page)).toHaveText("Run case 1")
    await expect(resultButton(page, "Passed")).toBeEnabled()

    const save = "**/results"
    await page.route(save, (route) => route.abort("internetdisconnected"))
    await page.keyboard.press("p")
    const failed = page.getByText(/The result wasn't saved/)
    await expect(failed).toBeVisible()
    await expect(page.getByText("0% complete (0 of 2)")).toBeVisible()
    await expect(currentCase(page)).toHaveText("Run case 1")

    await page.unroute(save)
    await page.getByRole("button", { name: "Try again" }).click()
    await expect(page.getByText("50% complete (1 of 2)")).toBeVisible()
    await expect(failed).toBeHidden()
  })

  test("E2E-ERR-003 a failed save keeps what was typed in the case editor", async ({
    page,
    project,
  }) => {
    const create = `**/api/projects/${project.key}/cases`
    await page.route(create, (route) =>
      route.request().method() === "POST"
        ? route.fulfill(serverError)
        : route.fallback()
    )
    await page.goto(`/projects/${project.key}/cases/new`)
    const title = page.getByLabel("Title")
    await title.fill("Refund a cancelled order")
    await page
      .getByLabel("Step 1 action", { exact: true })
      .fill("Cancel the order, then refund it")
    const submit = page.getByRole("button", { name: "Create test case" })
    await submit.click()
    await expect(
      page.getByRole("alert").filter({ hasText: "Couldn't save" })
    ).toBeVisible()
    await expect(title).toHaveValue("Refund a cancelled order")
    await expect(page).toHaveURL(`/projects/${project.key}/cases/new`)

    await page.unroute(create)
    await submit.click()
    await expect(page.getByText(`${project.key}-TC-1 created`)).toBeVisible()
  })

  test("E2E-ERR-006 a result recorded while offline is saved on reconnect", async ({
    page,
    project,
  }) => {
    await seedCases(project, { ready: 2 })
    const run = await startRun(project)
    await page.goto(runUrl(project, run.key))
    await expect(currentCase(page)).toHaveText("Run case 1")
    await expect(resultButton(page, "Passed")).toBeEnabled()

    await page.context().setOffline(true)
    await page.keyboard.press("p")
    // F26 (findings/app-findings.md): the save waits for the network with the
    // result buttons disabled and no message saying why.
    await expect(resultButton(page, "Passed")).toBeDisabled()
    await expect(page.getByText("0% complete (0 of 2)")).toBeVisible()
    await page.context().setOffline(false)
    await expect(page.getByText("50% complete (1 of 2)")).toBeVisible()
    await expect(currentCase(page)).toHaveText("Run case 2")
  })
})

test("E2E-ERR-004 when the session ends while the page is open, the next step goes to sign-in", async ({
  browser,
  slot,
}) => {
  // Its own context and account: clearing cookies must not touch this
  // worker's saved sign-ins.
  const admin = new PortalApi(await apiContext(slot, "admin"))
  const user = await readyUser(admin, await apiContext(slot, "anonymous"))
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
    extraHTTPHeaders: { "X-Forwarded-For": clientIp(slot) },
  })
  const page = await context.newPage()
  await signInWithForm(page, user.username, user.password)
  await expect(page).toHaveURL("/")
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  // A Home request still in flight would see the 401 first and go to sign-in
  // on its own; this test is about the next thing the person does.
  await page.waitForLoadState("networkidle")

  await context.clearCookies()
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Projects", exact: true })
    .click()
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
  await context.close()
})

test("E2E-ERR-005 a page whose code can't be downloaded offers a reload", async ({
  page,
}) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  // Anything not downloaded yet now fails, as after a deploy removes old files.
  await page.route("**/assets/*.js", (route) => route.abort())
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Users", exact: true })
    .click()
  await expect(
    page.getByRole("heading", { name: "This page couldn't load" })
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "Reload" })).toBeVisible()
})
