import type { CatalogueSuite } from "./types.ts"

const suites: CatalogueSuite[] = [
  {
    suite: "Errors › Failures and recovery",
    label: "errors",
    cases: [
      {
        id: "E2E-ERR-001",
        title: "A list that fails to load says so and recovers with Try again",
        priority: "high",
        preconditions: "The test runs request answers 500",
        steps: [
          ["Open Test runs", '"Couldn\'t load test runs" with Try again'],
          [
            "Let the server answer again, then Try again",
            "The runs list shows",
          ],
        ],
      },
      {
        id: "E2E-ERR-002",
        title: "A result whose save fails says so and can be retried",
        priority: "critical",
        preconditions: "An open run; the connection drops while saving",
        steps: [
          [
            "Press P",
            '"The result wasn\'t saved" with Try again; nothing counted',
          ],
          ["Once the connection is back, Try again", "The result is recorded"],
        ],
      },
      {
        id: "E2E-ERR-003",
        title: "A failed save keeps what was typed in the case editor",
        priority: "high",
        preconditions: "Creating a test case answers 500",
        steps: [
          [
            "Fill the title and step 1, then Create test case",
            "An error shows; the title is still there",
          ],
          [
            "Let the server answer again, then Create test case",
            "The case is created",
          ],
        ],
      },
      {
        id: "E2E-ERR-004",
        title:
          "When the session ends while the page is open, the next step goes to sign-in",
        priority: "high",
        steps: [
          [
            "Signed in on Home, the session cookie goes away",
            "Nothing changes yet",
          ],
          ["Open Projects from the sidebar", "The sign-in screen shows"],
        ],
      },
      {
        id: "E2E-ERR-005",
        title: "A page whose code can't be downloaded offers a reload",
        priority: "medium",
        preconditions: "Signed in as an admin; new page code fails to download",
        steps: [
          [
            "Open Users from the sidebar",
            '"This page couldn\'t load" with Reload and Go to home',
          ],
        ],
      },
      {
        id: "E2E-ERR-006",
        title: "A result recorded while offline is saved on reconnect",
        priority: "high",
        preconditions: "An open run; the browser goes offline",
        steps: [
          [
            "Press P while offline",
            "Nothing is counted yet; a status says it will save when back online",
          ],
          ["Go back online", "The result is recorded and the next case opens"],
        ],
      },
    ],
  },
]

export default suites
