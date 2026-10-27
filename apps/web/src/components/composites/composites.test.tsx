import type { RunCaseStatus } from "@qa/shared"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { CaseLane, type LaneCase } from "./case-lane"
import { DataError } from "./data-state"
import { ProgressBar } from "./result-status"
import { PageHeader } from "./page-header"

describe("PageHeader", () => {
  it("renders the title as the page heading with its actions", () => {
    render(
      <PageHeader
        title="Defects"
        description="Problems found while testing."
        actions={<button type="button">New defect</button>}
      />
    )
    expect(
      screen.getByRole("heading", { level: 1, name: "Defects" })
    ).toBeVisible()
    expect(screen.getByText("Problems found while testing.")).toBeVisible()
    expect(screen.getByRole("button", { name: "New defect" })).toBeVisible()
  })

  it("lists facts as a labelled group and keeps long values whole", () => {
    const long = "Release 2.4 regression for the new checkout and refunds flow"
    render(
      <PageHeader
        title="PAY-R-12"
        facts={[
          { label: "Release", value: long },
          { label: "Status", value: "Open" },
        ]}
      />
    )
    const group = screen.getByRole("group", { name: "PAY-R-12 details" })
    expect(within(group).getByText(long)).toBeVisible()
    expect(within(group).getByText("Release")).toBeInTheDocument()
    expect(within(group).getAllByRole("listitem")).toHaveLength(2)
  })

  it("renders no facts group without facts", () => {
    render(<PageHeader title="Projects" />)
    expect(screen.queryByRole("group")).toBeNull()
  })
})

describe("CaseLane", () => {
  const scroll = vi.fn()
  beforeEach(() => {
    Element.prototype.scrollIntoView = scroll
  })
  afterEach(() => scroll.mockClear())

  const statuses: RunCaseStatus[] = ["passed", "failed", "untested", "blocked"]
  const cases: LaneCase[] = statuses.map((status, i) => ({
    id: `c${i}`,
    key: `PAY-TC-10${i}`,
    status,
  }))

  it("marks exactly one case as current", () => {
    render(<CaseLane cases={cases} currentId="c2" onPick={() => {}} />)
    const current = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("aria-current") === "true")
    expect(current).toHaveLength(1)
    expect(current[0]).toHaveAccessibleName("PAY-TC-102, Untested")
  })

  it("keeps the result in the name of a failed current case", () => {
    render(<CaseLane cases={cases} currentId="c1" onPick={() => {}} />)
    const button = screen.getByRole("button", { name: "PAY-TC-101, Failed" })
    expect(button).toHaveAttribute("aria-current", "true")
    expect(button).toHaveTextContent("101")
  })

  it("picks a case by id", () => {
    const onPick = vi.fn()
    render(<CaseLane cases={cases} currentId="c0" onPick={onPick} />)
    fireEvent.click(screen.getByRole("button", { name: "PAY-TC-103, Blocked" }))
    expect(onPick).toHaveBeenCalledWith("c3")
  })

  it("holds a big run in one scroll box and brings the current case into view", () => {
    const many: LaneCase[] = Array.from({ length: 300 }, (_, i) => ({
      id: `c${i}`,
      key: `PAY-TC-${i + 1}`,
      status: "untested",
    }))
    render(<CaseLane cases={many} currentId="c250" onPick={() => {}} />)
    const lane = screen.getByRole("group", { name: "Cases in this run" })
    expect(within(lane).getAllByRole("button")).toHaveLength(300)
    expect(scroll).toHaveBeenCalledTimes(1)
    expect(scroll.mock.contexts[0]).toHaveAccessibleName("PAY-TC-251, Untested")
  })
})

describe("DataError", () => {
  it("says what failed and retries", () => {
    const onRetry = vi.fn()
    render(
      <DataError
        title="Couldn't load defects"
        error={new Error("Network down")}
        onRetry={onRetry}
      />
    )
    expect(screen.getByText("Couldn't load defects")).toBeVisible()
    // Anything but an API error reads as the connection problem it usually is.
    expect(screen.getByText(/couldn't reach the server/)).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})

describe("ProgressBar", () => {
  const zero = { passed: 0, failed: 0, blocked: 0, skipped: 0, untested: 0 }

  it("draws an empty track for a run with no cases", () => {
    render(<ProgressBar counts={zero} />)
    const bar = screen.getByRole("img")
    expect(bar.getAttribute("aria-label")).not.toMatch(/NaN/)
    // formatPercent says "—" when there is nothing to count yet.
    expect(bar.getAttribute("aria-label")).toMatch(/^— complete: 0 passed/)
    expect(bar.children).toHaveLength(0)
  })

  it("fills the whole track for a single passed case", () => {
    render(<ProgressBar counts={{ ...zero, passed: 1 }} />)
    const bar = screen.getByRole("img")
    expect(bar.children).toHaveLength(1)
    expect((bar.children[0] as HTMLElement).style.width).toBe("100%")
  })

  it("leaves untested cases as track", () => {
    render(<ProgressBar counts={{ ...zero, passed: 1, untested: 3 }} />)
    const bar = screen.getByRole("img")
    expect((bar.children[0] as HTMLElement).style.width).toBe("25%")
    expect(bar).toHaveAccessibleName(/1 passed.*3 untested/)
  })
})
