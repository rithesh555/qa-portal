import type { ResultStatus } from "@qa/shared"

export interface DemoRun {
  name: string
  environment: string
  closed: boolean
  /** Share of cases with a result, 0–1. */
  tested: number
  /** When the run started, in days before today. */
  daysAgo: number
}

const ENVIRONMENTS = [
  "Chrome 128 · staging",
  "Safari 18 · staging",
  "Firefox 130 · staging",
  "iOS 18 app · build 812",
  "Android 15 app · build 812",
]

/**
 * A project's demo runs, oldest first: a finished regression run, one in
 * progress, and one just started. Deterministic per key and index.
 */
export function demoRuns(key: string, index: number): DemoRun[] {
  const env = (n: number) => ENVIRONMENTS[(index + n) % ENVIRONMENTS.length]!
  return [
    {
      name: `${key} regression: previous release`,
      environment: env(0),
      closed: true,
      tested: 1,
      daysAgo: 21,
    },
    {
      name: `${key} regression: current release`,
      environment: env(1),
      closed: false,
      tested: 0.6,
      daysAgo: 4,
    },
    {
      name: `${key} smoke: latest build`,
      environment: env(2),
      closed: false,
      tested: 0,
      daysAgo: 0,
    },
  ]
}

const FAILURES = [
  "The page shows a spinner that never stops",
  "The total is off by one cent after a discount",
  "Error 500 after saving; the change is lost",
  "The confirmation email never arrives",
  "The button is hidden behind the keyboard on small screens",
]

const BLOCKERS = [
  "The staging payment sandbox is down",
  "No test account with the right permissions",
  "Blocked by the failing login step",
]

/** A cheap, stable spread of numbers 0–999 for a (run, case) pair. */
const spread = (run: number, position: number) =>
  (position * 7919 + run * 104_729) % 1000

/**
 * The demo result for the case at `position` of run `run`, or null when it
 * stays untested. About 80% pass; failures and blocks carry a note.
 */
export function demoOutcome(
  run: number,
  position: number,
  tested: number,
  steps: number
): {
  status: ResultStatus
  note: string
  failedStep: number | null
} | null {
  if (((position * 389 + run * 61) % 1000) / 1000 >= tested) return null
  const roll = spread(run, position)
  if (roll < 800) return { status: "passed", note: "", failedStep: null }
  if (roll < 880)
    return {
      status: "failed",
      note: FAILURES[position % FAILURES.length]!,
      failedStep: steps > 0 ? (position % steps) + 1 : null,
    }
  if (roll < 940)
    return {
      status: "blocked",
      note: BLOCKERS[position % BLOCKERS.length]!,
      failedStep: null,
    }
  return { status: "skipped", note: "", failedStep: null }
}
