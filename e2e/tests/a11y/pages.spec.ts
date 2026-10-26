import type { Page } from "@playwright/test"
import {
  apiContext,
  BASE,
  expect,
  PortalApi,
  test,
} from "../../fixtures/index.ts"
import { expectAccessible } from "../../fixtures/a11y.ts"
import type { Role } from "../../fixtures/roles.ts"
import { freshUser, signInWithForm } from "../../fixtures/users.ts"

const P = `/projects/${BASE.key}`

/** Opens a page, waits until it settled (heading shown, no spinners), scans it. */
const cases: [
  id: string,
  name: string,
  role: Role,
  path: string | ((api: PortalApi) => Promise<string>),
][] = [
  ["E2E-A11Y-002", "Home", "lead", "/"],
  ["E2E-A11Y-003", "Projects", "admin", "/projects"],
  ["E2E-A11Y-004", "project overview", "tester", P],
  ["E2E-A11Y-005", "test case list", "tester", `${P}/cases`],
  [
    "E2E-A11Y-006",
    "test case page",
    "tester",
    async (api) => {
      const list = await api.get<{ items: { key: string }[] }>(
        `/projects/${BASE.key}/cases?pageSize=1`
      )
      return `${P}/cases/${list.items[0]!.key}`
    },
  ],
  ["E2E-A11Y-007", "test case editor", "tester", `${P}/cases/new`],
  ["E2E-A11Y-008", "import", "tester", `${P}/cases/import`],
  ["E2E-A11Y-009", "test run list", "tester", `${P}/runs`],
  ["E2E-A11Y-010", "new test run", "tester", `${P}/runs/new`],
  ["E2E-A11Y-011", "run execution", "tester", `${P}/runs/${BASE.runs.open}`],
  ["E2E-A11Y-012", "defect list", "tester", `${P}/defects`],
  ["E2E-A11Y-013", "defect page", "tester", `${P}/defects/${BASE.key}-D-2`],
  ["E2E-A11Y-014", "new defect", "tester", `${P}/defects/new`],
  ["E2E-A11Y-015", "releases", "lead", `${P}/releases`],
  ["E2E-A11Y-016", "reports", "viewer", `${P}/reports`],
  ["E2E-A11Y-017", "print report", "viewer", `${P}/reports/print`],
  ["E2E-A11Y-018", "members", "lead", `${P}/members`],
  ["E2E-A11Y-019", "users", "admin", "/users"],
  ["E2E-A11Y-020", "all releases", "admin", "/releases"],
  ["E2E-A11Y-021", "not found", "viewer", "/no-such-page"],
  [
    "E2E-A11Y-023",
    "closed run with every result colour",
    "viewer",
    `${P}/runs/${BASE.runs.closed}`,
  ],
]

async function settled(page: Page) {
  // The first page on a fresh worker loads its route chunks cold.
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByRole("status", { name: /loading/i })).toHaveCount(0)
  await page.waitForLoadState("networkidle")
}

for (const [id, name, role, path] of cases) {
  test.describe(() => {
    test.use({ role })
    test(`${id} no serious accessibility problems: ${name} @a11y`, async ({
      page,
      slot,
    }, testInfo) => {
      test.setTimeout(60_000)
      const url =
        typeof path === "string"
          ? path
          : await path(new PortalApi(await apiContext(slot, role)))
      await page.goto(url)
      await settled(page)
      await expectAccessible(page, testInfo, name)
    })
  })
}

test.describe(() => {
  test.use({ role: "tester" })
  test("E2E-A11Y-024 no serious accessibility problems: dialog over run execution @a11y", async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000)
    await page.goto(`${P}/runs/${BASE.runs.open}`)
    await settled(page)
    await page.keyboard.press("?")
    await expect(
      page.getByRole("dialog", { name: "Keyboard shortcuts" })
    ).toBeVisible()
    await expectAccessible(page, testInfo, "shortcuts dialog")
  })
})

test.describe("signed out", () => {
  test.use({ role: "anonymous" })
  test("E2E-A11Y-001 no serious accessibility problems: sign-in @a11y", async ({
    page,
  }, testInfo) => {
    await page.goto("/login")
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()
    await expectAccessible(page, testInfo, "sign-in")
  })

  test("E2E-A11Y-022 no serious accessibility problems: choose-password dialog @a11y", async ({
    page,
    slot,
  }, testInfo) => {
    const user = await freshUser(new PortalApi(await apiContext(slot, "admin")))
    await signInWithForm(page, user.username, user.password)
    await expect(
      page.getByRole("dialog", { name: "Choose your own password" })
    ).toBeVisible()
    await expectAccessible(page, testInfo, "choose-password dialog")
  })
})
