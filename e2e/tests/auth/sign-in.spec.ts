import { apiContext } from "../../fixtures/index.ts"
import { BASE, expect, test } from "../../fixtures/index.ts"
import { clientIp, displayName, username } from "../../fixtures/roles.ts"
import { e2eEnv } from "../../fixtures/env.ts"
import { signInWithForm } from "../../fixtures/users.ts"

test.use({ role: "anonymous" })

test("E2E-AUTH-001 sign in with a valid username and password", async ({
  page,
  slot,
}) => {
  await signInWithForm(page, username("tester", slot), e2eEnv.userPassword)
  await expect(page).toHaveURL("/")
  await page
    .getByRole("button", { name: new RegExp(displayName("tester", slot)) })
    .click()
  await expect(page.getByRole("menu")).toContainText(
    `@${username("tester", slot)}`
  )
})

test("E2E-AUTH-002 a wrong password is refused and the password field is cleared", async ({
  page,
  slot,
}) => {
  await signInWithForm(page, username("viewer", slot), "definitely-not-it")
  const alert = page.getByRole("alert")
  await expect(alert).toContainText("Couldn't sign in")
  await expect(alert).toContainText("That username and password don't match")
  await expect(page.getByLabel("Password")).toHaveValue("")
  await expect(page.getByLabel("Password")).toBeFocused()
  await expect(page.getByLabel("Username")).toHaveValue(
    username("viewer", slot)
  )
})

test("E2E-AUTH-003 empty fields show what to fill in", async ({ page }) => {
  await page.goto("/login")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByText("Enter your username")).toBeVisible()
  await expect(page.getByText("Enter your password")).toBeVisible()
})

test("E2E-AUTH-004 a deactivated account can't sign in", async ({
  page,
  slot,
}) => {
  await signInWithForm(page, username("deactivated", slot), e2eEnv.userPassword)
  await expect(page.getByRole("alert")).toContainText(
    "This account has been deactivated. Ask an admin to restore access."
  )
  await expect(page).toHaveURL(/\/login$/)
})

test("E2E-AUTH-005 a deep link while signed out returns there after sign-in", async ({
  page,
  slot,
}) => {
  await page.goto(`/projects/${BASE.key}/cases`)
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel("Username").fill(username("tester", slot))
  await page.getByLabel("Password").fill(e2eEnv.userPassword)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL(`/projects/${BASE.key}/cases`)
  await expect(page).toHaveTitle(`Test cases · ${BASE.name} · QA Portal`)
})

test.describe("signed in", () => {
  test.use({ role: "viewer" })
  test("E2E-AUTH-006 signed-in people opening /login go to Home", async ({
    page,
  }) => {
    await page.goto("/login")
    await expect(page).toHaveURL("/")
  })
})

test("E2E-AUTH-007 too many sign-in attempts are slowed down with a clear message", async ({
  page,
  slot,
}) => {
  test.setTimeout(60_000)
  // An address of its own, so the limit doesn't touch other tests.
  const ip = clientIp(slot, 100 + Math.floor(Math.random() * 99))
  const api = await apiContext(slot, "anonymous", ip)
  for (let i = 0; i < 30; i++)
    await api.post("/api/auth/sign-in/username", {
      data: { username: `nobody.${slot}.${i}`, password: "wrong-password" },
    })
  await api.dispose()
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": ip })
  await signInWithForm(page, username("viewer", slot), e2eEnv.userPassword)
  await expect(page.getByRole("alert")).toContainText(
    "Too many sign-in attempts. Wait a minute, then try again."
  )
})
