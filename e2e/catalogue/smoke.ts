import type { CatalogueSuite } from "./types.ts"

const suites: CatalogueSuite[] = [
  {
    suite: "Smoke",
    label: "smoke",
    cases: [
      {
        id: "E2E-SMOKE-001",
        title: "The API answers through the web app",
        priority: "critical",
        steps: [["Request /api/health from the web origin", "200 OK"]],
      },
      {
        id: "E2E-SMOKE-002",
        title: "A signed-in admin lands on Home",
        priority: "critical",
        preconditions: "Signed in as an admin",
        steps: [
          [
            "Open /",
            "Home shows its heading and the tab title ends in QA Portal",
          ],
        ],
      },
    ],
  },
]

export default suites
