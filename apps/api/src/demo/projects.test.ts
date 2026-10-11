import { projectKeySchema, releaseInputSchema } from "@qa/shared"
import { describe, expect, it } from "vitest"
import { demoProjects } from "./projects.ts"
import { demoUsers } from "./users.ts"

describe("demoProjects", () => {
  const users = demoUsers("demo-password-123")
  const projects = demoProjects(users)
  const roleOf = (key: string, username: string) =>
    projects
      .find((p) => p.key === key)
      ?.members.find((m) => m.username === username)?.role

  it("makes 15 projects with valid, unique keys", () => {
    expect(projects).toHaveLength(15)
    expect(new Set(projects.map((p) => p.key)).size).toBe(15)
    for (const p of projects) {
      expect(projectKeySchema.safeParse(p.key).success).toBe(true)
    }
  })

  it("gives the demo accounts the roles the walkthrough needs", () => {
    expect(roleOf("PAY", "demo.lead")).toBe("lead")
    expect(roleOf("MOB", "demo.lead")).toBe("tester")
    expect(roleOf("CHK", "demo.lead")).toBe("viewer")
    expect(roleOf("PAY", "demo.tester")).toBe("tester")
    expect(roleOf("PAY", "demo.viewer")).toBe("viewer")
    expect(roleOf("PAY", "demo.admin")).toBeUndefined()
  })

  it("only uses demo people, each once per project", () => {
    const known = new Set(users.map((u) => u.username))
    for (const p of projects) {
      const names = p.members.map((m) => m.username)
      expect(new Set(names).size).toBe(names.length)
      for (const name of names) expect(known.has(name)).toBe(true)
    }
  })

  it("gives every project a lead, and one project only a deactivated lead", () => {
    const deactivated = new Set(
      users.filter((u) => u.deactivated).map((u) => u.username)
    )
    const activeLeads = (key: string) =>
      projects
        .find((p) => p.key === key)!
        .members.filter(
          (m) => m.role === "lead" && !deactivated.has(m.username)
        )
    for (const p of projects) {
      expect(p.members.some((m) => m.role === "lead")).toBe(true)
    }
    expect(
      projects.filter((p) => activeLeads(p.key).length === 0)
    ).toHaveLength(1)
  })

  it("has valid releases and one archived project", () => {
    for (const p of projects) {
      for (const r of p.releases) {
        expect(releaseInputSchema.safeParse(r).success).toBe(true)
      }
    }
    expect(projects.filter((p) => p.archived)).toHaveLength(1)
  })

  it("is the same every run", () => {
    expect(demoProjects(users)).toEqual(projects)
  })
})
