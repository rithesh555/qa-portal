import { fileURLToPath } from "node:url"

/** Seeded accounts, one set per worker slot (apps/api/prisma/seed-e2e.ts). */
export const ROLES = ["admin", "lead", "tester", "viewer", "outsider"] as const
export type Role = (typeof ROLES)[number]
/** Never signed in: the account is deactivated. */
export type AnyRole = Role | "deactivated"

export const username = (role: AnyRole, slot: number) => `e2e.${role}.${slot}`
export const displayName = (role: AnyRole, slot: number) =>
  `E2E ${role[0]!.toUpperCase()}${role.slice(1)} ${slot}`

export const statePath = (role: Role, slot: number) =>
  fileURLToPath(new URL(`../.auth/${slot}-${role}.json`, import.meta.url))

/**
 * A client IP per worker (and per purpose), sent as X-Forwarded-For through
 * the local proxy, so per-IP sign-in limits don't pool all workers.
 */
export const clientIp = (slot: number, n = 1) => `10.77.${slot}.${n}`
