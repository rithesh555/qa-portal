import { AxeBuilder } from "@axe-core/playwright"
import { expect, type Page, type TestInfo } from "@playwright/test"

/**
 * Runs axe (WCAG 2.2 A/AA) on the page. Every violation is attached to the
 * report; serious and critical ones fail the test.
 */
export async function expectAccessible(
  page: Page,
  testInfo: TestInfo,
  label: string
) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze()
  const lines = results.violations.map(
    (v) =>
      `[${v.impact}] ${v.id}: ${v.help} — ${v.nodes.length} element(s): ${v.nodes
        .slice(0, 3)
        .map(
          (n) =>
            `\n    ${n.target.join(" ")} ${n.html.slice(0, 160)}\n      ${(n.failureSummary ?? "").replace(/\n/g, " ").slice(0, 240)}`
        )
        .join("")}`
  )
  if (lines.length)
    await testInfo.attach(`axe ${label}`, {
      body: lines.join("\n"),
      contentType: "text/plain",
    })
  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical"
  )
  expect(
    blocking.map(
      (v) =>
        `${v.id} (${v.nodes.length}): ${v.nodes
          .slice(0, 2)
          .map((n) => n.target.join(" "))
          .join(" | ")}`
    ),
    `${label}: serious/critical axe violations`
  ).toEqual([])
}
