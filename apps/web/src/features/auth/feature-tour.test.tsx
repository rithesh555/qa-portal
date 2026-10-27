import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { FEATURES, FeatureTour } from "./feature-tour"

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: reduce && query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  )
}

// The feature on show: its title is the first line of the live region.
const heading = () =>
  screen
    .getByRole("region", { name: "Features" })
    .querySelector("[data-title]")!

describe("FeatureTour", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockReducedMotion(false)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("moves to the next feature every 5 seconds, and wraps", () => {
    render(<FeatureTour />)
    expect(heading()).toHaveTextContent(FEATURES[0]!.title)
    act(() => vi.advanceTimersByTime(5000))
    expect(heading()).toHaveTextContent(FEATURES[1]!.title)
    act(() => vi.advanceTimersByTime(5000 * (FEATURES.length - 1)))
    expect(heading()).toHaveTextContent(FEATURES[0]!.title)
  })

  it("stops on Pause and goes on with Play", () => {
    render(<FeatureTour />)
    fireEvent.click(screen.getByRole("button", { name: "Pause" }))
    act(() => vi.advanceTimersByTime(15000))
    expect(heading()).toHaveTextContent(FEATURES[0]!.title)
    fireEvent.click(screen.getByRole("button", { name: "Play" }))
    act(() => vi.advanceTimersByTime(5000))
    expect(heading()).toHaveTextContent(FEATURES[1]!.title)
  })

  it("shows a chosen feature and stays on it", () => {
    render(<FeatureTour />)
    const third = screen.getByRole("button", {
      name: `Show feature 3 of ${FEATURES.length}: ${FEATURES[2]!.title}`,
    })
    fireEvent.click(third)
    expect(third).toHaveAttribute("aria-current", "true")
    expect(heading()).toHaveTextContent(FEATURES[2]!.title)
    act(() => vi.advanceTimersByTime(15000))
    expect(heading()).toHaveTextContent(FEATURES[2]!.title)
    expect(screen.getByRole("button", { name: "Play" })).toBeVisible()
  })

  it("starts paused when the user prefers reduced motion", () => {
    mockReducedMotion(true)
    render(<FeatureTour />)
    expect(screen.getByRole("button", { name: "Play" })).toBeVisible()
    act(() => vi.advanceTimersByTime(15000))
    expect(heading()).toHaveTextContent(FEATURES[0]!.title)
  })

  it("announces the feature only while paused, from a region that stays put", () => {
    render(<FeatureTour />)
    const live = heading().closest("[aria-live]")!
    expect(live).toHaveAttribute("aria-live", "off")
    fireEvent.click(screen.getByRole("button", { name: "Pause" }))
    expect(live).toHaveAttribute("aria-live", "polite")
    fireEvent.click(screen.getByRole("button", { name: /^Show feature 2 of/ }))
    expect(heading().closest("[aria-live]")).toBe(live)
    expect(live).toHaveTextContent(FEATURES[1]!.title)
  })

  it("has no headings of its own, so the page's h1 comes first", () => {
    render(<FeatureTour />)
    expect(screen.queryByRole("heading")).toBeNull()
  })

  it("holds still while the pointer is over it, then goes on", () => {
    render(<FeatureTour />)
    const tour = screen.getByRole("region", { name: "Features" })
    fireEvent.mouseEnter(tour)
    act(() => vi.advanceTimersByTime(15000))
    expect(heading()).toHaveTextContent(FEATURES[0]!.title)
    fireEvent.mouseLeave(tour)
    act(() => vi.advanceTimersByTime(5000))
    expect(heading()).toHaveTextContent(FEATURES[1]!.title)
  })

  it("holds still while focus is inside it", () => {
    render(<FeatureTour />)
    const pause = screen.getByRole("button", { name: "Pause" })
    fireEvent.focus(pause)
    act(() => vi.advanceTimersByTime(15000))
    expect(heading()).toHaveTextContent(FEATURES[0]!.title)
    expect(pause).toBeVisible()
    fireEvent.blur(pause)
    act(() => vi.advanceTimersByTime(5000))
    expect(heading()).toHaveTextContent(FEATURES[1]!.title)
  })
})
