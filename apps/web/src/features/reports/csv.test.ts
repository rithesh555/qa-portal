import { describe, expect, it } from "vitest"
import { csvFileName, reportCsv } from "./csv"

const BOM = "﻿"

describe("reportCsv", () => {
  it("stamps the scope and moment above the header row", () => {
    const csv = reportCsv({
      scope: "Payments · Release 4.2",
      asOf: "2026-10-19T09:14:00.000Z",
      columns: ["Case", "Latest result"],
      rows: [
        ["PAY-TC-1", "passed"],
        ["PAY-TC-2", null],
      ],
    })
    expect(csv).toBe(
      BOM +
        "Payments · Release 4.2 · as of 2026-10-19T09:14:00.000Z\r\n" +
        "Case,Latest result\r\n" +
        "PAY-TC-1,passed\r\n" +
        "PAY-TC-2,\r\n"
    )
  })

  it("keeps cells from running as formulas and writes numbers plainly", () => {
    const csv = reportCsv({
      scope: "S",
      asOf: "2026-10-19T00:00:00.000Z",
      columns: ["Title", "Count"],
      rows: [["=HYPERLINK(1)", 3]],
    })
    expect(csv.split("\r\n")[2]).toBe("'=HYPERLINK(1),3")
  })
})

describe("csvFileName", () => {
  it("names the file after the project, release and chart", () => {
    expect(csvFileName("PAY", "4.2", "Pass rate by run")).toBe(
      "PAY-4.2-pass-rate-by-run.csv"
    )
    expect(csvFileName("PAY", null, "Defects")).toBe(
      "PAY-no-release-defects.csv"
    )
  })
})
