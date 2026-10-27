import type { RunCaseStatus } from "@qa/shared"
import { useEffect, useState } from "react"
import { STATUS_FILL } from "@/components/composites/result-status"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

/** What the app does, one feature per slide. Each line must stay true. */
export const FEATURES = [
  {
    title: "Write cases once.",
    body: "Steps, expected results and versions in one editor, or import them straight from Excel.",
  },
  {
    title: "Run them fast.",
    body: "Record a result with one key. P passes, F fails, and the next case is already open.",
  },
  {
    title: "Failures become defects.",
    body: "Log a defect from a failed step and it remembers the case, the run and the release.",
  },
  {
    title: "Know where a release stands.",
    body: "Live progress for every run, and a report you can print or share as CSV.",
  },
  {
    title: "Everyone sees their part.",
    body: "Leads, testers and viewers each get the projects they need, nothing more.",
  },
] as const

const ADVANCE_MS = 5000

// A run filling up as the tour goes on: one more case recorded per slide.
const LANE: [string, RunCaseStatus][] = [
  ["101", "passed"],
  ["102", "passed"],
  ["104", "passed"],
  ["108", "failed"],
  ["111", "passed"],
  ["115", "blocked"],
  ["120", "passed"],
]

/**
 * The sign-in page's feature tour. It moves on by itself every 5 seconds
 * unless paused (or the user prefers reduced motion); choosing a feature
 * pauses it there, and it holds still while hovered or focused. Screen
 * readers hear a feature only once it stops moving.
 */
export function FeatureTour() {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)")
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(reduceMotion)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const moving = !paused && !hovered && !focused

  useEffect(() => {
    if (!moving) return
    const id = setInterval(
      () => setIndex((i) => (i + 1) % FEATURES.length),
      ADVANCE_MS
    )
    return () => clearInterval(id)
  }, [moving])

  const feature = FEATURES[index]!
  const recorded = index + 2

  return (
    <section
      aria-label="Features"
      className="flex max-w-xl flex-col gap-7"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false)
      }}
    >
      <ul aria-hidden="true" className="flex flex-wrap gap-1.5">
        {LANE.map(([n, status], i) => (
          <li
            key={n}
            className={cn(
              "flex h-7 items-center rounded-full border px-3 font-mono text-xs transition-colors duration-300",
              i < recorded
                ? cn(STATUS_FILL[status], "border-transparent text-on-status")
                : "border-rule-strong text-muted-foreground",
              i === recorded &&
                "ring-2 ring-brand ring-offset-2 ring-offset-background"
            )}
          >
            {n}
          </li>
        ))}
      </ul>
      {/* The live region stays put; only the slide inside it is re-keyed for
          the animation, so a chosen feature is announced. */}
      <div aria-live={moving ? "off" : "polite"} className="min-h-40">
        <div
          key={index}
          className="flex flex-col gap-3 motion-safe:animate-in motion-safe:duration-500 motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2"
        >
          <p
            data-title
            className="text-4xl font-semibold tracking-tight text-balance break-words"
          >
            {feature.title}
          </p>
          <p className="max-w-[44ch] text-lg text-muted-foreground">
            {feature.body}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex">
          {FEATURES.map((f, i) => (
            <button
              key={f.title}
              type="button"
              aria-label={`Show feature ${i + 1} of ${FEATURES.length}: ${f.title}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => {
                setIndex(i)
                setPaused(true)
              }}
              className="group flex size-7 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span
                className={cn(
                  "h-1 rounded-full transition-colors",
                  i === index
                    ? "w-6 bg-brand"
                    : "w-4 bg-muted-foreground/70 group-hover:bg-muted-foreground"
                )}
              />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="h-7 rounded-full border border-rule-strong px-3 text-xs text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {paused ? "Play" : "Pause"}
        </button>
      </div>
    </section>
  )
}
