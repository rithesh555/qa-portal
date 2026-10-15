import type {
  DefectPriority,
  DefectStatus,
  DetectedIn,
  Reproducibility,
  Resolution,
  Severity,
} from "@qa/shared"

export interface DemoDefect {
  /** From a failed or blocked result of the in-progress run (null: logged by hand). */
  fromResult: boolean
  fields: {
    title: string
    description: string
    steps: string
    expected: string
    actual: string
    severity: Severity
    reproducibility: Reproducibility
    detectedIn: DetectedIn
    environment: string
    developer: string
    trackerUrl: string
  }
  priority: DefectPriority | null
  /** Every status it went through, starting with "new". */
  path: DefectStatus[]
  resolution?: Resolution
  /** Days before today it was logged. */
  daysAgo: number
}

const PATHS: { path: DefectStatus[]; resolution?: Resolution }[] = [
  { path: ["new"] },
  { path: ["new", "open"] },
  { path: ["new", "open", "in_progress"] },
  { path: ["new", "open", "in_progress", "fixed"] },
  { path: ["new", "open", "in_progress", "fixed", "reopened"] },
  { path: ["new", "open", "in_progress", "fixed", "closed"] },
  { path: ["new", "rejected"], resolution: "works_as_designed" },
  { path: ["new", "open", "in_progress", "fixed", "closed"] },
]

const PROBLEMS = [
  [
    "Spinner never stops after the bank redirect",
    "The page keeps loading; reloading shows nothing saved",
  ],
  ["Total is off by one cent after a discount", "Shows 9.99 instead of 10.00"],
  [
    "Error 500 after saving; the change is lost",
    "Server error page; the list still shows the old value",
  ],
  [
    "Confirmation email never arrives",
    "No email after 10 minutes; spam folder empty",
  ],
  [
    "Button hidden behind the keyboard on small screens",
    "Can't tap Save on a 390px wide phone",
  ],
  [
    "Search ignores accented letters",
    "Searching “resume” doesn't find “résumé”",
  ],
  [
    "Date shows in the wrong time zone",
    "Shows UTC instead of the account's zone",
  ],
  ["Export CSV puts tax in the wrong column", "Tax appears under Discount"],
]

const SEVERITY: Severity[] = [
  "critical",
  "major",
  "minor",
  "major",
  "trivial",
  "minor",
  "major",
  "critical",
]
const PRIORITY: DefectPriority[] = ["high", "medium", "low"]

/**
 * A project's demo defects: one in each part of the workflow, most logged
 * from results, one found in UAT by hand. Deterministic per key and index.
 */
export function demoDefects(key: string, index: number): DemoDefect[] {
  return PATHS.map(({ path, resolution }, i) => {
    const [title, actual] = PROBLEMS[(i + index) % PROBLEMS.length]!
    const severity = SEVERITY[(i + index) % SEVERITY.length]!
    const manual = i === 1
    return {
      fromResult: !manual,
      fields: {
        title: title!,
        description: "",
        steps:
          "1. Sign in as a customer\n2. Do the main task of this screen\n3. Save",
        expected: "It saves and shows a confirmation",
        actual: actual!,
        severity,
        reproducibility: i % 5 === 3 ? "intermittent" : "always",
        detectedIn: manual ? "uat" : "qa",
        environment: manual ? "UAT · Chrome 128" : "",
        developer:
          path.length > 2
            ? ["Marco Silva", "Ana Costa", "Wei Zhang"][i % 3]!
            : "",
        trackerUrl:
          path.length > 2
            ? `https://tracker.example.com/browse/${key}-${1200 + i}`
            : "",
      },
      priority:
        path.length > 1 && path[1] !== "rejected"
          ? PRIORITY[(i + index) % 3]!
          : null,
      path,
      ...(resolution ? { resolution } : {}),
      daysAgo: 10 - i,
    }
  })
}
