import type { CatalogueCase, CatalogueSuite } from "./types.ts"

const c = (
  id: string,
  title: string,
  priority: CatalogueCase["priority"],
  steps: [string, string][],
  extra: Partial<CatalogueCase> = {}
): CatalogueCase => ({ id, title, priority, steps, ...extra })

const suites: CatalogueSuite[] = [
  {
    suite: "Test cases › List",
    label: "cases",
    cases: [
      c(
        "E2E-CASE-001",
        "The list shows the project's active cases and suites",
        "high",
        [
          [
            "Open Test cases of E2E Baseline",
            '"30 active cases in 3 suites"; the table lists them',
          ],
        ]
      ),
      c("E2E-CASE-002", "Search by title narrows the list", "high", [
        [
          'Type "case 07" in Search by ID or title',
          "Only Sign-in case 07 is listed",
        ],
      ]),
      c("E2E-CASE-003", "Search by case ID finds that case", "high", [
        ["Search for BASE-TC-5", "Only BASE-TC-5 is listed"],
      ]),
      c("E2E-CASE-004", "Filter by status shows only drafts", "medium", [
        ["Status › Draft", "4 cases, all Draft"],
      ]),
      c("E2E-CASE-005", "Filter by priority", "medium", [
        ["Priority › Critical", "Showing 1–8 of 8 cases"],
      ]),
      c("E2E-CASE-006", "Filter by type", "medium", [
        ["Type › Security", "Showing 1–6 of 6 cases"],
      ]),
      c("E2E-CASE-007", "Filter by label", "medium", [
        ["Label › smoke", "Showing 1–10 of 10 cases"],
      ]),
      c(
        "E2E-CASE-008",
        "The Archived status shows archived cases only",
        "medium",
        [
          [
            "Status › Archived",
            'Only "Retired: pay by cheque", marked Archived',
          ],
        ]
      ),
      c("E2E-CASE-009", "Sort by title", "low", [
        ["Sort › Sort: Title", "The list starts with Account case 02"],
      ]),
      c(
        "E2E-CASE-010",
        "No matches shows an empty state with Clear filters",
        "medium",
        [
          [
            "Search for something that doesn't exist",
            "No test cases match these filters",
          ],
          ["Select Clear filters", "All 30 cases are back"],
        ]
      ),
      c("E2E-CASE-011", "Pagination moves through the list", "medium", [
        [
          "Open the list with 10 per page",
          "Showing 1–10 of 30 cases, Page 1 of 3",
        ],
        ["Select Next", "Showing 11–20 of 30 cases, Page 2 of 3"],
      ]),
      c(
        "E2E-CASE-012",
        "Filters are kept in the address and survive a reload",
        "medium",
        [
          [
            'Search "case 0", then Priority › High',
            "2 cases; the address holds both",
          ],
          ["Reload", "The same filters and results"],
        ]
      ),
      c(
        "E2E-CASE-013",
        "Viewers can read and export but not change test cases",
        "high",
        [
          [
            "As a viewer, open Test cases",
            "A notice says you can read and export; Export is there",
          ],
          [
            "Look for New test case, Import and row checkboxes",
            "None are shown",
          ],
        ],
        { type: "security" }
      ),
      c(
        "E2E-CASE-014",
        "Selecting a title opens its preview beside the list",
        "high",
        [
          [
            "Select a case title",
            "Test case preview shows its title, steps and expected results",
          ],
          ["Select Close preview", "The preview closes"],
        ]
      ),
      c(
        "E2E-CASE-015",
        "Open a case as a full page from its preview",
        "medium",
        [
          [
            "In the preview select Open … as a full page",
            "The case page opens with a Test cases breadcrumb",
          ],
        ]
      ),
      c("E2E-CASE-016", "An unknown case ID shows not found", "low", [
        ["Open /projects/BASE/cases/BASE-TC-999", "Test case not found"],
      ]),
      c(
        "E2E-CASE-017",
        "Copy link puts the case's address on the clipboard",
        "low",
        [
          [
            "Select Copy link to the case",
            '"Link to … copied"; the clipboard holds the case URL',
          ],
        ]
      ),
      c(
        "E2E-CASE-018",
        "History lists who created and changed a case",
        "medium",
        [
          [
            "Open a case that was edited, then History",
            "Created this case, and the rename, with names and times",
          ],
        ]
      ),
      c(
        "E2E-CASE-019",
        "On a phone the preview opens as a full-width sheet",
        "medium",
        [
          [
            "At phone width select a case title",
            "The preview slides in over the list and closes again",
          ],
        ],
        { type: "usability" }
      ),
      c(
        "E2E-CASE-020",
        "On a phone the suite is chosen from a select",
        "medium",
        [
          [
            "At phone width choose Suite › Checkout",
            "Only Checkout cases are listed",
          ],
        ],
        { type: "usability" }
      ),
    ],
  },
  {
    suite: "Test cases › Suites",
    label: "cases",
    cases: [
      c("E2E-SUITE-001", "Create a suite", "high", [
        [
          "New suite, name it, Create suite",
          '"Suite … created"; it\'s selected in the tree',
        ],
      ]),
      c("E2E-SUITE-002", "Add a sub-suite and collapse it", "high", [
        [
          "Actions for the suite › Add sub-suite…",
          "The sub-suite shows under it",
        ],
        [
          "Collapse the suite",
          "The sub-suite is hidden; Expand shows it again",
        ],
      ]),
      c("E2E-SUITE-003", "Rename a suite", "medium", [
        [
          "Actions › Rename or move…, change the name, Save suite",
          "The tree shows the new name",
        ],
      ]),
      c("E2E-SUITE-004", "Move a sub-suite to the top level", "medium", [
        [
          "Rename or move… on a sub-suite, Inside › Top level",
          "It becomes a top-level suite",
        ],
      ]),
      c(
        "E2E-SUITE-005",
        "An empty suite offers to add a case in it",
        "medium",
        [
          [
            "Select an empty suite",
            "No test cases in … yet, with New case in this suite",
          ],
          [
            "Select New case in this suite",
            "The editor opens with that suite chosen",
          ],
        ]
      ),
      c("E2E-SUITE-006", "Archiving a suite archives its cases", "high", [
        [
          "Actions › Archive suite…",
          "The dialog says 2 cases are archived with it",
        ],
        [
          "Archive suite and 2 cases",
          "The suite is gone; Status › Archived lists both cases",
        ],
      ]),
      c("E2E-SUITE-007", "Suite names can't contain path separators", "low", [
        ['Create a suite named "A / B"', "Suite names can't contain / › or >"],
      ]),
      c(
        "E2E-SUITE-008",
        "Testers can't archive suites",
        "medium",
        [
          [
            "As a tester open Actions for a suite",
            "Rename or move and Add sub-suite; no Archive suite",
          ],
        ],
        { type: "security" }
      ),
      c("E2E-SUITE-009", "No suite lists cases outside any suite", "low", [
        ["Select No suite", "Only cases without a suite are listed"],
      ]),
    ],
  },
  {
    suite: "Test cases › Editor",
    label: "cases",
    cases: [
      c("E2E-CASE-021", "Create a test case with every field", "critical", [
        [
          "New test case; fill title, suite, priority, type, Ready, labels, references, preconditions and two steps",
          "—",
        ],
        ["Create test case", '"… created"; the case page shows every value'],
      ]),
      c("E2E-CASE-022", "Required fields are checked before saving", "high", [
        [
          "Create test case with an empty title and step",
          "Enter a title; Describe what the tester does",
        ],
      ]),
      c(
        "E2E-CASE-023",
        "Save and add another keeps the suite and starts a fresh form",
        "medium",
        [
          [
            "Fill a case in a suite, Save and add another",
            '"… created"; the form is empty, focused on Title, same suite',
          ],
        ]
      ),
      c(
        "E2E-CASE-024",
        "Steps can be inserted, duplicated and reordered from their menu",
        "high",
        [
          [
            "Step 1 actions › Insert step below, then Duplicate step",
            "Steps appear in the expected places",
          ],
          ["Move up / Move down", "The order changes and is saved"],
        ]
      ),
      c(
        "E2E-CASE-025",
        "A removed step can be brought back with Undo",
        "medium",
        [
          ["Step 2 actions › Remove step", '"Step 2 removed." with Undo'],
          ["Undo", "Step 2 is back where it was"],
        ]
      ),
      c(
        "E2E-CASE-026",
        "Labels are added with Enter, checked and removable",
        "medium",
        [
          ["Type a label and press Enter", "It becomes a chip"],
          [
            "Type an invalid label",
            "Use letters, digits, dots, dashes or underscores",
          ],
          ["Remove label", "The chip goes"],
        ]
      ),
      c(
        "E2E-CASE-027",
        "Editing a case saves a new version and records it",
        "critical",
        [
          ["Edit, change the title, Save changes", '"… saved", Version 2'],
          ["Open History", "Renamed it to the new title"],
        ]
      ),
      c(
        "E2E-CASE-028",
        "Leaving the editor with unsaved changes asks first",
        "high",
        [
          [
            "Change the title, then select Test runs in the sidebar",
            "Leave without saving?",
          ],
          ["Keep editing", "Still in the editor with the change"],
          ["Try again and Leave", "Test runs opens"],
        ],
        { type: "usability" }
      ),
      c("E2E-CASE-029", "Leaving an unchanged editor doesn't ask", "low", [
        [
          "Open the editor and select Cancel",
          "The case page opens without a question",
        ],
      ]),
      c(
        "E2E-CASE-030",
        "A save that clashes with someone else's shows both versions",
        "critical",
        [
          ["Open the editor; someone else saves the case meanwhile", "—"],
          [
            "Change the title and Save changes",
            "… saved a newer version while you were editing, with a field table",
          ],
          [
            "Discard mine, load theirs",
            'Their title is loaded; "Loaded their version"',
          ],
        ]
      ),
      c(
        "E2E-CASE-031",
        "Save mine over theirs keeps my change after a clash",
        "high",
        [
          [
            "After a clash select Save mine over theirs",
            '"… saved"; the case has my title',
          ],
        ]
      ),
      c(
        "E2E-CASE-032",
        "Viewers can't open the editor",
        "high",
        [["As a viewer open /cases/new", "You can't edit test cases here"]],
        { type: "security" }
      ),
      c(
        "E2E-CASE-033",
        "Starting a case from a suite chooses that suite",
        "low",
        [["With a suite selected, New test case", "Suite is that suite"]]
      ),
    ],
  },
  {
    suite: "Test cases › Archive, copy and bulk",
    label: "cases",
    cases: [
      c("E2E-CASE-034", "Archive a case with a reason", "high", [
        [
          "Archive…, give a reason, Archive",
          '"… archived"; the case shows Archived — reason, without Edit',
        ],
      ]),
      c("E2E-CASE-035", "Restore an archived case", "medium", [
        ["On an archived case select Restore", '"… restored"; Edit is back'],
      ]),
      c(
        "E2E-CASE-036",
        "Testers can edit but not archive cases",
        "medium",
        [["As a tester open a case", "Edit and Duplicate; no Archive"]],
        { type: "security" }
      ),
      c("E2E-CASE-037", "Duplicate a case", "medium", [
        ["Duplicate", '"… created as a copy"; the copy\'s editor opens'],
        ["Open the copy", "Copied from links to the original"],
      ]),
      c("E2E-CASE-038", "Bulk set priority", "high", [
        ["Tick two cases", '"2 selected" bar'],
        [
          "Set priority… › Low › Update 2 test cases",
          '"2 test cases updated"; both are Low',
        ],
      ]),
      c("E2E-CASE-039", "Bulk move to a suite", "medium", [
        ["Tick two cases, Move to suite… › a suite", "Both are in that suite"],
      ]),
      c("E2E-CASE-040", "Bulk add labels", "medium", [
        ["Tick two cases, Add labels… › a label", "Both carry the label"],
      ]),
      c("E2E-CASE-041", "Bulk archive", "high", [
        [
          "As a lead tick two cases, Archive… › Archive 2 test cases",
          '"2 test cases archived"',
        ],
      ]),
      c("E2E-CASE-042", "Select every matching case across pages", "medium", [
        [
          "10 per page, tick Select all on this page",
          '"10 selected" and Select all 12 matching',
        ],
        ["Select all 12 matching", "All 12 matching cases selected"],
        ["Clear selection", "The bar goes"],
      ]),
    ],
  },
]

export default suites
