// `pnpm db:seed:demo` — fills the DEV database with realistic demo data for
// walkthroughs and performance checks. Refuses to run outside development.
// Safe to re-run: existing demo users are left as they are.
import { config } from "dotenv"
import { z } from "zod"
import { createAuth } from "../src/auth/auth.ts"
import { formatCaseKey, formatRunKey } from "@qa/shared"
import { demoCaseLibrary } from "../src/demo/cases.ts"
import { demoProjects } from "../src/demo/projects.ts"
import { demoOutcome, demoRuns } from "../src/demo/runs.ts"
import { demoUsers } from "../src/demo/users.ts"
import { recordActivity } from "../src/lib/activity.ts"
import { loadEnv } from "../src/env.ts"
import { nextNumbers } from "../src/lib/counters.ts"
import { createPrisma } from "../src/lib/prisma.ts"
import { currentCases, snapshotData } from "../src/modules/runs/select.ts"
import { shareOut } from "../src/modules/runs/service.ts"

config({ path: new URL("../../../.env", import.meta.url), quiet: true })

const env = loadEnv()
if (env.NODE_ENV !== "development") {
  console.error(
    `db:seed:demo only runs with NODE_ENV=development (got ${env.NODE_ENV}).`
  )
  process.exit(1)
}

const { DEMO_USER_PASSWORD } = z
  .object({ DEMO_USER_PASSWORD: z.string().min(12) })
  .parse(process.env)

const prisma = createPrisma(env.DATABASE_URL)
const auth = createAuth({
  prisma,
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  webOrigin: env.WEB_ORIGIN,
})

