import { describe, expect, it } from "vitest"
import {
  buildRows,
  defaultValueChoice,
  errorRowsCsv,
  guessMapping,
  uniqueHeaders,
  unknownValues,
} from "./import-mapping"
import type { SheetTable } from "./spreadsheet"

const sheet: SheetTable = {
  name: "Cases",
  rows: [
    {
      number: 1,
      cells: [
        "ID",
        "Test name",
        "Section",
        "Priority",
        "Category",
        "Steps",
        "Expected",
        "Owner",
        "Name",
      ],
    },
    {
      number: 2,
      cells: [
        "PAY-TC-1",
        "Apple Pay",
        "Checkout / Wallets",
        "Urgent",
        "Smoke",
        "1. Pay",
        "1. Paid",
        "Marco",
        "x",
      ],
    },
    {
      number: 4,
      cells: ["", "Google Pay", "", "P2", "Functional", "Pay", "", "", ""],
    },
  ],
}

describe("guessMapping", () => {
  it("maps headers once each, ignoring ID and unknown columns", () => {
    expect(guessMapping(sheet.rows[0]!.cells)).toEqual({
      ID: null,
      "Test name": "title",
      Section: "suite",
      Priority: "priority",
      Category: "type",
      Steps: "steps",
      Expected: "expected",
      Owner: null,
      // "Name" would also be a title; the first match wins.
      Name: null,
    })
  })
})

describe("duplicate headers", () => {
  it("are told apart, so each column can be mapped on its own", () => {
    expect(uniqueHeaders(["Title", "Steps", "Title", "", ""])).toEqual([
      "Title",
      "Steps",
      "Title (2)",
      "(column 4)",
      "(column 5)",
    ])
    const dup: SheetTable = {
      name: "S",
      rows: [
        { number: 1, cells: ["Title", "Title"] },
        { number: 2, cells: ["First", ""] },
      ],
    }
    const mapping = guessMapping(dup.rows[0]!.cells)
    expect(mapping).toEqual({ Title: "title", "Title (2)": null })
    expect(buildRows(dup, mapping, {})[0]).toMatchObject({ title: "First" })
  })
})

describe("buildRows", () => {
  it("keeps spreadsheet row numbers and applies value choices", () => {
    const mapping = guessMapping(sheet.rows[0]!.cells)
    const rows = buildRows(sheet, mapping, {
      "priority:urgent": { value: "critical" },
      "type:smoke": { value: "functional", addLabel: "smoke" },
    })
    expect(rows).toEqual([
      {
        row: 2,
        title: "Apple Pay",
        suite: "Checkout / Wallets",
        priority: "critical",
        type: "functional",
        status: "",
        labels: "smoke",
        references: "",
        preconditions: "",
        steps: "1. Pay",
        expected: "1. Paid",
      },
      {
        row: 4,
        title: "Google Pay",
        suite: "",
        priority: "P2",
        type: "Functional",
        status: "",
        labels: "",
        references: "",
        preconditions: "",
        steps: "Pay",
        expected: "",
      },
    ])
  })
})

describe("unknownValues and defaults", () => {
  it("lists values needing a choice with sensible defaults", () => {
    const rows = buildRows(sheet, guessMapping(sheet.rows[0]!.cells), {})
    const unknown = unknownValues(rows)
    expect(unknown.map((u) => [u.field, u.value, u.count])).toEqual([
      ["priority", "Urgent", 1],
      ["priority", "P2", 1],
      ["type", "Smoke", 1],
    ])
    // "Urgent" reads as the top priority.
    expect(defaultValueChoice(unknown[0]!)).toEqual({ value: "critical" })
    expect(defaultValueChoice(unknown[2]!)).toEqual({
      value: "functional",
      addLabel: "smoke",
    })
    expect(
      defaultValueChoice({ field: "status", value: "Approved", count: 1 })
    ).toEqual({ value: "ready" })
  })

  it.each([
    ["P0", "critical"],
    ["Blocker", "critical"],
    ["Highest", "critical"],
    ["P1", "high"],
    ["Major", "high"],
    ["P2", "medium"],
    ["Normal", "medium"],
    ["P3", "low"],
    ["Minor", "low"],
    ["Trivial", "low"],
    ["Whenever", "medium"],
  ])("guesses priority %s as %s", (value, expected) => {
    expect(defaultValueChoice({ field: "priority", value, count: 1 })).toEqual({
      value: expected,
    })
  })

  it.each([
    ["Reviewed", "ready"],
    ["Done", "ready"],
    ["Active", "ready"],
    ["In review", "draft"],
    ["Obsolete", "draft"],
  ])("guesses status %s as %s", (value, expected) => {
    expect(defaultValueChoice({ field: "status", value, count: 1 })).toEqual({
      value: expected,
    })
  })
})

describe("errorRowsCsv", () => {
  it("returns the failing rows with their problems, ready to fix", () => {
    const csv = errorRowsCsv(sheet, [
      { row: 4, severity: "error", message: "Title is empty" },
      { row: 4, severity: "error", message: "Bad priority" },
      { row: 2, severity: "warning", message: "Duplicate" },
    ])
    expect(csv).toBe(
      "﻿Row,Problems,ID,Test name,Section,Priority,Category,Steps,Expected,Owner,Name\r\n" +
        "4,Title is empty; Bad priority,,Google Pay,,P2,Functional,Pay,,,\r\n"
    )
  })
})
