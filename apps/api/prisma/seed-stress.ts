/**
 * Dev-only bulk data for performance checks: one large project ("LOAD") at
 * the scale the portal must cope with — 6,000 cases in 120 suites, three
 * 5,000-case runs with results, 400 defects with status history. Run after
 * `db:seed:demo` (it uses the demo accounts). Safe to run again: it does
 * nothing if LOAD exists.
 */
import { randomUUID } from "node:crypto"
import type { DefectStatus } from "@qa/shared"
import { config } from "dotenv"
import { loadEnv } from "../src/env.ts"
import { createPrisma, type Prisma } from "../src/lib/prisma.ts"
import { assertLocalDevDatabase } from "./dev-guard.ts"

config({ path: new URL("../../../.env", import.meta.url), quiet: true })
const env = loadEnv()
assertLocalDevDatabase(env, "db:seed:stress")

const KEY = "LOAD"
const CASES = 6000
const SUITES = 20
const SUB_SUITES = 5
const RUN_SIZE = 5000
const DEFECTS = 400
const CHUNK = 1000
const DAY = 24 * 60 * 60 * 1000

const PRIORITIES = ["critical", "high", "medium", "medium", "low"] as const
const TYPES = [
  "functional",
  "functional",
  "security",
  "performance",
  "usability",
] as const
const SEVERITIES = [
  "critical",
  "major",
  "major",
  "minor",
  "minor",
  "trivial",
] as const
/** Each defect's walk through the workflow; the last step is its status. */
const PATHS: (readonly DefectStatus[])[] = [
  ["new"],
  ["new", "open"],
  ["new", "open", "in_progress"],
  ["new", "open", "in_progress", "fixed"],
  ["new", "open", "in_progress", "fixed", "closed"],
  ["new", "open", "in_progress", "fixed", "reopened"],
]

