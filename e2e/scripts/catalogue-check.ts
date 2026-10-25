// Every catalogue case has exactly one Playwright test and every test (other
// than setup) belongs to a catalogue case.
import { execFileSync } from "node:child_process"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { allCases } from "../catalogue/index.ts"
import { idOf } from "../catalogue/types.ts"

interface Suite {
  title: string
  file: string
  specs?: { title: string; file: string }[]
  suites?: Suite[]
}

const json = execFileSync(
  "pnpm",
  [
    "exec",
    "playwright",
    "test",
    "--list",
    "--reporter=json",
    // Its own folder: a listing clears the output folder of a run in progress.
    `--output=${join(tmpdir(), "qa-portal-e2e-list")}`,
  ],
  {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  }
)
const report = JSON.parse(json.slice(json.indexOf("{"))) as { suites: Suite[] }

const tests = new Map<string, Set<string>>() // id → "file › title"
const strays: string[] = []
const walk = (suites: Suite[] = []) => {
  for (const s of suites) {
    for (const spec of s.specs ?? []) {
      if (spec.file.startsWith("setup/")) continue
      const id = idOf(spec.title)
      if (!id) strays.push(`${spec.file} › ${spec.title}`)
      else
        (tests.get(id) ?? tests.set(id, new Set()).get(id)!).add(
          `${spec.file} › ${spec.title}`
        )
    }
    walk(s.suites)
  }
}
walk(report.suites)

const problems: string[] = []
const ids = new Set<string>()
for (const c of allCases()) {
  if (ids.has(c.id)) problems.push(`${c.id} is in the catalogue twice`)
  ids.add(c.id)
  const found = tests.get(c.id)
  if (!found) problems.push(`${c.id} has no test`)
  else if (found.size > 1)
    problems.push(`${c.id} has ${found.size} tests: ${[...found].join("; ")}`)
}
for (const id of tests.keys())
  if (!ids.has(id)) problems.push(`${id} is tested but not in the catalogue`)
for (const s of strays) problems.push(`no catalogue id: ${s}`)

if (problems.length) {
  console.error(problems.join("\n"))
  process.exit(1)
}
console.log(`Catalogue OK: ${ids.size} cases, each with one test.`)
