import type { CatalogueSuite } from "./types.ts"

const suites: CatalogueSuite[] = [
  {
    suite: "Reports › Home",
    label: "home",
    cases: [
      {
        id: "E2E-HOME-001",
        title: "Runs with cases for me lead to my cases in the run",
        priority: "high",
        preconditions: "An open run with untested cases assigned to me",
        steps: [
          [
            "Open Home",
            'Cases to test counts them; "Runs with cases for you" lists the run with how many of mine are left',
          ],
          ["Select Continue", "The run opens showing my cases"],
        ],
      },
      {
        id: "E2E-HOME-002",
        title: "Defects assigned to me are listed on Home",
        priority: "high",
        steps: [
          [
            "Open Home",
            "My open defects tile; Defects › Assigned to me lists the defect",
          ],
        ],
      },
      {
        id: "E2E-HOME-003",
        title: "Defects I reported that are now fixed wait for my retest",
        priority: "high",
        steps: [
          [
            "Open Home, Defects › Ready to retest",
            "The fixed defect I reported is listed",
          ],
        ],
      },
      {
        id: "E2E-HOME-004",
        title: "Leads see defects to triage; testers don't",
        priority: "high",
        steps: [
          [
            "As a lead open Home",
            "Defects to triage tile; To triage tab lists the New defect",
          ],
          ["As a tester", "Runs ready to close tile instead; no To triage tab"],
        ],
      },
      {
        id: "E2E-HOME-005",
        title:
          "Releases in my projects; All releases is linked only for overseers",
        priority: "medium",
        steps: [
          [
            "Open Home",
            'The project\'s active release is in "Releases in your projects" and links to its report',
          ],
          ["As a tester, look for See all releases", "It isn't offered"],
          ["As an admin, See all releases", "All releases opens"],
        ],
      },
      {
        id: "E2E-HOME-006",
        title: "Someone in no project is told how to get added",
        priority: "medium",
        steps: [
          [
            "As a person with no projects open Home",
            "You're not in any project yet; ask an admin or a QA Lead",
          ],
        ],
      },
      {
        id: "E2E-HOME-007",
        title: "Recent activity shows what happened in my projects",
        priority: "low",
        steps: [
          [
            "Open Home after logging a defect",
            "Recent activity names me and links to the project",
          ],
        ],
      },
      {
        id: "E2E-HOME-008",
        title: "Home fits a phone screen",
        priority: "medium",
        type: "usability",
        steps: [
          [
            "Open Home at phone width",
            "The work tiles stack; no sideways scrolling",
          ],
        ],
      },
    ],
  },
  {
    suite: "Reports › All releases",
    label: "reports",
    cases: [
      {
        id: "E2E-RPT-001",
        title: "Admins search all active releases by project",
        priority: "high",
        steps: [
          [
            "Search for a project's key",
            'Only its releases; "Showing n of N active releases"',
          ],
        ],
      },
      {
        id: "E2E-RPT-002",
        title: "Not ready only hides releases that pass or have no runs",
        priority: "medium",
        steps: [
          [
            "Press Not ready only",
            "A release with an open Critical defect stays; one with no runs goes",
          ],
        ],
      },
      {
        id: "E2E-RPT-003",
        title: "Filter by target date",
        priority: "medium",
        steps: [
          ["Target date: Next 7 days", "Only the release due within a week"],
          ["Any target date", "Both again"],
        ],
      },
      {
        id: "E2E-RPT-004",
        title: "Download the shown releases as CSV",
        priority: "medium",
        steps: [
          [
            "Select CSV",
            "all-releases-<date>.csv: a scope and time line, the column names, one row per shown release",
          ],
        ],
      },
      {
        id: "E2E-RPT-005",
        title: "A lead's All releases covers the projects they lead",
        priority: "high",
        type: "security",
        steps: [
          [
            "As a lead of two projects open All releases",
            '"the projects you lead"; both projects\' releases are listed',
          ],
        ],
      },
    ],
  },
  {
    suite: "Reports › Release report",
    label: "reports",
    cases: [
      {
        id: "E2E-RPT-006",
        title:
          "The report opens on the current release; No release can be chosen",
        priority: "high",
        steps: [
          ["Open Reports", "Release shows the release in progress"],
          [
            "Release: No release",
            "No runs for this choice yet; Start a run opens a new run",
          ],
        ],
      },
      {
        id: "E2E-RPT-007",
        title: "A shipped release shows its sign-off snapshot, or live numbers",
        priority: "high",
        steps: [
          [
            "Choose E2E Baseline's released 1.0",
            '"This is the snapshot taken when 1.0 was released"',
          ],
          ["Show live numbers instead", "Live numbers, with Show the snapshot"],
          ["Show the snapshot", "The snapshot again"],
        ],
      },
      {
        id: "E2E-RPT-008",
        title:
          "Exit checks say whether the release can ship and link to the blockers",
        priority: "critical",
        preconditions: "An open Critical defect found in the release",
        steps: [
          ["Open the report", "Not ready to ship: n of m checks fail"],
          [
            "See them on the Critical check",
            "Defects filtered to Critical in that release",
          ],
        ],
      },
      {
        id: "E2E-RPT-009",
        title: "Key numbers count the latest result per case",
        priority: "high",
        preconditions: "3 Ready cases: 2 passed, 1 failed",
        steps: [
          [
            "Look at Key numbers",
            "Pass rate 67%; Tested 3 of 3 Ready cases; Open defects 1 (1 Critical)",
          ],
        ],
      },
      {
        id: "E2E-RPT-010",
        title: "Download data › Defects gives the release's defects as CSV",
        priority: "medium",
        steps: [
          [
            "Download data › Defects",
            "<KEY>-<release>-defects.csv with a scope line, the columns and the defect",
          ],
        ],
      },
      {
        id: "E2E-RPT-011",
        title: "Download the latest result per case and the runs",
        priority: "medium",
        steps: [
          [
            "Download data › Latest result per case",
            "One row per case with its latest result",
          ],
          ["Download data › Runs", "One row per run"],
        ],
      },
      {
        id: "E2E-RPT-012",
        title: "Every chart has a table view and its own CSV",
        priority: "medium",
        type: "usability",
        steps: [
          ["Pass rate by run › Table", "A table with the run"],
          ["CSV for pass rate by run", "A CSV of that table"],
        ],
      },
      {
        id: "E2E-RPT-013",
        title: "Workload is shown to leads only",
        priority: "medium",
        type: "security",
        steps: [
          [
            "As a lead open the report",
            "Workload lists untested cases per person",
          ],
          ["As a tester", "No Workload section"],
        ],
      },
      {
        id: "E2E-RPT-014",
        title: "Print the one-page release report",
        priority: "high",
        steps: [
          ["Print report", "The print page names the project and release"],
          ["Print or save as PDF", "The browser's print opens"],
          ["In print layout", "The Back and Print buttons aren't printed"],
          ["Back to reports", "The report opens again"],
        ],
      },
      {
        id: "E2E-RPT-015",
        title: "Viewers read reports and download data, but can't start runs",
        priority: "high",
        type: "security",
        steps: [
          ["As a viewer Download data › Runs", "The CSV downloads"],
          ["Release: No release", "No Start a run button"],
        ],
      },
      {
        id: "E2E-RPT-016",
        title: "The report fits a phone screen",
        priority: "medium",
        type: "usability",
        steps: [
          [
            "Open Reports at phone width",
            "Readiness and key numbers stack; no sideways scrolling",
          ],
        ],
      },
      {
        id: "E2E-RPT-017",
        title: "The printed coverage lists sub-suites under their parent",
        priority: "medium",
        preconditions: "BASE: suite Accounts with sub-suite Sign in",
        steps: [
          [
            "Open the print report",
            'Coverage by suite has "Accounts › Sign in" right after Accounts',
          ],
        ],
      },
      {
        id: "E2E-RPT-018",
        title: "The print report stays black on white in dark mode",
        priority: "medium",
        type: "usability",
        steps: [
          [
            "With a dark colour scheme, open the print report and print",
            "The page is white and the title near-black",
          ],
        ],
      },
    ],
  },
]

export default suites
