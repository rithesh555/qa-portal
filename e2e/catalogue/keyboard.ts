import type { CatalogueSuite } from "./types.ts"

const suites: CatalogueSuite[] = [
  {
    suite: "Accessibility › Keyboard only",
    label: "keyboard",
    cases: [
      {
        id: "E2E-KEY-001",
        title:
          "Sign in, open a run, fail a case and log its defect with the keyboard only",
        priority: "high",
        type: "usability",
        preconditions: "A tester on a project with an open run; no mouse",
        steps: [
          ["Type username, Tab, password, Enter", "Home opens"],
          [
            "Tab to Projects, the project, Test runs and the run; Enter each",
            "The run opens",
          ],
          [
            "Press F, type a note, Ctrl+Enter",
            "Case 1 is Failed and case 2 opens",
          ],
          [
            "Press K, Tab to Log defect, Enter",
            "The Log a defect dialog opens",
          ],
          [
            "Tab to Title and type it; Tab to Severity, Enter, arrow to Major, Enter; Tab to Log defect, Enter",
            "The defect is logged",
          ],
        ],
      },
    ],
  },
]

export default suites
