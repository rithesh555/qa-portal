import type { ProjectRole, ReleaseStatus } from "@qa/shared"
import type { DemoUser } from "./users.ts"

export interface DemoProject {
  key: string
  name: string
  description: string
  archived: boolean
  members: { username: string; role: ProjectRole }[]
  releases: {
    name: string
    description: string
    status: ReleaseStatus
    startDate: string | null
    targetDate: string | null
  }[]
}

const PROJECTS: [key: string, name: string, description: string][] = [
  [
    "PAY",
    "Payments",
    "Card payments, refunds and payouts for the web checkout.",
  ],
  ["MOB", "Mobile App", "iOS and Android customer app."],
  ["CHK", "Checkout", "Basket, delivery options and order confirmation."],
  ["ONB", "Onboarding", "Sign-up, identity checks and first-run tour."],
  ["SRCH", "Search", "Product search, filters and suggestions."],
  ["CAT", "Catalogue", "Product pages, pricing and stock levels."],
  ["ACC", "Accounts", "Profiles, addresses and saved preferences."],
  ["NOTIF", "Notifications", "Email, SMS and push messages."],
  ["ADM", "Back Office", "Internal tools for support and operations."],
  ["RPT", "Reporting", "Sales and operations dashboards."],
  ["INV", "Inventory", "Warehouse stock sync and reservations."],
  ["LOY", "Loyalty", "Points, tiers and rewards."],
  ["API", "Public API", "Partner API and webhooks."],
  ["SEC", "Security", "Authentication, permissions and audit."],
  ["LEG", "Legacy Portal", "The old customer portal, kept for reference."],
]

/** Projects whose only lead is a deactivated person (shows the warning). */
const ORPHANED = "ONB"
const ARCHIVED = "LEG"

function day(offsetDays: number): string {
  // Anchored to a fixed date so the data is the same every run.
  const base = Date.UTC(2026, 9, 1)
  return new Date(base + offsetDays * 86_400_000).toISOString().slice(0, 10)
}

/**
 * 15 projects with deterministic teams drawn from the demo people, plus the
 * named demo accounts in the roles a walkthrough needs:
 * demo.lead is QA Lead on PAY, Tester on MOB and Viewer on CHK;
 * demo.tester tests PAY and MOB; demo.viewer views PAY. demo.admin is
 * on no project (admins see all anyway).
 */
export function demoProjects(users: DemoUser[]): DemoProject[] {
  const people = users.filter((u) => !u.username.startsWith("demo."))
  const active = people.filter((u) => !u.deactivated)
  const gone = people.filter((u) => u.deactivated)

  return PROJECTS.map(([key, name, description], index) => {
    const members = new Map<string, ProjectRole>()
    const add = (username: string, role: ProjectRole) => {
      if (!members.has(username)) members.set(username, role)
    }

    if (key === ORPHANED) add(gone[0]!.username, "lead")
    else add(active[(index * 29 + 3) % active.length]!.username, "lead")
    if (index % 3 === 0 && key !== ORPHANED) {
      add(active[(index * 29 + 46) % active.length]!.username, "lead")
    }
    // 5–10 testers and 1–3 viewers, spread across the people.
    const testers = 5 + (index % 6)
    for (let i = 0; i < testers; i++) {
      add(active[(index * 13 + i * 23 + 7) % active.length]!.username, "tester")
    }
    for (let i = 0; i < 1 + (index % 3); i++) {
      add(
        active[(index * 17 + i * 31 + 11) % active.length]!.username,
        "viewer"
      )
    }
    if (index % 4 === 1) add(gone[1 % gone.length]!.username, "tester")

    if (key === "PAY") {
      members.set("demo.lead", "lead")
      members.set("demo.tester", "tester")
      members.set("demo.viewer", "viewer")
    }
    if (key === "MOB") {
      members.set("demo.lead", "tester")
      members.set("demo.tester", "tester")
    }
    if (key === "CHK") members.set("demo.lead", "viewer")

    const major = 1 + (index % 5)
    const releases: DemoProject["releases"] = [
      {
        name: `${major}.0`,
        description: "First release",
        status: "released",
        startDate: day(-80 + index),
        targetDate: day(-55 + index),
      },
      {
        name: `${major}.1`,
        description: "Current work",
        status: index % 5 === 4 ? "planned" : "in_progress",
        startDate: day(-10 + index),
        targetDate: day(20 + index),
      },
    ]
    if (index % 2 === 0) {
      releases.push({
        name: `${major}.2`,
        description: "Next up",
        status: "planned",
        startDate: null,
        targetDate: null,
      })
    }

    return {
      key,
      name,
      description,
      archived: key === ARCHIVED,
      members: [...members].map(([username, role]) => ({ username, role })),
      releases,
    }
  })
}
