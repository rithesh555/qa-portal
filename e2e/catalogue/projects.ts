import type { CatalogueSuite } from "./types.ts"

const suites: CatalogueSuite[] = [
  {
    suite: "Projects › List",
    label: "projects",
    cases: [
      {
        id: "E2E-PROJ-001",
        title: "Admins see every project in a table and can search by key",
        priority: "high",
        steps: [
          [
            "As an admin, open Projects",
            "A table with Project, QA Leads, Members, Current release; New project is offered",
          ],
          [
            "Search for a project key",
            "That project is listed with its QA Lead",
          ],
        ],
      },
      {
        id: "E2E-PROJ-002",
        title: "Members see only their projects, as cards with their role",
        priority: "critical",
        type: "security",
        steps: [
          [
            "As a tester, open Projects",
            "Cards for their projects with the Tester badge; no New project",
          ],
          ["Look for a project they're not in", "It isn't listed"],
        ],
      },
      {
        id: "E2E-PROJ-003",
        title: "Someone on no project is told how to get added",
        priority: "medium",
        steps: [
          [
            "As a member of no project, open Projects",
            '"You\'re not on any project yet" with their username to share',
          ],
        ],
      },
      {
        id: "E2E-PROJ-004",
        title: "Project cards fit a phone screen",
        priority: "low",
        type: "usability",
        steps: [
          [
            "At phone width, open Projects as a tester",
            "Cards stack in one column and open the project",
          ],
        ],
      },
    ],
  },
  {
    suite: "Projects › Create and edit",
    label: "projects",
    cases: [
      {
        id: "E2E-PROJ-005",
        title: "Create a project with its first QA Lead",
        priority: "critical",
        steps: [
          ["New project; type a name", "A key is suggested from the name"],
          [
            "Pick the first QA Lead and Create project",
            '"<name> created"; its overview opens with that lead',
          ],
        ],
      },
      {
        id: "E2E-PROJ-006",
        title: "New project checks name, key and lead",
        priority: "high",
        steps: [
          [
            "Create project with nothing filled in",
            "Enter a project name; choose the first QA Lead",
          ],
          [
            "Type a key starting with a digit",
            "Use 2–6 capital letters or digits, starting with a letter",
          ],
        ],
      },
      {
        id: "E2E-PROJ-007",
        title: "A key that's already used is refused",
        priority: "high",
        steps: [
          [
            "Create a project with an existing key",
            "Another project already uses this key. Choose another.",
          ],
        ],
      },
      {
        id: "E2E-PROJ-008",
        title: "Admins aren't offered as a project's QA Lead",
        priority: "medium",
        type: "security",
        steps: [
          [
            "Search the First QA Lead picker for an admin's username",
            "No active person matches (admins open every project anyway)",
          ],
        ],
      },
      {
        id: "E2E-PROJ-009",
        title: "Edit a project's name and description",
        priority: "high",
        steps: [
          [
            "Project actions › Edit details; change name and description; Save changes",
            '"Project details saved"; the overview shows them',
          ],
        ],
      },
      {
        id: "E2E-PROJ-010",
        title:
          "Editing a project someone else just changed: load their version",
        priority: "high",
        preconditions:
          "Someone renames the project while the edit dialog is open",
        steps: [
          [
            "Save changes",
            "It says the project was changed meanwhile, offering Load their version / Save mine anyway",
          ],
          ["Load their version", "The form shows their name"],
        ],
      },
      {
        id: "E2E-PROJ-011",
        title: "Editing a project someone else just changed: save mine anyway",
        priority: "medium",
        steps: [
          [
            "After the conflict, Save mine anyway",
            '"Project details saved"; my name wins',
          ],
        ],
      },
    ],
  },
  {
    suite: "Projects › Archive",
    label: "projects",
    cases: [
      {
        id: "E2E-PROJ-012",
        title: "Archive a project: read-only and on the Archived tab",
        priority: "critical",
        steps: [
          [
            "Project actions › Archive project; confirm",
            '"<name> archived"; "This project is archived" banner',
          ],
          ["Open Releases", "No New release button"],
          [
            "Projects › Archived tab",
            "The project is listed there, not under Active",
          ],
        ],
      },
      {
        id: "E2E-PROJ-013",
        title: "Restore an archived project",
        priority: "high",
        steps: [
          [
            "Project actions › Restore project",
            '"<name> restored"; the banner is gone',
          ],
        ],
      },
      {
        id: "E2E-PROJ-014",
        title: "Members of an archived project can read it but not change it",
        priority: "high",
        type: "security",
        steps: [
          [
            "As its QA Lead, open the archived project",
            "The banner says an admin can restore it; no Project actions",
          ],
          [
            "Try to add a release through the API",
            "409: the project is archived",
          ],
        ],
      },
    ],
  },
  {
    suite: "Projects › Overview",
    label: "projects",
    cases: [
      {
        id: "E2E-PROJ-015",
        title: "The overview shows my role, the team and links by role",
        priority: "high",
        steps: [
          [
            "As the QA Lead, open the overview",
            "You: QA Lead; QA Leads named; counts of leads, testers, viewers; Manage members",
          ],
          ["As a tester", "You: Tester; See members"],
        ],
      },
      {
        id: "E2E-PROJ-016",
        title: "The current release card links to its report",
        priority: "medium",
        steps: [
          ["With no release in progress", "No release is in progress."],
          [
            "With one in progress",
            'Its name, status and dates; "Can it ship? See the release report" opens Reports for it',
          ],
        ],
      },
      {
        id: "E2E-PROJ-017",
        title: "Recent activity lists what happened in the project",
        priority: "medium",
        steps: [
          [
            "Add a release, then open the overview",
            "Recent activity names who did it",
          ],
        ],
      },
      {
        id: "E2E-PROJ-018",
        title: "A project without an active QA Lead is flagged",
        priority: "medium",
        preconditions: "The project's only lead has been deactivated",
        steps: [
          [
            "Open its overview",
            "No active QA Lead. An admin should assign one.",
          ],
          ["Admin › Projects table", "No active lead"],
        ],
      },
    ],
  },
  {
    suite: "Projects › Members",
    label: "members",
    cases: [
      {
        id: "E2E-MEMB-001",
        title: "A QA Lead adds several people at once with one role",
        priority: "critical",
        steps: [
          [
            "Add members; search and tick two people; Role Viewer; Add 2 people",
            '"Added 2 people as Viewer"',
          ],
          ["Look at the list", "Both listed as Viewer"],
        ],
      },
      {
        id: "E2E-MEMB-002",
        title: "People already on the project can't be added twice",
        priority: "medium",
        steps: [
          [
            "Search for a current tester in Add members",
            '"Already a Tester"; their box can\'t be ticked',
          ],
        ],
      },
      {
        id: "E2E-MEMB-003",
        title: "Deactivated people can't be added",
        priority: "high",
        type: "security",
        steps: [
          [
            "Search for a deactivated person in Add members",
            "No active person matches.",
          ],
        ],
      },
      {
        id: "E2E-MEMB-004",
        title: "Change someone's project role",
        priority: "high",
        steps: [
          ["Set Role for a new tester to QA Lead", '"<name> is now QA Lead"'],
        ],
      },
      {
        id: "E2E-MEMB-005",
        title: "The only QA Lead can't be removed or demoted by a lead",
        priority: "critical",
        steps: [
          [
            "As the only QA Lead, open Members",
            '"Only QA Lead"; their role and Leave are disabled; a note explains why',
          ],
        ],
      },
      {
        id: "E2E-MEMB-006",
        title: "An admin changing the last QA Lead confirms first",
        priority: "high",
        steps: [
          [
            "As an admin, set the only lead's role to Tester",
            '"Make <name> Tester?" warns there\'ll be no lead',
          ],
          ["Change role", '"<name> is now Tester"'],
        ],
      },
      {
        id: "E2E-MEMB-007",
        title: "Remove a member; they lose access straight away",
        priority: "critical",
        type: "security",
        steps: [
          ["Remove <tester>; confirm", '"<name> removed from <project>"'],
          ["They open the project", "Project not found"],
        ],
      },
      {
        id: "E2E-MEMB-008",
        title: "A QA Lead leaves a project that has another lead",
        priority: "medium",
        steps: [
          ["Leave <project>; confirm", '"You left <project>"; Projects opens'],
        ],
      },
      {
        id: "E2E-MEMB-009",
        title: "Testers and viewers see members read-only",
        priority: "high",
        type: "security",
        steps: [
          [
            "As a tester, open Members",
            "No Add members; roles as text; no Remove",
          ],
        ],
      },
      {
        id: "E2E-MEMB-010",
        title: "Filter members by role and search",
        priority: "medium",
        steps: [
          ["Select the Viewers tab", "Only viewers"],
          ["Search a name with no match", "No members match"],
        ],
      },
      {
        id: "E2E-MEMB-011",
        title: "Admins aren't listed as members",
        priority: "low",
        steps: [
          [
            "Open Members",
            "The count says admins can open every project and aren't listed",
          ],
        ],
      },
      {
        id: "E2E-MEMB-012",
        title: "Manage members on a phone",
        priority: "low",
        type: "usability",
        steps: [
          [
            "At phone width, add a member",
            "The dialog fits and the member is added",
          ],
        ],
      },
    ],
  },
  {
    suite: "Projects › Releases",
    label: "releases",
    cases: [
      {
        id: "E2E-REL-001",
        title: "A QA Lead creates a release",
        priority: "critical",
        steps: [
          [
            "New release; name, summary, In progress, dates; Create release",
            '"Release <name> created"',
          ],
          ["Look at the list", "Name, summary, In progress badge and dates"],
        ],
      },
      {
        id: "E2E-REL-002",
        title: "Release names are unique within a project",
        priority: "high",
        steps: [
          [
            "Create a release with an existing name",
            "This project already has a release with that name. Choose another.",
          ],
        ],
      },
      {
        id: "E2E-REL-003",
        title: "The target date can't be before the start date",
        priority: "medium",
        steps: [
          [
            "Enter a target date before the start date",
            "The target date can't be before the start date",
          ],
        ],
      },
      {
        id: "E2E-REL-004",
        title: "Mark a release as released",
        priority: "high",
        steps: [
          [
            "Edit release; Status Released; Save changes",
            '"Release <name> saved"; Released badge',
          ],
        ],
      },
      {
        id: "E2E-REL-005",
        title: "Editing a release someone else changed: load their version",
        priority: "high",
        steps: [
          [
            "Someone renames it while I edit; Save changes",
            "Changed meanwhile, with Load their version / Save mine anyway",
          ],
          ["Load their version", "The form shows their name"],
        ],
      },
      {
        id: "E2E-REL-006",
        title: "Editing a release someone else changed: save mine anyway",
        priority: "medium",
        steps: [
          [
            "After the conflict, Save mine anyway",
            '"Release <name> saved"; my values win',
          ],
        ],
      },
      {
        id: "E2E-REL-007",
        title: "A project with no releases says who adds them",
        priority: "low",
        steps: [
          ["As the QA Lead", "No releases yet: create one with New release"],
          [
            "As a tester",
            "A QA Lead adds releases for this project; no New release",
          ],
        ],
      },
      {
        id: "E2E-REL-008",
        title: "Testers and viewers can't add or edit releases",
        priority: "high",
        type: "security",
        steps: [
          [
            "As a viewer, open Releases",
            "The list without New release or edit buttons",
          ],
          ["Try to create one through the API", "403"],
        ],
      },
    ],
  },
]

export default suites
