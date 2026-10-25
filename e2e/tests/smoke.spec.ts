import { expect, test } from "../fixtures/index.ts"

test("E2E-SMOKE-001 the API is up through the web proxy", async ({
  request,
}) => {
  const res = await request.get("/api/health")
  expect(res.ok()).toBe(true)
})

test("E2E-SMOKE-002 a signed-in admin lands on Home", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await expect(page).toHaveTitle(/QA Portal/)
})
