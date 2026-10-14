import { describe, expect, it } from "vitest"
import {
  applyValueMap,
  collectUnknownValues,
  findFileDuplicates,
  guessField,
  importRequestSchema,
  matchEnumValue,
  pairSteps,
  parseImportRow,
  parseNumberedList,
  parseSuitePath,
  suiteKey,
} from "./case-import.ts"
import {
  caseExportCells,
  caseExportRow,
  EXPORT_HEADERS,
  safeCell,
  toCsv,
} from "./case-export.ts"

describe("guessField", () => {
  it("matches common header names, ignoring case and spacing", () => {
    expect(guessField("Test name")).toBe("title")
    expect(guessField(" TITLE ")).toBe("title")
    expect(guessField("Section")).toBe("suite")
    expect(guessField("Category")).toBe("type")
    expect(guessField("State")).toBe("status")
    expect(guessField("Tags")).toBe("labels")
    expect(guessField("Jira")).toBe("references")
    expect(guessField("Setup")).toBe("preconditions")
    expect(guessField("Test steps")).toBe("steps")
    expect(guessField("Expected Result")).toBe("expected")
    expect(guessField("Expected results")).toBe("expected")
  })

  it("never maps ID or unknown columns", () => {
    expect(guessField("ID")).toBeNull()
    expect(guessField("Owner")).toBeNull()
  })
})

describe("parseNumberedList", () => {
  it("reads numbered items with multi-line continuation", () => {
    const { items, error } = parseNumberedList(
      "1. Open cart\n   with one item\n2) Pay\n\n3.Done"
    )
    expect(error).toBeUndefined()
    expect([...items]).toEqual([
      [1, "Open cart\nwith one item"],
      [2, "Pay"],
      [3, "Done"],
    ])
  })

  it("treats unnumbered lines as one item each", () => {
    expect([...parseNumberedList("Open cart\n\nPay").items]).toEqual([
      [1, "Open cart"],
      [2, "Pay"],
    ])
    expect(parseNumberedList("  ").items.size).toBe(0)
  })

  it("reports text before the first number and repeated numbers", () => {
    expect(parseNumberedList("Intro\n1. Step").error).toMatch(/before 1/)
    expect(parseNumberedList("1. A\n1. B").error).toMatch(/1 appears twice/)
  })
})

describe("pairSteps", () => {
  it("pairs by number, not by line, allowing missing expected results", () => {
    expect(pairSteps("1. A\n2. B\n   more\n3. C", "1. a\n3. c")).toEqual({
      steps: [
        { action: "A", expected: "a" },
        { action: "B\nmore", expected: "" },
        { action: "C", expected: "c" },
      ],
      errors: [],
    })
  })

  it("errors on an expected result without its step", () => {
    expect(pairSteps("1. A\n2. B", "1. a\n5. e").errors).toEqual([
      "Expected result 5 has no matching step 5",
    ])
  })

  it("errors when there are no steps", () => {
    expect(pairSteps("", "").errors).toEqual(["Add at least one step"])
  })
})

describe("parseSuitePath", () => {
  it("splits on › / or >", () => {
    expect(parseSuitePath("Checkout › Refunds")).toEqual({
      path: ["Checkout", "Refunds"],
    })
    expect(parseSuitePath(" Checkout/ Refunds ")).toEqual({
      path: ["Checkout", "Refunds"],
    })
    expect(parseSuitePath("Checkout > Refunds")).toEqual({
      path: ["Checkout", "Refunds"],
    })
    expect(parseSuitePath("Invoices")).toEqual({ path: ["Invoices"] })
    expect(parseSuitePath("  ")).toEqual({ path: [] })
  })

  it("rejects more than one level of nesting", () => {
    expect(parseSuitePath("A › B › C")).toEqual({
      error: "Suite is nested too deep — use one sub-suite level, e.g. A › B",
    })
  })

  it("suiteKey ignores case and extra spaces", () => {
    expect(suiteKey("  Checkout   Wallets ")).toBe(suiteKey("checkout wallets"))
  })
})

