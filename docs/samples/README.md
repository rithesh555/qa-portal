# Sample test-case spreadsheets

Files for trying **Test cases › Import** in any project.

| File                            | What it's for                                                                                                                                                                                                                                                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test-cases-sample.xlsx`        | 40 realistic cases for a web shop across 10 suites and sub-suites, using the import template's columns. Imports with no errors or warnings.                                                                                                                                                                      |
| `test-cases-with-problems.xlsx` | 10 rows that exercise every check: other tools' column names (Test name, Section, Category, State, Tags, Jira), an ignored ID column, values to match (Urgent, P1, P2, Blocker, Smoke, Approved, In review), 4 rows with errors, 2 warnings and notes. The comment on each row's first cell says what to expect. |

Each workbook also has a **How to use** sheet. Importing the same file twice creates the cases twice; a QA Lead can archive a whole import from the import page.

To regenerate them (Python 3 with `openpyxl`):

```bash
python3 -m venv /tmp/samples-venv && /tmp/samples-venv/bin/pip install openpyxl==3.1.5
/tmp/samples-venv/bin/python docs/samples/make_samples.py docs/samples
```
