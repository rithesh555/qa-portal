import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { admin, username } from "better-auth/plugins"
import type { PrismaClient } from "../lib/prisma.ts"
import { ac, roles } from "./permissions.ts"

/**
 * Header the API sets from Fastify's `request.ip` before handing a request to
 * Better Auth. Any client-sent value is overwritten, so it cannot be spoofed.
 */
export const CLIENT_IP_HEADER = "x-qa-client-ip"

export interface AuthConfig {
  prisma: PrismaClient
  baseURL: string
  secret: string
  webOrigin: string
}

export function createAuth({ prisma, baseURL, secret, webOrigin }: AuthConfig) {
  return betterAuth({
    appName: "QA Portal",
    baseURL,
    secret,
    trustedOrigins: [webOrigin],
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true,
      // Admins create accounts; there is no public sign-up.
      disableSignUp: true,
      minPasswordLength: 12,
    },
    user: {
      additionalFields: {
        // Server-owned: set by admins' create/reset, cleared by change-password.
        // No defaultValue here: the database default (true) applies, so a
        // new account must pick its own password even if a later step fails.
        mustChangePassword: {
          type: "boolean",
          required: false,
          input: false,
        },
      },
    },
    // Users sign in with a username only.
    disabledPaths: ["/sign-in/email", "/sign-up/email"],
    session: {
      expiresIn: 60 * 60 * 24, // 1 day
      updateAge: 60 * 60, // extend at most hourly
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      customRules: {
        // Per IP; loose because an office shares one address. Guessing one
        // account is limited per username in plugins/auth.ts.
        "/sign-in/username": { window: 60, max: 30 },
      },
    },
    advanced: {
      cookiePrefix: "qa-portal",
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
    },
    plugins: [
      username(),
      admin({ ac, roles, defaultRole: "user", adminRoles: ["admin"] }),
    ],
  })
}

export type Auth = ReturnType<typeof createAuth>
