import type { CatalogueSuite } from "./types.ts"

const suites: CatalogueSuite[] = [
  {
    suite: "Test runs › Runs list",
    label: "runs",
    cases: [
      {
        id: "E2E-RUN-001",
        title: "A project without runs offers to start the first one",
        priority: "medium",
        preconditions: "Signed in as a tester; the project has no runs",
        steps: [
          ["Open Test runs", '"No test runs yet" with Start the first run'],
          ["Select Start the first run", "New test run opens"],
        ],
      },
      {
        id: "E2E-RUN-002",
        title: "Viewers can't start runs",
        priority: "high",
        type: "security",
        steps: [
          [
            "As a viewer, open Test runs of a project without runs",
            "No Start the first run or New run",
          ],
          ["Open runs/new directly", "You don't have access to this page"],
        ],
      },
      {
        id: "E2E-RUN-003",
        title: "Open and Closed tabs show their runs with counts",
        priority: "high",
        preconditions: "One open and one closed run",
        steps: [
          [
            "Open Test runs",
            "Open (1) lists the open run; Closed (1) is a tab",
          ],
          ["Select Closed", 'The closed run, "Closed by …"'],
        ],
      },
      {
        id: "E2E-RUN-004",
        title: "Search runs by ID or name, and clear the filters",
        priority: "medium",
        steps: [
          ["Search for the second run's name", "Only that run is listed"],
          [
            "Search for something that matches nothing",
            '"No open runs match" with Clear filters',
          ],
          ["Select Clear filters", "Every open run is back"],
        ],
      },
      {
        id: "E2E-RUN-005",
        title: "Filter runs by release",
        priority: "medium",
        steps: [
          [
            "Choose a release in the Release filter",
            "Only that release's runs are listed",
          ],
        ],
      },
      {
        id: "E2E-RUN-006",
        title: "My runs shows only runs I started or have cases in",
        priority: "medium",
        steps: [
          [
            "Turn on My runs",
            "Runs started by others with nothing assigned to me disappear",
          ],
        ],
      },
    ],
  },
  {
    suite: "Test runs › New run",
    label: "runs",
    cases: [
      {
        id: "E2E-RUN-007",
        title: "Start a run with every Ready case",
        priority: "critical",
        preconditions: "3 Ready cases and 1 Draft case",
        steps: [
          [
            "New run: name it, keep All Ready cases",
            "The summary says 3 test cases; 1 Draft case is left out",
          ],
          [
            "Create run with 3 cases",
            '"…-R-1 started with 3 cases"; the run opens on the first case',
          ],
        ],
      },
      {
        id: "E2E-RUN-008",
        title: "Include Draft cases adds them to the run",
        priority: "medium",
        steps: [
          ["Tick Include Draft cases", "The summary counts the drafts too"],
        ],
      },
      {
        id: "E2E-RUN-009",
        title: "Choose cases by label",
        priority: "high",
        steps: [
          [
            "By label or filter, Label = smoke",
            "Only the smoke cases are counted",
          ],
        ],
      },
      {
        id: "E2E-RUN-010",
        title: "Choose cases by suite",
        priority: "high",
        steps: [
          [
            "Choose suites, tick Payments",
            "The summary lists Payments and its count",
          ],
          ["Create the run", "Only Payments cases are in it"],
        ],
      },
      {
        id: "E2E-RUN-011",
        title: "Pick single cases by hand",
        priority: "medium",
        steps: [
          [
            "Choose suites › Pick single cases…, search and tick one case",
            '"1 picked"; Done shows "1 picked by hand"',
          ],
          ["Create the run", "The run has that one case"],
        ],
      },
      {
        id: "E2E-RUN-012",
        title: "A run needs a name and at least one case",
        priority: "high",
        steps: [
          [
            "Choose suites without ticking any, leave the name empty, create",
            "Give the run a name; Choose at least one case.",
          ],
        ],
      },
      {
        id: "E2E-RUN-013",
        title: "Release, environment and assignee carry into the run",
        priority: "high",
        steps: [
          [
            "Pick a release, type an environment, assign all cases to the tester",
            "—",
          ],
          [
            "Create the run",
            "The header shows the release and environment; the case says assigned to the tester",
          ],
        ],
      },
    ],
  },
  {
    suite: "Test runs › Recording results",
    label: "runs",
    cases: [
      {
        id: "E2E-RUN-014",
        title: "Record Passed and move to the next untested case",
        priority: "critical",
        steps: [
          [
            "Select Passed",
            '"marked Passed" with Undo; the next untested case opens',
          ],
          ["Look at the progress", "33% complete (1 of 3)"],
        ],
      },
      {
        id: "E2E-RUN-015",
        title: "Failing a case needs a note and can name the step",
        priority: "critical",
        steps: [
          [
            "Select Failed, then Save without a note",
            "Say what went wrong before saving",
          ],
          [
            "Write a note, choose Step 2, save",
            "Results in this run: Failed at step 2, with the note",
          ],
        ],
      },
      {
        id: "E2E-RUN-016",
        title: "Ctrl+Enter saves a Blocked note",
        priority: "medium",
        steps: [
          [
            "Select Blocked, type a note, press Ctrl+Enter",
            "The case is Blocked",
          ],
        ],
      },
      {
        id: "E2E-RUN-017",
        title: "P and S record Passed and Skipped from the keyboard",
        priority: "high",
        type: "usability",
        steps: [["Press P, then S", "Two cases recorded: 1 passed, 1 skipped"]],
      },
      {
        id: "E2E-RUN-018",
        title: "F opens the note, and letters typed there aren't shortcuts",
        priority: "high",
        type: "usability",
        steps: [
          ["Press F", '"What went wrong?" is focused'],
          ['Type "page stuck"', "Nothing is recorded while typing"],
        ],
      },
      {
        id: "E2E-RUN-019",
        title: "J, N and K move between cases",
        priority: "medium",
        type: "usability",
        steps: [["Press J, N, then K", "1 of 3 → 2 of 3 → 3 of 3 → 2 of 3"]],
      },
      {
        id: "E2E-RUN-045",
        title:
          "An unsaved fail note survives moving between cases; leaving the run asks first",
        priority: "high",
        type: "functional",
        steps: [
          ["Press F, type a note, then select Next", "Case 2 opens"],
          [
            "Select Previous",
            "Case 1 shows the Failed form with the typed note",
          ],
          [
            "Select Test runs in the breadcrumb",
            '"Leave without saving?" asks first',
          ],
          ["Keep editing", "Still on the run with the note"],
        ],
      },
      {
        id: "E2E-RUN-046",
        title: "A shortcut pressed right after closing the help works",
        priority: "low",
        type: "usability",
        steps: [["Press ?, then Escape, then P at once", "The case is Passed"]],
      },
      {
        id: "E2E-RUN-047",
        title: "A shortcut pressed before the next case loads is kept",
        priority: "low",
        type: "usability",
        steps: [
          [
            "Press P, then S before the next case's steps load",
            "The first case is Passed, the second Skipped",
          ],
        ],
      },
      {
        id: "E2E-RUN-048",
        title: "The current case and result buttons show a focus ring on Tab",
        priority: "medium",
        type: "usability",
        steps: [
          [
            "Tab to the current case in the list",
            "It shows a solid focus outline",
          ],
          ["Tab on to Passed", "It shows a solid focus outline"],
        ],
      },
      {
        id: "E2E-RUN-049",
        title:
          "The case lane fits phone width and keeps the current case in view",
        priority: "medium",
        type: "usability",
        preconditions: "A run of 40 cases, opened on case 36, at 375px wide",
        steps: [
          [
            "Look at the case lane",
            "No sideways page scroll; the ringed current case is inside the lane's visible box",
          ],
        ],
      },
      {
        id: "E2E-RUN-020",
        title: "U undoes the last result",
        priority: "high",
        steps: [["Press P, then U", "The case is untested again"]],
      },
      {
        id: "E2E-RUN-021",
        title: "? lists the shortcuts, and they can be switched off",
        priority: "medium",
        type: "usability",
        steps: [
          ["Press ?", "Keyboard shortcuts dialog"],
          [
            "Untick Use single-key shortcuts, close, press P",
            "Nothing is recorded",
          ],
          ["Reload", "Still off"],
        ],
      },
      {
        id: "E2E-RUN-022",
        title: "With auto-advance off, saving stays on the case",
        priority: "low",
        steps: [
          [
            "Untick Go to the next untested case after saving, select Passed",
            "The same case stays open",
          ],
        ],
      },
      {
        id: "E2E-RUN-023",
        title: "Search the run's cases and show only some",
        priority: "medium",
        steps: [
          ['Search "case 2"', "Only Run case 2 is listed"],
          ["Show: Failed or blocked", "Only the failed case"],
        ],
      },
      {
        id: "E2E-RUN-024",
        title: "When every case has a result the run says so",
        priority: "medium",
        steps: [
          [
            "Record the last case",
            '"Every case has a result." 1 failed or blocked',
          ],
          [
            "Review failed and blocked",
            "The list shows only failed and blocked cases",
          ],
        ],
      },
    ],
  },
  {
    suite: "Test runs › Working on many cases",
    label: "runs",
    cases: [
      {
        id: "E2E-RUN-025",
        title: "Set one result on several cases",
        priority: "high",
        steps: [
          [
            "Select, tick two cases, Set result… Passed, save",
            '"2 cases marked Passed"',
          ],
        ],
      },
      {
        id: "E2E-RUN-026",
        title: "A bulk Failed needs a note",
        priority: "medium",
        steps: [["Set result… Failed with no note", "Say what went wrong"]],
      },
      {
        id: "E2E-RUN-027",
        title: "Assign cases to someone",
        priority: "high",
        steps: [
          [
            "Select a case, Assign to… the tester",
            '"1 case assigned to …"; the case says assigned to them',
          ],
        ],
      },
      {
        id: "E2E-RUN-028",
        title: "Remove untested cases; cases with results stay",
        priority: "medium",
        steps: [
          [
            "Select one recorded and one untested case, Remove…",
            '"1 case removed", 1 with results stays',
          ],
        ],
      },
      {
        id: "E2E-RUN-029",
        title: "Add cases to an open run",
        priority: "high",
        steps: [
          [
            "Run actions › Add cases…, All Ready cases",
            '"1 case added" (the new one)',
          ],
          ["Add the same again", '"Those cases are already in the run"'],
        ],
      },
      {
        id: "E2E-RUN-030",
        title: "Edit a run's name and environment",
        priority: "medium",
        steps: [
          [
            "Run actions › Edit details and environment…, change both, save",
            '"Run details saved"; the header shows them',
          ],
        ],
      },
      {
        id: "E2E-RUN-031",
        title: "Duplicate a run",
        priority: "medium",
        steps: [
          [
            "Run actions › Duplicate run…, Start run",
            '"…-R-2 started" with the same cases, named "(copy)"',
          ],
        ],
      },
      {
        id: "E2E-RUN-032",
        title: "Start a new run from the failed and blocked cases",
        priority: "high",
        steps: [
          [
            "Run actions › New run from failed and blocked (2)…, Start run",
            "The new run has only those 2 cases",
          ],
        ],
      },
    ],
  },
  {
    suite: "Test runs › Closing and reopening",
    label: "runs",
    cases: [
      {
        id: "E2E-RUN-033",
        title: "A QA Lead can close a run with untested cases",
        priority: "critical",
        steps: [
          [
            "As the lead, look at Close run",
            "It is enabled, with no hint under the progress",
          ],
          [
            "Close run, confirm",
            '"Closed by …", results are read-only, no result buttons',
          ],
        ],
      },
      {
        id: "E2E-RUN-034",
        title:
          "A tester closes their own run only once every case has a result",
        priority: "critical",
        type: "security",
        steps: [
          [
            "As the tester who started it, with one case untested",
            'Close run is disabled: "…once every case has a result (1 left)"',
          ],
          ["Record the last case, Close run", "The run is closed"],
        ],
      },
      {
        id: "E2E-RUN-035",
        title: "A tester can't close someone else's run",
        priority: "high",
        type: "security",
        steps: [
          [
            "As a tester with no cases in the lead's run",
            "No Close run button",
          ],
        ],
      },
      {
        id: "E2E-RUN-036",
        title: "A QA Lead reopens a closed run",
        priority: "high",
        steps: [["Reopen run", '"…reopened"; the result buttons are back']],
      },
      {
        id: "E2E-RUN-037",
        title: "Testers see a closed run as read-only",
        priority: "high",
        type: "security",
        steps: [
          [
            "As a tester, open a closed run",
            "Results are read-only; a QA Lead can reopen it. No Reopen run",
          ],
        ],
      },
      {
        id: "E2E-RUN-038",
        title: "Viewers follow a run without recording",
        priority: "high",
        type: "security",
        steps: [
          [
            "As a viewer, open an open run",
            '"You\'re a Viewer in this project…"; no result buttons',
          ],
        ],
      },
    ],
  },
  {
    suite: "Test runs › Changes and conflicts",
    label: "runs",
    cases: [
      {
        id: "E2E-RUN-039",
        title:
          "A case edited after the run started can be compared and updated",
        priority: "high",
        steps: [
          [
            "Open the case in the run",
            '"This case was edited after the run started"',
          ],
          ["Compare", "Title: the run's copy next to the latest"],
          ["Use the latest version", "The run shows the new title"],
        ],
      },
      {
        id: "E2E-RUN-040",
        title:
          "Using the latest version of a tested case asks first and resets it",
        priority: "medium",
        steps: [
          [
            "Use the latest version… on a passed case, confirm",
            "The case is untested again",
          ],
        ],
      },
      {
        id: "E2E-RUN-041",
        title: "Someone else recorded first: record mine anyway or keep theirs",
        priority: "critical",
        preconditions: "Two people on the same case",
        steps: [
          [
            "The lead records Passed; the tester, still on the old view, records Skipped",
            '"… recorded Passed on this case meanwhile"',
          ],
          ["Keep theirs", "The message goes; the case stays Passed"],
          ["Skipped again, then Record mine anyway", "The case is Skipped"],
        ],
      },
      {
        id: "E2E-RUN-042",
        title: "A run keeps its copy of an archived case",
        priority: "medium",
        steps: [
          [
            "Archive a case, then open it in the run",
            '"The original test case has been archived. The run keeps its copy."',
          ],
        ],
      },
      {
        id: "E2E-RUN-043",
        title: "An unknown run shows Run not found",
        priority: "low",
        steps: [["Open runs/…-R-99", "Run not found, with Back to test runs"]],
      },
      {
        id: "E2E-RUN-044",
        title: "On a phone the case list opens as a sheet",
        priority: "medium",
        type: "usability",
        steps: [
          ["At phone width, select Cases (3 left)", "The list slides in"],
          ["Pick the third case", "It opens and the list closes"],
        ],
      },
    ],
  },
]

export default suites
