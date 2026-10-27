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
      {
        id: "E2E-LAYOUT-004",
        title: "Home and All releases headers fit at phone width",
        priority: "low",
        type: "usability",
        preconditions: "Signed in as an admin",
        steps: [
          [
            "At 375 × 812, open Home and All releases",
            "The page title shows and nothing scrolls sideways",
          ],
        ],
      },
      {
        id: "E2E-LAYOUT-005",
        title:
          "Project overview, members and releases headers fit at phone width",
        priority: "low",
        type: "usability",
        preconditions: "Signed in as a QA Lead; BASE project",
        steps: [
          [
            "At 375 × 812, open the overview, Members and Releases",
            "The page title shows and nothing scrolls sideways; overview and Members show their facts",
          ],
        ],
      },
      {
        id: "E2E-LAYOUT-006",
        title: "The Users header fits at phone width",
        priority: "low",
        type: "usability",
        preconditions: "Signed in as an admin",
        steps: [
          [
            "At 375 × 812, open Users",
            "The page title shows and nothing scrolls sideways",
          ],
        ],
      },
      {
        id: "E2E-LAYOUT-007",
        title: "Test cases and import headers fit at phone width",
        priority: "low",
        type: "usability",
        preconditions: "Signed in as a QA Lead; BASE project",
        steps: [
          [
            "At 375 × 812, open Test cases and Import",
            "The page title shows and nothing scrolls sideways",
          ],
        ],
      },
      {
        id: "E2E-LAYOUT-008",
        title: "Defects list and defect page headers fit at phone width",
        priority: "low",
        type: "usability",
        preconditions: "Signed in as a QA Lead; BASE project",
        steps: [
          [
            "At 375 × 812, open Defects, a defect and New defect",
            "The page title shows and nothing scrolls sideways; the defect shows its facts",
          ],
        ],
      },
      {
        id: "E2E-LAYOUT-009",
        title: "Test runs and new run headers fit at phone width",
        priority: "low",
        type: "usability",
        preconditions: "Signed in as a tester; BASE project",
        steps: [
          [
            "At 375 × 812, open Test runs and New run",
            "The page title shows and nothing scrolls sideways",
          ],
        ],
      },
    ],
  },
]

export default suites
