// Records the last Playwright run (results/results.json) as a test run in the
// E2E project on the dev portal: one result per catalogue case. Separate from
// the test run itself, so a failed upload never changes a test outcome.
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { idOf } from "../catalogue/types.ts"
import { portalSettings, signInToPortal } from "./portal.ts"

type Outcome = "passed" | "failed" | "blocked" | "skipped"

interface JsonTest {
  projectName: string
  status: "expected" | "unexpected" | "flaky" | "skipped"
  expectedStatus: string
  annotations: { type: string; description?: string }[]
  results: { status: string; retry: number; error?: { message?: string } }[]
}
interface JsonSuite {
  specs?: { title: string; tests: JsonTest[] }[]
  suites?: JsonSuite[]
}
interface JsonReport {
  suites: JsonSuite[]
  stats: {
    startTime: string
    duration: number
    expected: number
    unexpected: number
    flaky: number
    skipped: number
  }
}

const resultsFile = fileURLToPath(
  new URL("../results/results.json", import.meta.url)
)
const report = JSON.parse(readFileSync(resultsFile, "utf8")) as JsonReport

// eslint-disable-next-line no-control-regex
const plain = (s: string) => s.replace(/\u001b\[[0-9;]*m/g, "")
const firstLine = (s = "") =>
  plain(s)
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean) ?? "failed"

/** Folds every project's result for one case into a single outcome. */
function outcome(tests: JsonTest[]): { status: Outcome; note: string } {
  const failed = tests.filter((t) => t.status === "unexpected")
  if (failed.length)
    return {
      status: "failed",
      note: failed
        .map(
          (t) =>
            `[${t.projectName}] ${firstLine(t.results.at(-1)?.error?.message)}`
        )
        .join("\n")
        .slice(0, 1000),
    }
  // test.fail(): a known app bug, still failing as expected.
  const known = tests.find(
    (t) => t.expectedStatus === "failed" && t.status === "expected"
  )
  if (known)
    return {
      status: "blocked",
      note: `Known app bug: ${known.annotations.find((a) => a.type === "fail" || a.type === "issue")?.description ?? "see the test"}`,
    }
  if (tests.every((t) => t.status === "skipped"))
    return { status: "skipped", note: "" }
  const flaky = tests.filter((t) => t.status === "flaky")
  return {
    status: "passed",
    note: flaky.length
      ? `Passed on retry (${flaky.map((t) => t.projectName).join(", ")})`
      : "",
  }
}

const byId = new Map<string, JsonTest[]>()
const walk = (suites: JsonSuite[] = []) => {
  for (const s of suites) {
    for (const spec of s.specs ?? []) {
      const id = idOf(spec.title)
      if (id) byId.set(id, [...(byId.get(id) ?? []), ...spec.tests])
    }
    walk(s.suites)
  }
}
walk(report.suites)
if (byId.size === 0)
  throw new Error(
    "No catalogue tests in results/results.json — run pnpm e2e first."
  )

const s = portalSettings()
const portal = await signInToPortal(s.url, s.username, s.password())
const git = (...args: string[]) => {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim()
  } catch {
    return "?"
  }
}
const started = new Date(report.stats.startTime)
const { expected, unexpected, flaky, skipped } = report.stats
const run = await portal.call<{ key: string }>(
  "POST",
  `/projects/${s.projectKey}/runs`,
  {
    name: `E2E ${started.toISOString().slice(0, 16).replace("T", " ")} · ${git("rev-parse", "--short", "HEAD")}`,
    description: [
      `Playwright: ${expected} passed, ${unexpected} failed, ${flaky} flaky, ${skipped} skipped`,
      `Duration ${Math.round(report.stats.duration / 1000)} s · branch ${git("rev-parse", "--abbrev-ref", "HEAD")}`,
    ].join("\n"),
    environment: "Local E2E stack (Chromium desktop, Pixel 7, dark)",
    releaseId: null,
    assigneeIds: [],
    selection: { mode: "filter", label: "e2e" },
  }
)

const cases = await portal.call<{
  items: { id: string; title: string; version: number }[]
}>("GET", `/projects/${s.projectKey}/runs/${run.key}/cases`)
const byCase = new Map(cases.items.map((c) => [idOf(c.title), c]))

const tally: Record<Outcome, number> = {
  passed: 0,
  failed: 0,
  blocked: 0,
  skipped: 0,
}
const bulk: Record<"passed" | "skipped", string[]> = { passed: [], skipped: [] }
const notInPortal: string[] = []
for (const [id, tests] of byId) {
  const rc = byCase.get(id)
  if (!rc) {
    notInPortal.push(id)
    continue
  }
  const o = outcome(tests)
  tally[o.status]++
  if ((o.status === "passed" || o.status === "skipped") && !o.note)
    bulk[o.status].push(rc.id)
  else
    await portal.call(
      "POST",
      `/projects/${s.projectKey}/runs/${run.key}/cases/${rc.id}/results`,
      {
        status: o.status,
        note: o.note,
        failedStep: null,
        expectedVersion: rc.version,
      }
    )
}
for (const status of ["passed", "skipped"] as const)
  for (let i = 0; i < bulk[status].length; i += 2000)
    await portal.call(
      "POST",
      `/projects/${s.projectKey}/runs/${run.key}/results/bulk`,
      {
        runCaseIds: bulk[status].slice(i, i + 2000),
        status,
        note: "",
      }
    )

const untested = cases.items.length - (byId.size - notInPortal.length)
console.log(
  `Recorded ${run.key}: ${tally.passed} passed, ${tally.failed} failed, ${tally.blocked} blocked (known bugs), ${tally.skipped} skipped, ${untested} not run.`
)
if (notInPortal.length)
  console.log(
    `Not in ${s.projectKey} yet (run pnpm e2e:catalogue:push): ${notInPortal.join(", ")}`
  )
console.log(`${s.url}/projects/${s.projectKey}/runs/${run.key}`)