/** A deterministic 0..1 value, so reruns on a fresh database look the same. */
function noise(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

async function inChunks<T>(
  rows: T[],
  insert: (chunk: T[]) => Promise<unknown>
) {
  for (let i = 0; i < rows.length; i += CHUNK)
    await insert(rows.slice(i, i + CHUNK))
}

const prisma = createPrisma(env.DATABASE_URL)
try {
  if (await prisma.project.findUnique({ where: { key: KEY } })) {
    console.log(`Stress project ${KEY} already exists; nothing to do.`)
  } else {
    const users = await prisma.user.findMany({
      where: { username: { startsWith: "demo." }, banned: false },
      orderBy: { username: "asc" },
      select: { id: true, username: true },
    })
    const lead = users.find((u) => u.username === "demo.lead")
    const admin = users.find((u) => u.username === "demo.admin")
    if (!lead || !admin) {
      console.error(
        "Run `pnpm --filter @qa/api db:seed:demo` first (needs the demo accounts)."
      )
      process.exit(1)
    }
    const testers = users
      .filter(
        (u) =>
          !["demo.admin", "demo.lead", "demo.viewer"].includes(u.username ?? "")
      )
      .slice(0, 20)
    const viewer = users.find((u) => u.username === "demo.viewer")
    const started = Date.now()
    const now = Date.now()

    const project = await prisma.project.create({
      data: {
        key: KEY,
        name: "Load test",
        description: "Bulk data for performance checks (db:seed:stress).",
        createdById: admin.id,
      },
    })
    await prisma.projectMember.createMany({
      data: [
        {
          projectId: project.id,
          userId: lead.id,
          role: "lead",
          addedById: admin.id,
        },
        ...testers.map((t) => ({
          projectId: project.id,
          userId: t.id,
          role: "tester" as const,
          addedById: lead.id,
        })),
        ...(viewer
          ? [
              {
                projectId: project.id,
                userId: viewer.id,
                role: "viewer" as const,
                addedById: lead.id,
              },
            ]
          : []),
      ],
    })
    const previous = await prisma.release.create({
      data: {
        projectId: project.id,
        name: "8.9",
        status: "released",
        createdById: lead.id,
        createdAt: new Date(now - 40 * DAY),
      },
    })
    const release = await prisma.release.create({
      data: {
        projectId: project.id,
        name: "9.0",
        status: "in_progress",
        targetDate: new Date(
          Date.UTC(
            new Date().getUTCFullYear(),
            new Date().getUTCMonth(),
            new Date().getUTCDate() + 14
          )
        ),
        createdById: lead.id,
      },
    })

    // Suites: 20 areas with 5 sub-suites each.
    const suites: Prisma.SuiteCreateManyInput[] = []
    const leafPaths: { id: string; path: string }[] = []
    for (let s = 0; s < SUITES; s++) {
      const top = {
        id: randomUUID(),
        projectId: project.id,
        name: `Area ${s + 1}`,
        createdById: lead.id,
      }
      suites.push(top)
      for (let c = 0; c < SUB_SUITES; c++) {
        const id = randomUUID()
        suites.push({
          id,
          projectId: project.id,
          parentId: top.id,
          name: `Feature ${s + 1}.${c + 1}`,
          createdById: lead.id,
        })
        leafPaths.push({
          id,
          path: `Area ${s + 1} / Feature ${s + 1}.${c + 1}`,
        })
      }
    }
    await prisma.suite.createMany({ data: suites })

    // Cases: 90% Ready.
    const steps = [
      { action: "Open the screen", expected: "It loads" },
      { action: "Fill in the form", expected: "No errors are shown" },
      { action: "Save", expected: "The change is saved" },
    ]
    const cases = Array.from({ length: CASES }, (_, i) => {
      const leaf = leafPaths[i % leafPaths.length]!
      return {
        id: randomUUID(),
        projectId: project.id,
        number: i + 1,
        suiteId: leaf.id,
        title: `Check behaviour ${i + 1} in ${leaf.path}`,
        steps,
        priority: PRIORITIES[i % PRIORITIES.length]!,
        type: TYPES[i % TYPES.length]!,
        status: noise(i, 1) < 0.9 ? ("ready" as const) : ("draft" as const),
        createdById: lead.id,
        updatedById: lead.id,
        suitePath: leaf.path,
      }
    })
    await inChunks(cases, (chunk) =>
      prisma.testCase.createMany({
        data: chunk.map(({ suitePath: _p, ...c }) => c),
      })
    )
    const ready = cases.filter((c) => c.status === "ready").slice(0, RUN_SIZE)

    // Runs: R-1 closed and complete, R-2 80% tested, R-3 30% tested.
    const plans = [
      { name: "9.0 full regression", tested: 1, closed: true, daysAgo: 12 },
      {
        name: "9.0 regression, second pass",
        tested: 0.8,
        closed: false,
        daysAgo: 5,
      },
      { name: "9.0 release candidate", tested: 0.3, closed: false, daysAgo: 1 },
    ]
    let results = 0
    for (const [r, plan] of plans.entries()) {
      const runStart = now - plan.daysAgo * DAY
      const run = await prisma.testRun.create({
        data: {
          projectId: project.id,
          number: r + 1,
          name: plan.name,
          environment: "Chrome 130 · staging",
          releaseId: release.id,
          state: plan.closed ? "closed" : "open",
          closedAt: plan.closed ? new Date(runStart + 4 * DAY) : null,
          closedById: plan.closed ? lead.id : null,
          createdById: lead.id,
          createdAt: new Date(runStart),
        },
      })
      const runCases: Prisma.RunCaseCreateManyInput[] = []
      const runResults: Prisma.TestResultCreateManyInput[] = []
      for (const [i, c] of ready.entries()) {
        const id = randomUUID()
        const assignee = testers[i % testers.length]!
        const tested = noise(i, r + 2) < plan.tested
        const roll = noise(i, r + 7)
        const status = !tested
          ? ("untested" as const)
          : roll < 0.86
            ? ("passed" as const)
            : roll < 0.94
              ? ("failed" as const)
              : roll < 0.97
                ? ("blocked" as const)
                : ("skipped" as const)
        // Spread over the run's days, never in the future.
        const at = tested
          ? new Date(
              Math.min(
                runStart + (i % 96) * 60 * 60 * 1000,
                now - (i + 1) * 1000
              )
            )
          : null
        runCases.push({
          id,
          runId: run.id,
          caseId: c.id,
          position: i + 1,
          title: c.title,
          steps,
          suitePath: c.suitePath,
          priority: c.priority,
          type: c.type,
          caseStatus: "ready",
          revision: 1,
          assigneeId: assignee.id,
          status,
          resultAt: at,
        })
        if (tested)
          runResults.push({
            runCaseId: id,
            status,
            note:
              status === "failed" || status === "blocked"
                ? "Doesn't match the expected result"
                : "",
            failedStep: status === "failed" ? 2 : null,
            revision: 1,
            recordedById: assignee.id,
            recordedAt: at!,
          })
      }
      await inChunks(runCases, (chunk) =>
        prisma.runCase.createMany({ data: chunk })
      )
      await inChunks(runResults, (chunk) =>
        prisma.testResult.createMany({ data: chunk })
      )
      results += runResults.length
    }

    // Defects, with their status history; some carried over from 8.9.
    const defects: Prisma.DefectCreateManyInput[] = []
    const changes: Prisma.DefectStatusChangeCreateManyInput[] = []
    for (let i = 0; i < DEFECTS; i++) {
      const id = randomUUID()
      const path = PATHS[i % PATHS.length]!
      const logged = now - (1 + (i % 35)) * DAY
      const step = (k: number) =>
        new Date(Math.min(logged + k * 2 * DAY, now - 60_000))
      const reporter = testers[i % testers.length]!
      defects.push({
        id,
        projectId: project.id,
        number: i + 1,
        title: `Problem ${i + 1}: the result doesn't match`,
        steps: "1. Follow the case steps",
        actual: "Something else happens",
        status: path[path.length - 1]!,
        severity: SEVERITIES[i % SEVERITIES.length]!,
        priority:
          path.length > 1 ? (["high", "medium", "low"] as const)[i % 3]! : null,
        detectedIn: i % 25 === 0 ? "production" : "qa",
        source: "manual",
        reporterId: reporter.id,
        assigneeId:
          path.length > 1 ? testers[(i + 3) % testers.length]!.id : null,
        caseId: cases[(i * 13) % cases.length]!.id,
        foundInReleaseId: i % 10 === 0 ? previous.id : release.id,
        reopenCount: path.includes("reopened") ? 1 : 0,
        openedAt: path.length > 1 ? step(1) : null,
        fixedAt: path.includes("fixed") ? step(3) : null,
        closedAt: path.includes("closed") ? step(4) : null,
        createdAt: new Date(logged),
      })
      path.forEach((to, k) =>
        changes.push({
          defectId: id,
          fromStatus: k === 0 ? null : path[k - 1]!,
          toStatus: to,
          note: to === "reopened" ? "Still fails on the new build" : "",
          actorId: to === "open" ? lead.id : reporter.id,
          at: step(k),
        })
      )
    }
    await inChunks(defects, (chunk) =>
      prisma.defect.createMany({ data: chunk })
    )
    await inChunks(changes, (chunk) =>
      prisma.defectStatusChange.createMany({ data: chunk })
    )

    // Keep the per-project numbering in step with what was inserted.
    await prisma.projectCounter.createMany({
      data: [
        { projectId: project.id, scope: "case", value: CASES },
        { projectId: project.id, scope: "run", value: plans.length },
        { projectId: project.id, scope: "defect", value: DEFECTS },
      ],
    })
    await prisma.$executeRaw`ANALYZE`
    console.log(
      `Stress project ${KEY}: ${CASES} cases, ${plans.length} runs of ${ready.length}, ${results} results, ${DEFECTS} defects in ${((Date.now() - started) / 1000).toFixed(1)} s.`
    )
  }
} finally {
  await prisma.$disconnect()
}
