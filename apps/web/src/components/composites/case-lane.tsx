import { RUN_CASE_STATUS_LABELS, type RunCaseStatus } from "@qa/shared"
import { useEffect, useRef } from "react"
import { STATUS_FILL } from "./result-status"
import { cn } from "@/lib/utils"

export interface LaneCase {
  id: string
  key: string
  status: RunCaseStatus
}

/**
 * The run as a lane of case pills: filled once recorded, the current case
 * ringed in ink. Each pill says its key and result; a big run wraps inside
 * its own scroll box (about four rows) and keeps the current case in view.
 * The box is one Tab stop (it scrolls with the arrow keys); the pills are for
 * pointer and touch, and the case list is the keyboard route to a case.
 */
export function CaseLane({
  cases,
  currentId,
  onPick,
  label = "Cases in this run",
  className,
}: {
  cases: LaneCase[]
  currentId: string | null
  onPick: (id: string) => void
  label?: string
  className?: string
}) {
  const currentRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest" })
  }, [currentId])

  return (
    <div
      role="group"
      aria-label={label}
      tabIndex={0}
      className={cn(
        "max-h-40 overflow-y-auto rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className
      )}
    >
      <ul className="flex flex-wrap gap-1.5 p-1">
        {cases.map((c) => {
          const current = c.id === currentId
          const recorded = c.status !== "untested"
          return (
            <li key={c.id}>
              <button
                ref={current ? currentRef : undefined}
                type="button"
                tabIndex={-1}
                aria-current={current ? "true" : undefined}
                aria-label={`${c.key}, ${RUN_CASE_STATUS_LABELS[c.status]}`}
                onClick={() => onPick(c.id)}
                className={cn(
                  "h-7 rounded-full border px-3 font-mono text-xs transition-colors",
                  recorded
                    ? cn(
                        STATUS_FILL[c.status],
                        // Stripes in a left band, so the number sits on solid colour.
                        "border-transparent bg-[length:0.5rem_100%] bg-no-repeat text-on-status"
                      )
                    : "border-rule-strong bg-card text-foreground hover:bg-muted",
                  current &&
                    "ring-2 ring-foreground ring-offset-2 ring-offset-card"
                )}
              >
                {c.key.split("-").at(-1)}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
