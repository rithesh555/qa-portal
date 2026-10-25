import type { CasePriority, CaseType } from "@qa/shared"

/**
 * One E2E test case as it appears in the portal. The id starts the Playwright
 * test's title and the portal case's title, which is how results find their
 * case (`pnpm e2e:publish`).
 */
export interface CatalogueCase {
  id: string
  title: string
  priority: CasePriority
  type?: CaseType
  preconditions?: string
  /** [what the tester does, what should happen] */
  steps: [action: string, expected: string][]
}

export interface CatalogueSuite {
  /** "Module › Area", one level of nesting at most. */
  suite: string
  /** Module label added to every case, e.g. "auth". */
  label: string
  cases: CatalogueCase[]
}

/** The portal title of a catalogue case: "E2E-AUTH-001 · Sign in". */
export const portalTitle = (c: CatalogueCase) => `${c.id} · ${c.title}`

/** The catalogue id at the start of a Playwright test title, if any. */
export const idOf = (title: string) =>
  /^(E2E-[A-Z0-9]+-\d{3})\b/.exec(title)?.[1]
