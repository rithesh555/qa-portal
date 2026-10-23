import type { PrismaClient } from "../lib/prisma.ts"
import type { Auth } from "./auth.ts"

export interface AdminSeed {
  username: string
  name: string
  email: string
  password: string
}

/** Creates the initial admin unless a user with that username exists. */
export async function ensureAdmin(
  auth: Auth,
  prisma: PrismaClient,
  seed: AdminSeed
): Promise<"created" | "exists"> {
  const existing = await prisma.user.findUnique({
    where: { username: seed.username.toLowerCase() },
  })
  if (existing) return "exists"

  const { user } = await auth.api.createUser({
    body: {
      email: seed.email,
      name: seed.name,
      password: seed.password,
      role: "admin",
      data: { username: seed.username },
    },
  })
  // The operator chose this password in .env: no forced change.
  await prisma.user.update({
    where: { id: user.id },
    data: { mustChangePassword: false },
  })
  return "created"
}
