// Smoke checks for the container stack (docker/stack.sh smoke).
// Plain Node 22, no dependencies. Needs the admin from `stack.sh seed-admin`.
//
//   STACK_URL=http://localhost:8080 SEED_ADMIN_USERNAME=… SEED_ADMIN_PASSWORD=… node docker/smoke.ts

import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const composeFile = fileURLToPath(
  new URL("compose.stack.yaml", import.meta.url)
)
const envFile = fileURLToPath(new URL("../.env.stack", import.meta.url))
const base = (process.env.STACK_URL ?? "http://localhost:8080").replace(
  /\/$/,
  ""
)
const username = process.env.SEED_ADMIN_USERNAME
const password = process.env.SEED_ADMIN_PASSWORD
const origin = new URL(base).origin

type Check = { name: string; run: () => Promise<void> }

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

let cookie = ""

async function get(path: string, init: RequestInit = {}) {
  return fetch(base + path, { redirect: "manual", ...init })
}

const checks: Check[] = [
  {
    name: "api-health: /api/health is 200",
    run: async () => {
      const res = await get("/api/health")
      assert(res.status === 200, `status ${res.status}`)
      assert((await res.json()).status === "ok", "body is not {status: ok}")
    },
  },
  {
    name: "api-ready: /api/ready reaches the database",
    run: async () => {
      const res = await get("/api/ready")
      assert(res.status === 200, `status ${res.status}`)
      assert((await res.json()).database === "up", "database is not up")
    },
  },
  {
    name: "no-docs: API docs are off in production",
    run: async () => {
      const res = await get("/api/docs")
      assert(res.status === 404, `status ${res.status}`)
    },
  },
  {
    name: "origin-check: a write without Origin is refused",
    run: async () => {
      const res = await get("/api/auth/sign-in/username", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "nobody", password: "x".repeat(12) }),
      })
      assert(res.status === 403, `status ${res.status}`)
    },
  },
  {
    name: "sign-in: admin signs in; cookie is HttpOnly and SameSite",
    run: async () => {
      assert(username && password, "SEED_ADMIN_USERNAME/PASSWORD not set")
      const res = await get("/api/auth/sign-in/username", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin,
          // A client trying to pick its own IP. The client-ip check below
          // proves the API ignored it.
          "x-forwarded-for": "203.0.113.7",
        },
        body: JSON.stringify({ username, password }),
      })
      assert(
        res.status === 200,
        `status ${res.status} (run stack.sh seed-admin?)`
      )
      const setCookies = res.headers.getSetCookie()
      const session = setCookies.find((c) =>
        c.startsWith("qa-portal.session_token=")
      )
      assert(session, "no qa-portal.session_token cookie")
      assert(/;\s*HttpOnly/i.test(session), "session cookie is not HttpOnly")
      assert(
        /;\s*SameSite=(Lax|Strict)/i.test(session),
        "session cookie has no SameSite"
      )
      cookie = setCookies.map((c) => c.split(";")[0]).join("; ")
    },
  },
  {
    name: "client-ip: the API records the real client, not nginx or a spoofed header",
    run: async () => {
      assert(cookie, "needs sign-in")
      // No API route returns the session's IP, so read the newest session
      // row straight from the stack's database.
      const ip = execFileSync(
        "docker",
        [
          "compose",
          "-f",
          composeFile,
          "--env-file",
          envFile,
          "exec",
          "-T",
          "db",
          "sh",
          "-c",
          'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc ' +
            '"select ip_address from sessions order by created_at desc limit 1"',
        ],
        { encoding: "utf8" }
      ).trim()
      assert(ip, "newest session has no ip_address")
      assert(ip !== "203.0.113.7", "API believed a spoofed X-Forwarded-For")
      assert(
        ip !== "172.30.0.10",
        "API sees every client as nginx (TRUST_PROXY wrong)"
      )
    },
  },
  {
    name: "index: / serves the app",
    run: async () => {
      const res = await get("/")
      assert(res.status === 200, `status ${res.status}`)
      assert(
        res.headers.get("content-type")?.includes("text/html"),
        "not text/html"
      )
      assert(
        (await res.text()).includes('<div id="root"'),
        "no #root in index.html"
      )
    },
  },
  {
    name: "spa-fallback: a deep link gets index.html",
    run: async () => {
      const res = await get("/projects/DEMO/cases")
      assert(res.status === 200, `status ${res.status}`)
      assert(
        res.headers.get("content-type")?.includes("text/html"),
        "not text/html"
      )
    },
  },
  {
    name: "api-404: an unknown API path is a JSON 404, not the SPA",
    run: async () => {
      const res = await get("/api/does-not-exist")
      assert(res.status === 404, `status ${res.status}`)
      assert(
        res.headers.get("content-type")?.includes("application/json"),
        "not JSON"
      )
    },
  },
  {
    name: "cache-headers: index.html no-cache, hashed assets immutable",
    run: async () => {
      const index = await get("/")
      assert(
        index.headers.get("cache-control") === "no-cache",
        "index.html is cacheable"
      )
      const asset = (await index.text()).match(/\/assets\/[\w.-]+\.js/)?.[0]
      assert(asset, "no /assets/*.js in index.html")
      const res = await get(asset)
      assert(res.status === 200, `${asset}: status ${res.status}`)
      assert(
        res.headers.get("cache-control")?.includes("immutable"),
        `${asset} not immutable`
      )
      const missing = await get("/assets/missing-file.js")
      assert(
        missing.status === 404,
        `missing asset: status ${missing.status}, expected 404`
      )
    },
  },
  {
    name: "security-headers: CSP, nosniff, frame and referrer policy; no nginx version",
    run: async () => {
      const res = await get("/")
      const h = res.headers
      assert(
        h.get("content-security-policy")?.includes("default-src 'self'"),
        "no CSP"
      )
      assert(h.get("x-content-type-options") === "nosniff", "no nosniff")
      assert(h.get("x-frame-options") === "DENY", "no X-Frame-Options")
      assert(
        h.get("referrer-policy") === "strict-origin-when-cross-origin",
        "no Referrer-Policy"
      )
      assert(
        !/\d/.test(h.get("server") ?? ""),
        `Server header shows a version: ${h.get("server")}`
      )
      const api = await get("/api/health")
      assert(
        (api.headers.get("x-content-type-options") ?? "").split(",").length ===
          1,
        "API response has duplicated security headers"
      )
    },
  },
  {
    name: "upload-size: an 11 MiB import reaches the API; 13 MiB is refused by nginx",
    run: async () => {
      assert(cookie, "needs sign-in")
      const post = (bytes: number) =>
        get("/api/projects/SMOKE/imports/check", {
          method: "POST",
          headers: { "content-type": "application/json", origin, cookie },
          body: JSON.stringify({ pad: "x".repeat(bytes) }),
        })
      const ok = await post(11 * 1024 * 1024)
      assert(ok.status !== 413, "11 MiB was refused as too large")
      assert(ok.status < 500, `11 MiB: status ${ok.status}`)
      assert(
        ok.headers.get("content-type")?.includes("application/json"),
        "11 MiB: not an API reply"
      )
      const big = await post(13 * 1024 * 1024)
      assert(big.status === 413, `13 MiB: status ${big.status}, expected 413`)
    },
  },
]

let failed = 0
for (const check of checks) {
  try {
    await check.run()
    console.log(`PASS  ${check.name}`)
  } catch (err) {
    failed++
    console.log(`FAIL  ${check.name}\n      ${(err as Error).message}`)
  }
}
console.log(`\n${checks.length - failed}/${checks.length} passed`)
process.exit(failed === 0 ? 0 : 1)
