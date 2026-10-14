import type { CaseFields } from "@qa/shared"

export interface DemoSuite {
  name: string
  children: string[]
}

export type DemoCase = Omit<CaseFields, "suiteId"> & {
  /** [] = no suite, [top] or [top, child]. */
  suitePath: string[]
}

export interface DemoCaseLibrary {
  suites: DemoSuite[]
  cases: DemoCase[]
}

/** Each project's suites: [name, noun used in case titles, sub-suites]. */
const AREAS: Record<string, [string, string, string[]][]> = {
  PAY: [
    ["Checkout", "payment", ["Cart", "Payment methods", "Wallets"]],
    ["Refunds", "refund", ["Full refunds", "Partial refunds"]],
    ["Payouts", "payout", []],
    ["Invoices", "invoice", []],
  ],
  MOB: [
    ["Sign-in", "session", ["Biometrics"]],
    ["Home", "home feed", []],
    ["Orders", "order", ["Tracking"]],
    ["Settings", "setting", []],
  ],
  CHK: [
    ["Basket", "basket item", []],
    ["Delivery", "delivery option", ["Click and collect"]],
    ["Confirmation", "order confirmation", []],
  ],
  ONB: [
    ["Sign-up", "account", ["Email verification"]],
    ["Identity checks", "identity check", []],
    ["First-run tour", "tour step", []],
  ],
  SRCH: [
    ["Search box", "search", ["Suggestions"]],
    ["Filters", "filter", []],
    ["Results", "result", ["Sorting"]],
  ],
  CAT: [
    ["Product pages", "product", ["Images", "Reviews"]],
    ["Pricing", "price", []],
    ["Stock", "stock level", []],
  ],
  ACC: [
    ["Profile", "profile", []],
    ["Addresses", "address", []],
    ["Preferences", "preference", []],
  ],
  NOTIF: [
    ["Email", "email", ["Templates"]],
    ["SMS", "text message", []],
    ["Push", "push notification", []],
  ],
  ADM: [
    ["Customers", "customer record", ["Notes"]],
    ["Orders", "order", ["Cancellations"]],
    ["Users", "staff user", []],
  ],
  RPT: [
    ["Sales", "sales report", []],
    ["Operations", "operations report", []],
    ["Exports", "report export", []],
  ],
  INV: [
    ["Stock sync", "stock update", ["Warehouse feed"]],
    ["Reservations", "reservation", []],
  ],
  LOY: [
    ["Points", "points balance", []],
    ["Tiers", "tier", []],
    ["Rewards", "reward", ["Vouchers"]],
  ],
  API: [
    ["Authentication", "API key", []],
    ["Orders API", "order request", ["Webhooks"]],
    ["Rate limits", "rate limit", []],
  ],
  SEC: [
    ["Sign-in", "sign-in attempt", ["Two-factor"]],
    ["Permissions", "permission", []],
    ["Audit log", "audit entry", []],
  ],
  LEG: [["Old portal", "legacy page", []]],
}

type Template = {
  title: (noun: string) => string
  steps: (noun: string) => [string, string][]
  type: CaseFields["type"]
  labels: string[]
}

/** "a payment", "an invoice". */
const a = (noun: string) =>
  /^[aeiou]/i.test(noun) ? `an ${noun}` : `a ${noun}`
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const plural = (noun: string) => (noun.endsWith("s") ? noun : `${noun}s`)

