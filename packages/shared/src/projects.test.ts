import { describe, expect, it } from "vitest"
import {
  addMembersSchema,
  createProjectSchema,
  projectKeySchema,
  releaseInputSchema,
  suggestProjectKey,
} from "./projects.ts"

describe("projectKeySchema", () => {
  it("accepts 2–6 capitals/digits starting with a letter, uppercasing input", () => {
    expect(projectKeySchema.parse("pay")).toBe("PAY")
    expect(projectKeySchema.parse(" Qa2 ")).toBe("QA2")
    expect(projectKeySchema.parse("ABCDEF")).toBe("ABCDEF")
  })

  it("rejects bad keys", () => {
    for (const bad of ["P", "ABCDEFG", "2FA", "PA-Y", "PA Y", ""]) {
      expect(projectKeySchema.safeParse(bad).success).toBe(false)
    }
  })
})

describe("suggestProjectKey", () => {
  it("uses initials for multi-word names", () => {
    expect(suggestProjectKey("Mobile App")).toBe("MA")
    expect(suggestProjectKey("Data Platform Ingest")).toBe("DPI")
  })

  it("uses the first letters of a single word", () => {
    expect(suggestProjectKey("Payments")).toBe("PAY")
    expect(suggestProjectKey("Checkout")).toBe("CHE")
  })

  it("ignores symbols, keeps digits after the first letter and stays valid", () => {
    expect(suggestProjectKey("  web-2 portal!! ")).toBe("W2P")
    expect(suggestProjectKey("3D Viewer")).toBe("DVI")
    expect(suggestProjectKey("A")).toBe("")
    expect(suggestProjectKey("")).toBe("")
    for (const name of [
      "Mobile App",
      "Payments",
      "web-2 portal",
      "Ünïcode Name",
    ]) {
      const key = suggestProjectKey(name)
      if (key) expect(projectKeySchema.safeParse(key).success).toBe(true)
    }
  })
})

describe("createProjectSchema", () => {
  const ok = { name: "Payments", key: "pay", leadUserId: "u1" }

  it("accepts a project with an optional description", () => {
    expect(createProjectSchema.parse(ok)).toMatchObject({
      key: "PAY",
      description: "",
    })
  })

  it("requires a first QA Lead", () => {
    expect(
      createProjectSchema.safeParse({ ...ok, leadUserId: "" }).success
    ).toBe(false)
  })
})

describe("addMembersSchema", () => {
  it("needs 1 to 50 distinct people and a project role", () => {
    expect(
      addMembersSchema.safeParse({ userIds: ["a", "b"], role: "tester" })
        .success
    ).toBe(true)
    expect(
      addMembersSchema.safeParse({ userIds: [], role: "tester" }).success
    ).toBe(false)
    expect(
      addMembersSchema.safeParse({ userIds: ["a", "a"], role: "tester" })
        .success
    ).toBe(false)
    expect(
      addMembersSchema.safeParse({ userIds: ["a"], role: "admin" }).success
    ).toBe(false)
  })
})

describe("releaseInputSchema", () => {
  const ok = { name: "4.2", status: "planned" }

  it("accepts a release with optional dates", () => {
    expect(releaseInputSchema.parse(ok)).toMatchObject({
      name: "4.2",
      startDate: null,
      targetDate: null,
    })
  })

  it("rejects a target date before the start date", () => {
    const result = releaseInputSchema.safeParse({
      ...ok,
      startDate: "2026-10-10",
      targetDate: "2026-10-01",
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(["targetDate"])
  })

  it("only accepts real calendar dates", () => {
    expect(
      releaseInputSchema.safeParse({ ...ok, startDate: "2026-02-30" }).success
    ).toBe(false)
  })
})
