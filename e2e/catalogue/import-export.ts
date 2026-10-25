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
    suite: "Test cases › Import",
    label: "import-export",
    cases: [
      c(
        "E2E-IMP-001",
        "Uploading the sample file matches its columns",
        "high",
        [
          [
            "Import › Choose file › test-cases-sample.xlsx",
            "Step 2 Match columns; each column imports as its field",
          ],
        ]
      ),
      c("E2E-IMP-002", "Import the sample file end to end", "critical", [
        ["Check rows", "40 rows ready"],
        [
          "Import 40 test cases",
          "40 test cases imported, with the IDs and new suites",
        ],
        ["View imported cases", "The list holds the 40 cases"],
      ]),
      c(
        "E2E-IMP-003",
        "Other tools' values are matched, and errors block the import",
        "high",
        [
          [
            "Upload test-cases-with-problems.xlsx",
            "Values to match lists Urgent, P1, P2, Blocker…",
          ],
          [
            "Change P2 to Low and Check rows",
            "4 rows with errors; Import is disabled",
          ],
        ]
      ),
      c(
        "E2E-IMP-004",
        "Only rows with problems narrows the check table",
        "medium",
        [
          [
            "Tick Only rows with problems",
            "Only the rows with errors and warnings are listed",
          ],
        ]
      ),
      c("E2E-IMP-005", "Rows with errors can be downloaded to fix", "medium", [
        [
          "Download rows with errors (.csv)",
          "A CSV with the 4 failing rows and what's wrong",
        ],
      ]),
      c(
        "E2E-IMP-006",
        "Column matching refuses duplicates and a missing title",
        "medium",
        [
          [
            "Map two columns to Title",
            "Another column already imports as this; Check rows disabled",
          ],
          [
            "Map the title column to Don't import",
            "Choose which column holds the Title.",
          ],
        ]
      ),
      c(
        "E2E-IMP-007",
        "Archive an import straight after, then restore it",
        "high",
        [
          [
            "After importing select Archive this import… › Archive import",
            "Import #n archived",
          ],
          ["Restore import", '"Import #n restored"'],
        ]
      ),
      c(
        "E2E-IMP-008",
        "Recent imports can be archived and restored later",
        "medium",
        [
          [
            "On the import page, Archive this import… on a recent import",
            "It's marked Archived",
          ],
          ["Restore this import… › Restore import", "It's active again"],
        ]
      ),
      c(
        "E2E-IMP-009",
        "Leaving an import half-way asks first",
        "medium",
        [
          ["Upload a file, then select Test runs", "Leave the import?"],
          ["Stay", "Still matching columns"],
          ["Leave", "Test runs opens"],
        ],
        { type: "usability" }
      ),
      c("E2E-IMP-010", "Files that aren't CSV or Excel are refused", "medium", [
        [
          "Choose a .txt file",
          "Couldn't use that file: Choose a .csv or .xlsx file.",
        ],
      ]),
      c(
        "E2E-IMP-011",
        "The import templates download with the right columns",
        "low",
        [
          [
            "Download template (.xlsx) and Template (.csv)",
            "Both hold the header row: Title … Expected results",
          ],
        ]
      ),
      c(
        "E2E-IMP-012",
        "Viewers can't import",
        "high",
        [
          [
            "As a viewer open /cases/import",
            "You can't import test cases here",
          ],
        ],
        { type: "security" }
      ),
      c(
        "E2E-IMP-013",
        "Rows without a suite go to the chosen suite",
        "medium",
        [
          [
            "Choose Rows without a suite go to › a suite and import a CSV without a Suite column",
            "The cases are in that suite",
          ],
        ]
      ),
      c(
        "E2E-IMP-014",
        "A formula-looking title is imported as plain text",
        "high",
        [
          [
            "Import a CSV whose title is =1+2",
            "The case title is exactly =1+2",
          ],
        ],
        { type: "security" }
      ),
    ],
  },
  {
    suite: "Test cases › Export",
    label: "import-export",
    cases: [
      c("E2E-EXP-001", "Export the filtered list as Excel", "high", [
        [
          "Label › smoke, Export, Excel, Download",
          "An .xlsx with the ID column, the template columns and the 10 smoke cases",
        ],
      ]),
      c("E2E-EXP-002", "Export every case as CSV", "high", [
        ["Export, CSV, Download", "A .csv with all 30 active cases"],
      ]),
      c(
        "E2E-EXP-003",
        "The export dialog says how many cases it exports",
        "low",
        [["Priority › Critical, Export", "Exports the 8 cases that match…"]]
      ),
      c(
        "E2E-EXP-004",
        "Formula-looking cells are neutralised in CSV exports",
        "high",
        [
          [
            "Export a case titled =1+2 as CSV",
            "The cell reads '=1+2, so spreadsheets don't run it",
          ],
        ],
        { type: "security" }
      ),
      c("E2E-EXP-005", "Viewers can export", "medium", [
        ["As a viewer Export › Download", "A file downloads"],
      ]),
      c("E2E-EXP-006", "An exported file imports back as new cases", "medium", [
        [
          "Export a project's cases as CSV, then import that file",
          "The same number of new cases, with new IDs",
        ],
      ]),
    ],
  },
]

export default suites
