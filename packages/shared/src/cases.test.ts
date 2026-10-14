import { describe, expect, it } from "vitest"
import {
  bulkCaseActionSchema,
  caseInputSchema,
  caseListQuerySchema,
  formatCaseKey,
  labelSchema,
  normalizeLabels,
  parseCaseRef,
  suiteInputSchema,
  updateCaseSchema,
} from "./cases.ts"

const SUITE = "0199c0de-0000-7000-8000-000000000001"

describe("case keys", () => {
  it("formats PROJECT-TC-n", () => {
    expect(formatCaseKey("PAY", 12)).toBe("PAY-TC-12")
  })

  it("parses a full key for the right project, or a bare number", () => {
    expect(parseCaseRef("PAY", "PAY-TC-12")).toBe(12)
    expect(parseCaseRef("PAY", "pay-tc-7")).toBe(7)
    expect(parseCaseRef("PAY", "3")).toBe(3)
  })

  it("rejects other projects' keys and junk", () => {
    for (const bad of [
      "MOB-TC-1",
      "PAY-TC-",
      "PAY-TC-0",
      "0",
      "-1",
      "x",
      "PAY-TC-1.5",
      "PAY-TC-99999999999",
    ]) {
      expect(parseCaseRef("PAY", bad), bad).toBeNull()
    }
  })
})

describe("labels", () => {
  it("lowercases, trims and turns spaces into dashes", () => {
    expect(labelSchema.parse("  Checkout Critical ")).toBe("checkout-critical")
    expect(labelSchema.parse("Smoke")).toBe("smoke")
  })

  it("rejects empty, too long or comma-containing labels", () => {
    for (const bad of ["", "   ", "a,b", "x".repeat(33), "-lead"]) {
      expect(labelSchema.safeParse(bad).success, bad).toBe(false)
    }
  })

  it("normalizeLabels dedupes after normalising, keeping order", () => {
    expect(
      normalizeLabels(["Smoke", "smoke", " regression", "Smoke "])
    ).toEqual(["smoke", "regression"])
  })
})

describe("caseInputSchema", () => {
  const ok = {
    title: " Pay with a saved card ",
    suiteId: SUITE,
    priority: "high",
    type: "functional",
    status: "draft",
    steps: [{ action: "Open checkout", expected: "Card is listed" }],
  }

  it("fills defaults and trims", () => {
    expect(caseInputSchema.parse(ok)).toEqual({
      title: "Pay with a saved card",
      suiteId: SUITE,
      priority: "high",
      type: "functional",
      status: "draft",
      labels: [],
      references: "",
      preconditions: "",
      steps: [{ action: "Open checkout", expected: "Card is listed" }],
    })
  })

  it("allows no suite and an empty expected result", () => {
    const parsed = caseInputSchema.parse({
      ...ok,
      suiteId: null,
      steps: [{ action: "Do it" }],
    })
    expect(parsed.suiteId).toBeNull()
    expect(parsed.steps).toEqual([{ action: "Do it", expected: "" }])
  })

  it("dedupes labels", () => {
    expect(
      caseInputSchema.parse({ ...ok, labels: ["Smoke", "smoke"] }).labels
    ).toEqual(["smoke"])
  })

  it("needs a title and at least one step with an action", () => {
    expect(caseInputSchema.safeParse({ ...ok, title: "  " }).success).toBe(
      false
    )
    expect(caseInputSchema.safeParse({ ...ok, steps: [] }).success).toBe(false)
    expect(
      caseInputSchema.safeParse({
        ...ok,
        steps: [{ action: " ", expected: "x" }],
      }).success
    ).toBe(false)
  })

  it("rejects unknown enums and oversize fields", () => {
    expect(
      caseInputSchema.safeParse({ ...ok, priority: "urgent" }).success
    ).toBe(false)
    expect(caseInputSchema.safeParse({ ...ok, type: "smoke" }).success).toBe(
      false
    )
    expect(
      caseInputSchema.safeParse({ ...ok, status: "deprecated" }).success
    ).toBe(false)
    expect(
      caseInputSchema.safeParse({ ...ok, title: "x".repeat(201) }).success
    ).toBe(false)
    expect(
      caseInputSchema.safeParse({
        ...ok,
        labels: Array.from({ length: 21 }, (_, i) => `l${i}`),
      }).success
    ).toBe(false)
    expect(
      caseInputSchema.safeParse({
        ...ok,
        steps: Array.from({ length: 101 }, () => ({ action: "a" })),
      }).success
    ).toBe(false)
  })

  it("update needs the version it was based on; overwrite is optional", () => {
    expect(updateCaseSchema.safeParse(ok).success).toBe(false)
    expect(updateCaseSchema.parse({ ...ok, version: 3 })).toMatchObject({
      version: 3,
      overwrite: false,
    })
  })
})

describe("suiteInputSchema", () => {
  it("trims and allows a parent", () => {
    expect(
      suiteInputSchema.parse({ name: " Refunds ", parentId: SUITE })
    ).toEqual({ name: "Refunds", parentId: SUITE })
    expect(suiteInputSchema.parse({ name: "Cart" })).toEqual({
      name: "Cart",
      parentId: null,
    })
  })

  it("rejects names with path separators", () => {
    for (const bad of ["", "A/B", "A › B", "A > B", "x".repeat(81)]) {
      expect(suiteInputSchema.safeParse({ name: bad }).success, bad).toBe(false)
    }
  })
})

describe("caseListQuerySchema", () => {
  it("defaults to active cases sorted by number", () => {
    expect(caseListQuerySchema.parse({})).toMatchObject({
      sort: "number",
      order: "asc",
      page: 1,
    })
  })

  it("accepts suite all/none/uuid and filters", () => {
    expect(
      caseListQuerySchema.parse({
        suite: "none",
        status: "archived",
        label: "Smoke",
      })
    ).toMatchObject({
      suite: "none",
      status: "archived",
      label: "smoke",
    })
    expect(caseListQuerySchema.parse({ suite: SUITE }).suite).toBe(SUITE)
    expect(caseListQuerySchema.safeParse({ suite: "nope" }).success).toBe(false)
  })
})

describe("bulkCaseActionSchema", () => {
  it("takes ids or a filter, plus one action", () => {
    expect(
      bulkCaseActionSchema.parse({
        selection: { ids: [SUITE] },
        action: { kind: "setPriority", priority: "low" },
      })
    ).toBeTruthy()
    expect(
      bulkCaseActionSchema.parse({
        selection: { filter: { suite: "all", q: "pay" } },
        action: { kind: "addLabels", labels: ["Smoke"] },
      }).action
    ).toEqual({ kind: "addLabels", labels: ["smoke"] })
    expect(
      bulkCaseActionSchema.parse({
        selection: { ids: [SUITE] },
        action: { kind: "archive" },
      }).action
    ).toEqual({
      kind: "archive",
      reason: "",
    })
  })

  it("rejects empty or huge id lists and unknown actions", () => {
    expect(
      bulkCaseActionSchema.safeParse({
        selection: { ids: [] },
        action: { kind: "archive" },
      }).success
    ).toBe(false)
    expect(
      bulkCaseActionSchema.safeParse({
        selection: { ids: Array.from({ length: 2001 }, () => SUITE) },
        action: { kind: "archive" },
      }).success
    ).toBe(false)
    expect(
      bulkCaseActionSchema.safeParse({
        selection: { ids: [SUITE] },
        action: { kind: "delete" },
      }).success
    ).toBe(false)
  })
})
