import type { CatalogueSuite } from "./types.ts"

const suites: CatalogueSuite[] = [
  {
    suite: "Defects › Log from a result",
    label: "defects",
    cases: [
      {
        id: "E2E-DEF-001",
        title: "Log a defect from a failed result, prefilled from the case",
        priority: "critical",
        preconditions: "A run case with a Failed result and a note",
        steps: [
          [
            "Open the case in the run, select Log defect…",
            '"Log a defect for this result" says it failed; title is case title + note, Actual is the note, environment comes from the run',
          ],
          [
            "Choose a severity and select Log defect",
            '"<key> logged as New" with Open; the case shows it as a known defect',
          ],
          [
            "Open the defect",
            'New; "Logged by … from a failed result"; the result is linked',
          ],
        ],
      },
      {
        id: "E2E-DEF-002",
        title:
          "A tester logging from a blocked result is told a lead will triage it",
        priority: "high",
        steps: [
          [
            "Log a defect from a Blocked result as a tester",
            'The dialog says blocked; the confirmation adds "A QA Lead will triage it."',
          ],
        ],
      },
      {
        id: "E2E-DEF-003",
        title: "Link a result to a defect already reported on the case",
        priority: "high",
        preconditions: "An open defect on the case from an earlier run",
        steps: [
          [
            "Log defect… on a new failure of the same case",
            '"Already reported?" lists it with "Link this result to <key>"',
          ],
          [
            "Pick it and select Link to <key>",
            '"Linked to <key>"; the defect lists two linked results',
          ],
        ],
      },
      {
        id: "E2E-DEF-004",
        title:
          "A fixed defect failing again is reopened from the log dialog, with a note",
        priority: "high",
        steps: [
          [
            'Pick "This fails again: reopen <key>" and submit without a note',
            "Say what still fails before reopening",
          ],
          [
            "Add the note and submit",
            '"<key> reopened"; the defect is Reopened',
          ],
        ],
      },
      {
        id: "E2E-DEF-005",
        title: "The log dialog checks title and severity",
        priority: "medium",
        steps: [
          [
            "Clear the title and submit without a severity",
            "Give the defect a title; Choose a severity",
          ],
        ],
      },
    ],
  },
  {
    suite: "Defects › New defect",
    label: "defects",
    cases: [
      {
        id: "E2E-DEF-006",
        title: "An empty new defect highlights what's missing",
        priority: "high",
        steps: [
          [
            "Open New defect and select Log defect",
            '"Fill in the highlighted fields…"; title, severity, steps and actual errors; focus on the first',
          ],
        ],
      },
      {
        id: "E2E-DEF-007",
        title: "A tracker link must be a full web address",
        priority: "medium",
        steps: [
          [
            'Enter "jira/PAY-1" as the tracker link and submit',
            "Use a full link starting with https://",
          ],
        ],
      },
      {
        id: "E2E-DEF-008",
        title: "Log a defect by hand",
        priority: "critical",
        steps: [
          [
            "Fill title, severity, steps, actual, release and submit",
            '"<key> logged as New"; the defect page opens',
          ],
          [
            "Look at the header",
            'New; "Logged by hand by …"; found in the chosen release',
          ],
        ],
      },
      {
        id: "E2E-DEF-009",
        title: "Viewers can't log defects",
        priority: "high",
        type: "security",
        steps: [
          ["As a viewer open Defects", "No New defect button"],
          ["Open defects/new directly", "You don't have access to this page"],
        ],
      },
    ],
  },
  {
    suite: "Defects › List",
    label: "defects",
    cases: [
      {
        id: "E2E-DEF-010",
        title:
          "Active and Closed or rejected tabs split the defects, with counts",
        priority: "high",
        steps: [
          [
            "Open Defects in E2E Baseline",
            "Active (3) lists new, open and fixed defects",
          ],
          ["Select Closed or rejected (1)", "Only the closed defect"],
        ],
      },
      {
        id: "E2E-DEF-011",
        title: "Search by ID or title, and clear filters when nothing matches",
        priority: "high",
        steps: [
          ["Search a word from one title", "Only that defect"],
          ["Search its key", "Only that defect"],
          [
            "Search nonsense",
            "No defects match these filters; Clear filters brings all back",
          ],
        ],
      },
      {
        id: "E2E-DEF-012",
        title: "Filter by status and severity",
        priority: "medium",
        steps: [
          ["Status: Open", "Only open defects"],
          ["Status any, Severity: Critical", "Only critical defects"],
        ],
      },
      {
        id: "E2E-DEF-013",
        title: "Filter by priority, assignee, reporter and release",
        priority: "medium",
        steps: [
          ["Priority: High", "Only defects with priority High"],
          ["Assignee: a person", "Only theirs"],
          ["Reported by: Me", "Only mine"],
          ["Found in release", "Only that release's defects"],
        ],
      },
      {
        id: "E2E-DEF-014",
        title: "Assigned to me shows only my defects",
        priority: "medium",
        steps: [
          [
            "Press Assigned to me",
            "Only defects assigned to the signed-in person; the button shows as pressed",
          ],
        ],
      },
      {
        id: "E2E-DEF-015",
        title: "Sort by severity puts critical first",
        priority: "low",
        steps: [["Sort: Severity", "The critical defect is first"]],
      },
      {
        id: "E2E-DEF-016",
        title: "Leads see new defects waiting for triage",
        priority: "high",
        steps: [
          [
            "As a lead open Defects with a New defect",
            '"1 new defect is waiting for triage" with Show new defects',
          ],
          ["Select Show new defects", "Status filter is New"],
          ["As a tester", "No triage banner"],
        ],
      },
      {
        id: "E2E-DEF-017",
        title: "Filters live in the address, so reload and links keep them",
        priority: "low",
        steps: [["Filter, then reload", "Same filters and results"]],
      },
      {
        id: "E2E-DEF-018",
        title: "A project with no defects explains where they come from",
        priority: "low",
        steps: [
          [
            "As a tester open Defects in a new project",
            "No defects yet; Go to test runs; Log one by hand",
          ],
        ],
      },
      {
        id: "E2E-DEF-019",
        title: "On a phone the list folds status and severity under the title",
        priority: "medium",
        type: "usability",
        steps: [
          [
            "Open Defects at phone width",
            "Each row shows title, status and severity without sideways scrolling",
          ],
        ],
      },
    ],
  },
  {
    suite: "Defects › Details and fields",
    label: "defects",
    cases: [
      {
        id: "E2E-DEF-020",
        title: "Edit a defect's details; required text can't be emptied",
        priority: "high",
        steps: [
          [
            "Edit, empty Steps to reproduce, save",
            "Steps to reproduce can't be empty",
          ],
          [
            "Change the title and save",
            '"Details saved"; the new title is the heading',
          ],
        ],
      },
      {
        id: "E2E-DEF-021",
        title:
          "Editing over someone else's change says so and can load their version",
        priority: "high",
        preconditions: "Someone else saves the defect after it was opened",
        steps: [
          ["Save details", "It says who changed it; the text is kept"],
          ["Reload their version", "Their title shows"],
        ],
      },
      {
        id: "E2E-DEF-022",
        title: "Testers change fields; priority is the lead's",
        priority: "high",
        type: "security",
        steps: [
          ["As a tester change Severity", "Saved"],
          ["Look at Priority", "Not set yet, set by a QA Lead; not editable"],
        ],
      },
      {
        id: "E2E-DEF-023",
        title: "A lead sets priority and assignee; they stay after reload",
        priority: "high",
        steps: [["Set Priority High and an assignee, reload", "Both kept"]],
      },
      {
        id: "E2E-DEF-024",
        title: "Viewers read defects without edit controls",
        priority: "high",
        type: "security",
        steps: [
          [
            "As a viewer open a defect",
            '"You\'re a Viewer…"; no Edit, no workflow buttons, no comment box',
          ],
        ],
      },
      {
        id: "E2E-DEF-025",
        title: "An unknown defect key shows not found",
        priority: "low",
        steps: [
          [
            "Open defects/<KEY>-D-999",
            "Defect not found, with Back to defects",
          ],
        ],
      },
    ],
  },
  {
    suite: "Defects › Workflow",
    label: "defects",
    cases: [
      {
        id: "E2E-DEF-026",
        title: "A new defect waits for a lead; the lead confirms it",
        priority: "critical",
        steps: [
          [
            "As a tester open a New defect",
            'No move buttons; "Waiting for a QA Lead to confirm it…"',
          ],
          [
            "As a lead select Confirm (Open)",
            "Open; the status history reads New, then Open",
          ],
        ],
      },
      {
        id: "E2E-DEF-027",
        title: "Rejecting as a duplicate needs the original defect",
        priority: "high",
        steps: [
          [
            "As a lead Reject… with reason Duplicate and no original",
            "Choose the original defect",
          ],
          [
            "Search and pick the original, Reject defect",
            'Rejected; "Resolution: Duplicate of <key>" links to it',
          ],
        ],
      },
      {
        id: "E2E-DEF-028",
        title: "Start work and mark fixed with the build",
        priority: "critical",
        steps: [
          ["As a tester Start work on an open defect", "In progress"],
          [
            "Mark fixed…, enter build 4.2.0-rc2, confirm",
            "Fixed – awaiting retest; Fixed in shows the build",
          ],
        ],
      },
      {
        id: "E2E-DEF-029",
        title: "Close a fixed defect as verified",
        priority: "critical",
        steps: [
          ["Verified, close…, then Close defect", "Closed"],
          ["As a tester", 'No reopen; "Failing again? Log a new defect…"'],
        ],
      },
      {
        id: "E2E-DEF-030",
        title: "Reopening a fixed defect needs a note and counts",
        priority: "high",
        steps: [
          ["Still failing, reopen… without a note", "Say what still fails"],
          [
            "Add a note, Reopen defect",
            "Reopened; Reopened 1×; the note is in the activity",
          ],
        ],
      },
      {
        id: "E2E-DEF-031",
        title: "Only a lead reopens a closed or rejected defect",
        priority: "high",
        type: "security",
        steps: [["As a lead Reopen… a closed defect with a note", "Reopened"]],
      },
    ],
  },
  {
    suite: "Defects › Activity and links",
    label: "defects",
    cases: [
      {
        id: "E2E-DEF-032",
        title: "Comment on a defect; activity lists every change",
        priority: "high",
        steps: [
          [
            "Write a comment and select Comment",
            "It shows with my name; Comments (1)",
          ],
          ["Everything tab", "Logging and the status change are listed too"],
        ],
      },
      {
        id: "E2E-DEF-033",
        title: "Unlink a result and undo it",
        priority: "medium",
        steps: [
          [
            "Unlink the linked result",
            '"Unlinked <case> in <run>" with Undo, focused',
          ],
          ["Undo", "The result is linked again and its Unlink has focus"],
        ],
      },
      {
        id: "E2E-DEF-034",
        title: "A passed retest closes a fixed defect from the run",
        priority: "critical",
        preconditions: "A fixed defect on the case; a new run of the case",
        steps: [
          [
            "Record Passed on the case",
            '"Retesting <key>" with Close <key> as verified',
          ],
          ["Select it", '"<key> closed as verified"; the defect is Closed'],
        ],
      },
      {
        id: "E2E-DEF-035",
        title: "A failed retest offers to reopen the fixed defect",
        priority: "high",
        steps: [
          [
            "Record Failed with a note on the case",
            '"Still failing: reopen <key>…" opens the log dialog with that defect picked',
          ],
        ],
      },
    ],
  },
]

export default suites
