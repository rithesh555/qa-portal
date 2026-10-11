// `pnpm db:seed:demo` — fills the DEV database with realistic demo data for
// walkthroughs and performance checks. Refuses to run outside development.
// Safe to re-run: existing demo users are left as they are.
import { config } from "dotenv"
import { z } from "zod"
import { createAuth } from "../src/auth/auth.ts"
import { demoProjects } from "../src/demo/projects.ts"
import { demoUsers } from "../src/demo/users.ts"
import { recordActivity } from "../src/lib/activity.ts"
import { loadEnv } from "../src/env.ts"
import { createPrisma } from "../src/lib/prisma.ts"

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
} finally {
  await prisma.$disconnect()
}