const TEMPLATES: Template[] = [
  {
    title: (n) => `Create ${a(n)} with valid data`,
    steps: (n) => [
      [`Open the ${n} form`, "All required fields are marked"],
      ["Fill in every required field with valid data", ""],
      ["Choose Save", `The ${n} is saved and a confirmation shows`],
    ],
    type: "functional",
    labels: ["smoke"],
  },
  {
    title: (n) => `Reject ${a(n)} with a missing required field`,
    steps: (n) => [
      [`Open the ${n} form and leave one required field empty`, ""],
      ["Choose Save", "An error names the missing field and nothing is saved"],
    ],
    type: "functional",
    labels: ["regression"],
  },
  {
    title: (n) => `Edit ${a(n)} and save the changes`,
    steps: (n) => [
      [`Open an existing ${n}`, ""],
      ["Change one field and choose Save", "The new value shows"],
      ["Reload the page", "The change is kept"],
    ],
    type: "functional",
    labels: ["regression"],
  },
  {
    title: (n) => `Cancelling an edit keeps the old ${n} values`,
    steps: () => [
      ["Change a field", ""],
      ["Choose Cancel", "The original values show again"],
    ],
    type: "usability",
    labels: [],
  },
  {
    title: (n) => `Search ${plural(n)} by name`,
    steps: (n) => [
      [
        `Type part of ${a(n)} name in the search box`,
        `Matching ${plural(n)} show as you type`,
      ],
      ["Clear the search", "The full list shows again"],
    ],
    type: "functional",
    labels: [],
  },
  {
    title: (n) => `Page through more than 100 ${plural(n)}`,
    steps: () => [
      [
        "Open the list with more than 100 entries",
        "The first page and a page count show",
      ],
      ["Go to the last page", "The remaining entries show"],
    ],
    type: "performance",
    labels: [],
  },
  {
    title: (n) => `${cap(plural(n))} list loads in under 2 seconds`,
    steps: () => [
      [
        "Open the list on a throttled “Fast 4G” connection",
        "It is usable within 2 seconds",
      ],
    ],
    type: "performance",
    labels: ["automated"],
  },
  {
    title: (n) => `Viewers can't change ${a(n)}`,
    steps: (n) => [
      ["Sign in as a read-only user", ""],
      [`Open ${a(n)}`, "Edit and delete actions are not shown"],
    ],
    type: "security",
    labels: ["regression"],
  },
  {
    title: (n) => `Changing ${a(n)} writes an audit entry`,
    steps: (n) => [
      [`Change ${a(n)}`, ""],
      ["Open the audit log", "An entry shows who changed what, and when"],
    ],
    type: "security",
    labels: [],
  },
  {
    title: (n) => `${cap(n)} screens work at phone width`,
    steps: () => [
      [
        "Resize the browser to 375 px wide",
        "Nothing is cut off and there is no sideways scrolling",
      ],
      ["Complete the main task", "Every control can be reached and used"],
    ],
    type: "usability",
    labels: [],
  },
  {
    title: (n) => `Complete the ${n} flow with the keyboard only`,
    steps: () => [
      [
        "Use Tab and Enter only",
        "Focus is always visible and follows the reading order",
      ],
      ["Finish the task", "It completes without a mouse"],
    ],
    type: "usability",
    labels: ["accessibility"],
  },
  {
    title: (n) => `Clear error when the ${n} service is down`,
    steps: () => [
      ["Block the backend with dev tools", ""],
      [
        "Repeat the last action",
        "A plain error with a retry option shows; no data is lost",
      ],
    ],
    type: "other",
    labels: [],
  },
]

const PRIORITIES: CaseFields["priority"][] = [
  "medium",
  "high",
  "low",
  "critical",
  "medium",
  "high",
]

/**
 * A project's suites and cases for the dev demo seed. Deterministic: the
 * same key and index always give the same library. Bigger projects get more
 * cases, so lists and filters can be tried at realistic sizes.
 */
export function demoCaseLibrary(key: string, index: number): DemoCaseLibrary {
  const areas = AREAS[key] ?? [["General", "record", []]]
  const suites = areas.map(([name, , children]) => ({ name, children }))
  // Repeats of the templates (1–6) set the project size: about 40 to 300 cases.
  const rounds = key === "PAY" ? 4 : 1 + ((index * 5) % 6)
  const cases: DemoCase[] = []
  let n = 0
  for (let round = 0; round < rounds; round++) {
    for (const [top, noun, children] of areas) {
      for (const [ti, template] of TEMPLATES.entries()) {
        n += 1
        const child = children.length
          ? children[(ti + round) % (children.length + 1)]
          : undefined
        const variant =
          round === 0
            ? ""
            : ` (${["mobile", "Safari", "slow network", "second language", "large account"][(round - 1) % 5]})`
        cases.push({
          title: `${template.title(noun)}${variant}`,
          // Every 37th case has no suite, as imported strays would.
          suitePath: n % 37 === 0 ? [] : child ? [top, child] : [top],
          priority: PRIORITIES[(n + index) % PRIORITIES.length]!,
          type: template.type,
          status: (n + index) % 4 === 0 ? "draft" : "ready",
          labels: [
            ...template.labels,
            ...(n % 9 === 0 ? ["checkout-critical"] : []),
          ],
          references: n % 5 === 0 ? `${key}-${1000 + n}` : "",
          preconditions:
            n % 3 === 0
              ? `Signed in as a ${["customer", "QA Lead", "support agent"][n % 3]} with sample data.`
              : "",
          steps: template
            .steps(noun)
            .map(([action, expected]) => ({ action, expected })),
        })
      }
    }
  }
  return { suites, cases }
}