try {
  let created = 0
  for (const user of demoUsers(DEMO_USER_PASSWORD)) {
    const exists = await prisma.user.findUnique({
      where: { username: user.username },
    })
    if (exists) continue
    const { user: row } = await auth.api.createUser({
      body: {
        name: user.name,
        email: user.email,
        password: user.password,
        role: user.role,
        data: { username: user.username, displayUsername: user.username },
      },
    })
    if (user.deactivated) {
      await prisma.user.update({
        where: { id: row.id },
        data: { banned: true, banReason: "Deactivated by an admin" },
      })
    }
    created += 1
  }
  console.log(`Demo users: ${created} created.`)

  // Projects, created as demo.admin so their history reads naturally.
  const ids = new Map(
    (
      await prisma.user.findMany({
        where: { username: { not: null } },
        select: { id: true, username: true, name: true },
      })
    ).map((u) => [u.username ?? "", u])
  )
  const admin = ids.get("demo.admin")!
  let projects = 0
  for (const demo of demoProjects(demoUsers(DEMO_USER_PASSWORD))) {
    if (await prisma.project.findUnique({ where: { key: demo.key } })) continue
    await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          key: demo.key,
          name: demo.name,
          description: demo.description,
          createdById: admin.id,
          archivedAt: demo.archived ? new Date() : null,
        },
      })
      const lead = demo.members.find((m) => m.role === "lead")!
      await recordActivity(tx, {
        actorId: admin.id,
        projectId: project.id,
        entityType: "project",
        entityId: project.id,
        action: "created",
        changes: {
          key: demo.key,
          name: demo.name,
          lead: {
            id: ids.get(lead.username)!.id,
            name: ids.get(lead.username)!.name,
          },
        },
      })
      for (const member of demo.members) {
        const user = ids.get(member.username)!
        await tx.projectMember.create({
          data: {
            projectId: project.id,
            userId: user.id,
            role: member.role,
            addedById: admin.id,
          },
        })
        if (member !== lead) {
          await recordActivity(tx, {
            actorId: admin.id,
            projectId: project.id,
            entityType: "member",
            entityId: user.id,
            action: "added",
            changes: {
              user: { id: user.id, name: user.name },
              role: member.role,
            },
          })
        }
      }
      for (const release of demo.releases) {
        const created = await tx.release.create({
          data: {
            projectId: project.id,
            name: release.name,
            description: release.description,
            status: release.status,
            startDate: release.startDate
              ? new Date(`${release.startDate}T00:00:00Z`)
              : null,
            targetDate: release.targetDate
              ? new Date(`${release.targetDate}T00:00:00Z`)
              : null,
            createdById: admin.id,
          },
        })
        await recordActivity(tx, {
          actorId: admin.id,
          projectId: project.id,
          entityType: "release",
          entityId: created.id,
          action: "created",
          changes: { name: release.name, status: release.status },
        })
      }
    })
    projects += 1
  }
  console.log(`Demo projects: ${projects} created.`)

  // Test cases, written by each project's first QA Lead (demo.admin if none).
  let cases = 0
  const demos = demoProjects(demoUsers(DEMO_USER_PASSWORD))
  for (const [index, demo] of demos.entries()) {
    const project = await prisma.project.findUniqueOrThrow({
      where: { key: demo.key },
      select: { id: true, key: true },
    })
    if (await prisma.testCase.count({ where: { projectId: project.id } })) {
      continue
    }
    const lead = demo.members.find((m) => m.role === "lead")
    const author = (lead && ids.get(lead.username)) || admin
    const library = demoCaseLibrary(demo.key, index)
    await prisma.$transaction(
      async (tx) => {
        const suiteIds = new Map<string, string>()
        for (const suite of library.suites) {
          const top = await tx.suite.create({
            data: {
              projectId: project.id,
              name: suite.name,
              createdById: author.id,
            },
          })
          suiteIds.set(suite.name, top.id)
          for (const child of suite.children) {
            const made = await tx.suite.create({
              data: {
                projectId: project.id,
                parentId: top.id,
                name: child,
                createdById: author.id,
              },
            })
            suiteIds.set(`${suite.name}/${child}`, made.id)
          }
        }
        await tx.testCase.createMany({
          data: library.cases.map(({ suitePath, ...c }, i) => ({
            ...c,
            steps: c.steps,
            projectId: project.id,
            number: i + 1,
            suiteId: suitePath.length
              ? suiteIds.get(suitePath.join("/"))!
              : null,
            createdById: author.id,
            updatedById: author.id,
          })),
        })
        await tx.projectCounter.create({
          data: {
            projectId: project.id,
            scope: "case",
            value: library.cases.length,
          },
        })
        const made = await tx.testCase.findMany({
          where: { projectId: project.id },
          select: { id: true, number: true, title: true },
        })
        await tx.activityLog.createMany({
          data: made.map((c) => ({
            actorId: author.id,
            projectId: project.id,
            entityType: "case",
            inFeed: false,
            entityId: c.id,
            action: "created",
            changes: {
              key: formatCaseKey(project.key, c.number),
              title: c.title,
              bulk: true,
            },
          })),
        })
      },
      { timeout: 60_000 }
    )
    cases += library.cases.length
  }
  console.log(`Demo test cases: ${cases} created.`)

  // Test runs: a finished one, one in progress and a fresh one per active project.
  let runs = 0
  const DAY = 24 * 60 * 60 * 1000
  for (const [index, demo] of demos.entries()) {
    if (demo.archived) continue
    const plans = demoRuns(demo.key, index)
    const project = await prisma.project.findUniqueOrThrow({
      where: { key: demo.key },
      select: { id: true, key: true },
    })
    if (
      await prisma.testRun.count({
        where: { projectId: project.id, name: plans[0]!.name },
      })
    ) {
      continue
    }
    const people = demo.members
      .filter((m) => m.role !== "viewer")
      .map((m) => ids.get(m.username)!)
    const lead = demo.members.find((m) => m.role === "lead")
    const owner = (lead && ids.get(lead.username)) || admin
    const releases = await prisma.release.findMany({
      where: { projectId: project.id },
      select: { id: true, status: true },
      orderBy: { createdAt: "asc" },
    })
    const current = releases.find((r) => r.status === "in_progress")
    const previous = releases.find((r) => r.status === "released")
    await prisma.$transaction(
      async (tx) => {
        const ready = await tx.testCase.findMany({
          where: { projectId: project.id, archivedAt: null, status: "ready" },
          select: { id: true },
        })
        const cases = await currentCases(
          tx,
          project.id,
          ready.map((c) => c.id)
        )
        if (cases.length === 0) return
        const assignment = shareOut(
          cases,
          people.map((p) => p.id)
        )
        for (const [ri, plan] of plans.entries()) {
          const number = await nextNumbers(tx, project.id, "run")
          const started = new Date(Date.now() - plan.daysAgo * DAY)
          const run = await tx.testRun.create({
            data: {
              projectId: project.id,
              number,
              name: plan.name,
              environment: plan.environment,
              releaseId: (plan.closed ? previous : current)?.id ?? null,
              state: plan.closed ? "closed" : "open",
              closedAt: plan.closed
                ? new Date(started.getTime() + 3 * DAY)
                : null,
              closedById: plan.closed ? owner.id : null,
              createdById: owner.id,
              createdAt: started,
            },
          })
          await tx.runCase.createMany({
            data: cases.map((c, i) => ({
              runId: run.id,
              caseId: c.id,
              position: i + 1,
              assigneeId: assignment.get(c.id) ?? null,
              ...snapshotData(c),
              status: demoOutcome(ri, i, plan.tested, 0)?.status ?? "untested",
            })),
          })
          const rows = await tx.runCase.findMany({
            where: { runId: run.id },
            select: {
              id: true,
              position: true,
              revision: true,
              assigneeId: true,
              steps: true,
            },
          })
          await tx.testResult.createMany({
            data: rows.flatMap((rc) => {
              const steps = Array.isArray(rc.steps) ? rc.steps.length : 0
              const outcome = demoOutcome(
                ri,
                rc.position - 1,
                plan.tested,
                steps
              )
              if (!outcome) return []
              return [
                {
                  runCaseId: rc.id,
                  ...outcome,
                  revision: rc.revision,
                  recordedById: rc.assigneeId ?? owner.id,
                  recordedAt: new Date(
                    started.getTime() +
                      ((rc.position * 37) % 48) * 60 * 60 * 1000
                  ),
                },
              ]
            }),
          })
          const key = formatRunKey(project.key, number)
          await recordActivity(tx, {
            actorId: owner.id,
            projectId: project.id,
            entityType: "run",
            entityId: run.id,
            action: "created",
            changes: { key, name: plan.name, cases: cases.length },
          })
          if (plan.closed) {
            await recordActivity(tx, {
              actorId: owner.id,
              projectId: project.id,
              entityType: "run",
              entityId: run.id,
              action: "closed",
              changes: { key, untested: 0 },
            })
          }
        }
      },
      { timeout: 60_000 }
    )
    runs += plans.length
  }
  console.log(`Demo test runs: ${runs} created.`)
} finally {
  await prisma.$disconnect()
}
