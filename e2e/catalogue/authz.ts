import type { CatalogueSuite } from "./types.ts"

const row = (
  id: string,
  title: string,
  allowed: string,
  refused: string
): CatalogueSuite["cases"][number] => ({
  id,
  title,
  priority: "critical",
  type: "security",
  preconditions:
    "A project with a QA Lead, a Tester and a Viewer; someone outside it; the admin",
  steps: [
    [`As ${allowed}`, "The API accepts it"],
    [
      `As ${refused}`,
      "Refused: 403 for members without the right, 404 for people outside the project",
    ],
  ],
})

const suites: CatalogueSuite[] = [
  {
    suite: "Access › API permissions",
    label: "authz",
    cases: [
      row(
        "E2E-AUTHZ-001",
        "View a project",
        "admin, lead, tester, viewer",
        "an outsider (404) or nobody signed in (401)"
      ),
      row(
        "E2E-AUTHZ-002",
        "Create a project",
        "admin",
        "lead, tester, viewer, outsider"
      ),
      row(
        "E2E-AUTHZ-003",
        "Rename a project",
        "admin",
        "lead, tester, viewer, outsider"
      ),
      row(
        "E2E-AUTHZ-004",
        "Add members",
        "admin, lead",
        "tester, viewer, outsider"
      ),
      row(
        "E2E-AUTHZ-005",
        "Create a release",
        "admin, lead",
        "tester, viewer, outsider"
      ),
      row(
        "E2E-AUTHZ-006",
        "Create a test case",
        "admin, lead, tester",
        "viewer, outsider"
      ),
      row(
        "E2E-AUTHZ-007",
        "Archive a test case",
        "admin, lead",
        "tester, viewer, outsider"
      ),
      row(
        "E2E-AUTHZ-008",
        "Create a test run",
        "admin, lead, tester",
        "viewer, outsider"
      ),
      row(
        "E2E-AUTHZ-009",
        "Record a result",
        "admin, lead, tester",
        "viewer, outsider"
      ),
      row(
        "E2E-AUTHZ-010",
        "Reopen a closed run",
        "admin, lead",
        "tester, viewer, outsider"
      ),
      row(
        "E2E-AUTHZ-011",
        "Create a defect",
        "admin, lead, tester",
        "viewer, outsider"
      ),
      row(
        "E2E-AUTHZ-012",
        "Triage a new defect (New → Open)",
        "admin, lead",
        "tester, viewer, outsider"
      ),
      row(
        "E2E-AUTHZ-013",
        "Comment on a defect",
        "admin, lead, tester",
        "viewer, outsider"
      ),
      row(
        "E2E-AUTHZ-014",
        "View project reports",
        "admin, lead, tester, viewer",
        "outsider"
      ),
      row(
        "E2E-AUTHZ-015",
        "Export test cases",
        "admin, lead, tester, viewer",
        "outsider"
      ),
      row(
        "E2E-AUTHZ-016",
        "List users",
        "admin",
        "lead, tester, viewer, outsider"
      ),
      row(
        "E2E-AUTHZ-017",
        "Create a user",
        "admin",
        "lead, tester, viewer, outsider"
      ),
      row(
        "E2E-AUTHZ-018",
        "Deactivate a user",
        "admin",
        "lead, tester, viewer, outsider"
      ),
      {
        id: "E2E-AUTHZ-019",
        title: "Nobody signed in gets 401 everywhere",
        priority: "critical",
        type: "security",
        steps: [
          [
            "Without a session, call /api/me, /api/projects, /api/home and /api/users",
            "401 for each",
          ],
        ],
      },
      {
        id: "E2E-AUTHZ-020",
        title:
          "Another project's items can't be reached through your own project",
        priority: "critical",
        type: "security",
        preconditions: "The lead leads project A; project B is someone else's",
        steps: [
          [
            "As A's lead, ask for B's test case, run and defect under A's key",
            "404 for each",
          ],
        ],
      },
      {
        id: "E2E-AUTHZ-021",
        title: "Writes from another site are refused",
        priority: "critical",
        type: "security",
        steps: [
          [
            "Send a signed-in write with Origin https://evil.example",
            "403; nothing is created",
          ],
        ],
      },
    ],
  },
]

export default suites
