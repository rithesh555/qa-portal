import { writeFileSync } from "node:fs"
import { request, test as setup, expect } from "@playwright/test"
import { idsPath } from "../../fixtures/api.ts"
import { e2eEnv } from "../../fixtures/env.ts"
import { clientIp, ROLES, statePath, username } from "../../fixtures/roles.ts"

// Signs in every seeded account once through the API and saves its cookies;
// tests start already signed in. The sign-in screen itself has its own specs.
setup("sign in the E2E accounts", async () => {
  const ids: Record<string, Record<string, string>> = {}
  for (let slot = 0; slot < e2eEnv.workers; slot++) {
    for (const role of ROLES) {
      const api = await request.newContext({
        baseURL: e2eEnv.baseURL,
        extraHTTPHeaders: {
          Origin: e2eEnv.baseURL,
          "X-Forwarded-For": clientIp(slot, 200),
        },
      })
      const res = await api.post("/api/auth/sign-in/username", {
        data: {
          username: username(role, slot),
          password:
            role === "admin" ? e2eEnv.adminPassword : e2eEnv.userPassword,
        },
      })
      expect(res.status(), `${username(role, slot)} signs in`).toBe(200)
      const me = await api.get("/api/me")
      ;(ids[slot] ??= {})[role] = ((await me.json()) as { id: string }).id
      await api.storageState({ path: statePath(role, slot) })
      await api.dispose()
    }
  }
  writeFileSync(idsPath, JSON.stringify(ids, null, 2))
})
