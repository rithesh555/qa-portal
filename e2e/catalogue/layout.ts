import type { CatalogueSuite } from "./types.ts"

const suites: CatalogueSuite[] = [
  {
    suite: "Layout › Desktop and phone",
    label: "layout",
    cases: [
      {
        id: "E2E-LAYOUT-001",
        title: "At 1280px every table shows all its columns without scrolling",
        priority: "medium",
        type: "usability",
        preconditions: "Signed in as an admin; BASE project",
        steps: [
          [
            "At 1280 × 800, open Test cases, Test runs, Defects, Reports, All releases, Projects and Users",
            "No table needs a horizontal scroll to show its columns",
          ],
        ],
      },
      {
        id: "E2E-LAYOUT-002",
        title:
          "At phone width the run and release lists fit without scrolling sideways",
        priority: "medium",
        type: "usability",
        preconditions: "Signed in as a tester; BASE project",
        steps: [
          [
            "At 390 × 844, open Test runs, Home and Test cases",
            "No table scrolls sideways; each run still shows its progress and pass rate, each release whether it can ship",
          ],
        ],
      },
      {
        id: "E2E-LAYOUT-003",
        title: "A confirmation never covers the case editor's sticky buttons",
        priority: "medium",
        type: "usability",
        steps: [
          [
            "Fill a new case and select Save and add another",
            '"<key> created" shows above the sticky footer, which stays clickable',
          ],
        ],
      },
    ],
  },
]

export default suites