describe("matchEnumValue", () => {
  it("matches values and labels, any case; empty is undefined; unknown is null", () => {
    expect(matchEnumValue("priority", "High")).toBe("high")
    expect(matchEnumValue("priority", " critical ")).toBe("critical")
    expect(matchEnumValue("type", "Usability")).toBe("usability")
    expect(matchEnumValue("status", "READY")).toBe("ready")
    expect(matchEnumValue("priority", "")).toBeUndefined()
    expect(matchEnumValue("priority", "Urgent")).toBeNull()
  })
})

describe("value mapping", () => {
  const rows = [
    { priority: "Urgent", type: "Smoke", status: "" },
    { priority: "urgent", type: "Functional", status: "Approved" },
    { priority: "High", type: "Smoke", status: "Ready" },
  ]

  it("collects unknown enum values with how many rows use them", () => {
    expect(collectUnknownValues(rows)).toEqual([
      { field: "priority", value: "Urgent", count: 2 },
      { field: "type", value: "Smoke", count: 2 },
      { field: "status", value: "Approved", count: 1 },
    ])
  })

  it("applies choices, including adding a label", () => {
    const map = {
      "priority:urgent": { value: "critical" },
      "type:smoke": { value: "functional", addLabel: "smoke" },
      "status:approved": { value: "ready" },
    }
    expect(
      applyValueMap(
        {
          priority: "Urgent",
          type: "Smoke",
          status: "Approved",
          labels: "web",
        },
        map
      )
    ).toEqual({
      priority: "critical",
      type: "functional",
      status: "ready",
      labels: "web, smoke",
    })
  })
})

describe("parseImportRow", () => {
  const base = {
    row: 4,
    title: "Pay with Apple Pay",
    suite: "Checkout / Wallets",
    priority: "High",
    type: "",
    status: "",
    labels: "Wallet; mobile",
    references: "PAY-1402",
    preconditions: "iPhone",
    steps: "1. Choose Apple Pay\n2. Confirm",
    expected: "1. Sheet shows the total",
  }

  it("builds a case with defaults", () => {
    expect(parseImportRow(base)).toEqual({
      value: {
        row: 4,
        title: "Pay with Apple Pay",
        suitePath: ["Checkout", "Wallets"],
        priority: "high",
        type: "functional",
        status: "draft",
        labels: ["wallet", "mobile"],
        references: "PAY-1402",
        preconditions: "iPhone",
        steps: [
          { action: "Choose Apple Pay", expected: "Sheet shows the total" },
          { action: "Confirm", expected: "" },
        ],
      },
      problems: [],
    })
  })

  it("lists every problem in the row as an error", () => {
    const { value, problems } = parseImportRow({
      ...base,
      title: " ",
      priority: "Urgent",
      suite: "A/B/C",
      labels: "ok, bad label!",
      expected: "9. x",
    })
    expect(value).toBeUndefined()
    expect(problems.map((p) => [p.row, p.severity, p.message])).toEqual([
      [4, "error", "Title is empty"],
      [
        4,
        "error",
        "Suite is nested too deep — use one sub-suite level, e.g. A › B",
      ],
      [
        4,
        "error",
        "Priority “Urgent” isn’t one of Critical, High, Medium, Low",
      ],
      [
        4,
        "error",
        "Label “bad label!” can only use letters, digits, dots, dashes or underscores",
      ],
      [4, "error", "Expected result 9 has no matching step 9"],
    ])
  })

  it("reports fields that are too long", () => {
    expect(
      parseImportRow({ ...base, title: "x".repeat(201) }).problems[0]?.message
    ).toBe("Title: Titles are at most 200 characters")
  })

  it("undoes the export's formula guard", () => {
    expect(parseImportRow({ ...base, title: "'=SUM(A1)" }).value?.title).toBe(
      "=SUM(A1)"
    )
  })
})

