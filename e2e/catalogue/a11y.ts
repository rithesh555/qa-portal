import type { CatalogueSuite } from "./types.ts"

const page = (id: string, title: string, how: string) => ({
  id,
  title: `No serious accessibility problems: ${title}`,
  priority: "high" as const,
  type: "usability" as const,
  steps: [
    [how, "The page has finished loading"],
    [
      "Run axe (WCAG 2.2 A/AA) in light and in dark mode",
      "No serious or critical violations",
    ],
  ] as [string, string][],
})

const suites: CatalogueSuite[] = [
  {
    suite: "Accessibility › Pages",
    label: "a11y",
    cases: [
      page("E2E-A11Y-001", "sign-in", "Open /login signed out"),
      page("E2E-A11Y-002", "Home", "As a lead, open Home"),
      page("E2E-A11Y-003", "Projects", "As an admin, open Projects"),
      page("E2E-A11Y-004", "project overview", "Open E2E Baseline"),
      page("E2E-A11Y-005", "test case list", "Open E2E Baseline › Test cases"),
      page("E2E-A11Y-006", "test case page", "Open a test case as a full page"),
      page("E2E-A11Y-007", "test case editor", "Open New test case"),
      page("E2E-A11Y-008", "import", "Open Import as a tester"),
      page("E2E-A11Y-009", "test run list", "Open Test runs"),
      page("E2E-A11Y-010", "new test run", "Open New run"),
      page("E2E-A11Y-011", "run execution", "Open the open run as its tester"),
      page("E2E-A11Y-012", "defect list", "Open Defects"),
      page("E2E-A11Y-013", "defect page", "Open a defect"),
      page("E2E-A11Y-014", "new defect", "Open New defect"),
      page("E2E-A11Y-015", "releases", "Open Releases as a lead"),
      page("E2E-A11Y-016", "reports", "Open Reports on the shipped release"),
      page("E2E-A11Y-017", "print report", "Open the printable report"),
      page("E2E-A11Y-018", "members", "Open Members as a lead"),
      page("E2E-A11Y-019", "users", "Open Users as an admin"),
      page("E2E-A11Y-020", "all releases", "Open All releases as an admin"),
      page("E2E-A11Y-021", "not found", "Open an unknown address"),
      page(
        "E2E-A11Y-022",
        "choose-password dialog",
        "Sign in with an admin-set password"
      ),
      page(
        "E2E-A11Y-023",
        "closed run with every result colour",
        "As a viewer, open the closed run"
      ),
      page(
        "E2E-A11Y-024",
        "dialog over run execution",
        "Open the open run as its tester and press ?"
      ),
    ],
  },
]

export default suites
