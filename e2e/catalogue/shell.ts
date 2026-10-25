import type { CatalogueSuite } from "./types.ts"

const suites: CatalogueSuite[] = [
  {
    suite: "Shell › Navigation",
    label: "shell",
    cases: [
      {
        id: "E2E-SHELL-001",
        title: "Admins see Home, Projects, All releases and Users",
        priority: "high",
        steps: [
          [
            "Signed in as an admin, look at the Main navigation",
            "Home, Projects, All releases, Users",
          ],
        ],
      },
      {
        id: "E2E-SHELL-002",
        title: "Testers see only Home and Projects",
        priority: "high",
        type: "security",
        steps: [
          [
            "Signed in as a tester, look at the Main navigation",
            "Home and Projects; no All releases, no Users",
          ],
        ],
      },
      {
        id: "E2E-SHELL-003",
        title: "A QA Lead of two projects also sees All releases",
        priority: "medium",
        preconditions: "The person leads two active projects",
        steps: [["Look at the Main navigation", "All releases is there"]],
      },
      {
        id: "E2E-SHELL-004",
        title: "Non-admins opening /users see no-access",
        priority: "high",
        type: "security",
        steps: [
          ["As a lead, open /users", "You don't have access to this page"],
        ],
      },
      {
        id: "E2E-SHELL-005",
        title: "Inside a project the sidebar lists its seven pages",
        priority: "medium",
        steps: [
          [
            "Open E2E Baseline",
            "Overview, Test cases, Test runs, Defects, Releases, Reports, Members",
          ],
          [
            "Select Test cases",
            "It's marked current; the header and tab title name the page and project",
          ],
        ],
      },
      {
        id: "E2E-SHELL-006",
        title: "Switch project from the sidebar",
        priority: "high",
        steps: [
          [
            "Open Switch project and type part of a project name",
            "Matching projects lists it",
          ],
          ["Pick it", "Its overview opens and the sidebar names it"],
        ],
      },
      {
        id: "E2E-SHELL-007",
        title: "Unknown pages and projects show not found",
        priority: "medium",
        steps: [
          ["Open /no-such-page", "Page not found, with Go to home"],
          ["Open /projects/NOPE9", "Project not found"],
        ],
      },
      {
        id: "E2E-SHELL-008",
        title:
          "A project the person isn't in looks the same as one that doesn't exist",
        priority: "critical",
        type: "security",
        steps: [
          [
            "As someone outside E2E Baseline, open /projects/BASE",
            "Project not found, saying you may not be a member",
          ],
        ],
      },
    ],
  },
  {
    suite: "Shell › Personal settings",
    label: "shell",
    cases: [
      {
        id: "E2E-SHELL-009",
        title: "The theme menu switches and remembers dark mode",
        priority: "medium",
        type: "usability",
        steps: [
          ["User menu › Theme › Dark", "The app turns dark"],
          ["Reload", "Still dark"],
          ["Choose Same as my device", "Follows the device"],
        ],
      },
      {
        id: "E2E-SHELL-010",
        title: "Skip to content is the first thing the keyboard reaches",
        priority: "medium",
        type: "usability",
        steps: [
          ["Load a page and press Tab", '"Skip to content" appears, focused'],
          ["Press Enter", "Focus moves to the page content"],
        ],
      },
      {
        id: "E2E-SHELL-011",
        title: "The user menu shows who is signed in",
        priority: "low",
        steps: [
          [
            "Open the user menu",
            "Name, @username, Theme, Change password, Sign out",
          ],
        ],
      },
      {
        id: "E2E-SHELL-012",
        title: "On a phone the navigation opens as a sheet",
        priority: "medium",
        type: "usability",
        steps: [
          [
            "At phone width, open the sidebar from the header",
            "The navigation slides in",
          ],
          ["Pick Projects", "Projects opens and the navigation closes"],
        ],
      },
    ],
  },
]

export default suites