describe("findFileDuplicates", () => {
  it("warns on the later row with the same suite and title", () => {
    const parsed = [
      { row: 3, title: "Pay", suitePath: ["Checkout"] },
      { row: 5, title: "pay ", suitePath: ["checkout"] },
      { row: 6, title: "Pay", suitePath: ["Other"] },
    ]
    expect(findFileDuplicates(parsed)).toEqual([
      {
        row: 5,
        severity: "warning",
        message: "Same title as row 3 in this file",
      },
    ])
  })
})

describe("importRequestSchema", () => {
  it("caps rows at 2,000", () => {
    const row = { row: 2, title: "x" }
    expect(
      importRequestSchema.safeParse({ fileName: "a.csv", rows: [row] }).success
    ).toBe(true)
    expect(
      importRequestSchema.safeParse({
        fileName: "a.csv",
        rows: Array.from({ length: 2001 }, () => row),
      }).success
    ).toBe(false)
    expect(
      importRequestSchema.safeParse({ fileName: "a.csv", rows: [] }).success
    ).toBe(false)
  })
})

describe("export", () => {
  const testCase = {
    key: "PAY-TC-3",
    title: "=HYPERLINK(evil)",
    suitePath: "Checkout › Refunds",
    priority: "high" as const,
    type: "security" as const,
    status: "ready" as const,
    labels: ["smoke", "regression"],
    references: "PAY-1, PAY-2",
    preconditions: "+cmd",
    steps: [
      { action: "A\nmore", expected: "a" },
      { action: "B", expected: "" },
      { action: "@C", expected: "c" },
    ],
  }

  it("guards cells that spreadsheets would run as formulas", () => {
    expect(safeCell("=1+1")).toBe("'=1+1")
    expect(safeCell("+1")).toBe("'+1")
    expect(safeCell("-1")).toBe("'-1")
    expect(safeCell("@x")).toBe("'@x")
    expect(safeCell("\tx")).toBe("'\tx")
    expect(safeCell("plain")).toBe("plain")
  })

  it("writes a row in header order with numbered steps", () => {
    const row = caseExportRow(testCase)
    expect(EXPORT_HEADERS).toEqual([
      "ID",
      "Title",
      "Suite",
      "Priority",
      "Type",
      "Status",
      "Labels",
      "References",
      "Preconditions",
      "Steps",
      "Expected results",
    ])
    expect(row).toEqual([
      "PAY-TC-3",
      "'=HYPERLINK(evil)",
      "Checkout › Refunds",
      "High",
      "Security",
      "Ready",
      "smoke, regression",
      "PAY-1, PAY-2",
      "'+cmd",
      "1. A\nmore\n2. B\n3. @C",
      "1. a\n3. c",
    ])
  })

  it("leaves cells unguarded for Excel, which stores them as plain text", () => {
    const cells = caseExportCells(testCase)
    expect(cells[1]).toBe("=HYPERLINK(evil)")
    expect(cells[8]).toBe("+cmd")
    expect(caseExportRow(testCase)).toEqual(cells.map(safeCell))
  })

  it("round-trips through import", () => {
    const row = caseExportRow(testCase)
    const input: Record<string, string | number> = { row: 2 }
    EXPORT_HEADERS.forEach((header, i) => {
      const field = guessField(header)
      if (field) input[field] = row[i]!
    })
    expect(parseImportRow(input as never).value).toEqual({
      row: 2,
      title: testCase.title,
      suitePath: ["Checkout", "Refunds"],
      priority: "high",
      type: "security",
      status: "ready",
      labels: ["smoke", "regression"],
      references: "PAY-1, PAY-2",
      preconditions: "+cmd",
      steps: testCase.steps,
    })
  })

  it("writes CSV with a BOM, quoting and CRLF", () => {
    expect(
      toCsv([
        ["a", 'say "hi"', "x,y"],
        ["line\nbreak", "", "z"],
      ])
    ).toBe('﻿a,"say ""hi""","x,y"\r\n"line\nbreak",,z\r\n')
  })
})
