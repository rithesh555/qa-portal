import {
  completion,
  countTotal,
  formatPercent,
  RUN_CASE_STATUS_LABELS,
  type RunCaseStatus,
  type RunCounts,
} from "@qa/shared"
import {
  BanIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  CircleXIcon,
  type LucideIcon,
  SkipForwardIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

/** Fill colour per status; failed and blocked are striped (in opposite directions) so colour is never the only cue. */
export const STATUS_FILL: Record<RunCaseStatus, string> = {
  passed: "bg-status-pass",
  failed: "bg-status-fail hatched",
  blocked: "bg-status-blocked hatched-reverse",
  skipped: "bg-status-skipped",
  untested: "bg-muted",
}

export const STATUS_ICON: Record<RunCaseStatus, LucideIcon> = {
  passed: CircleCheckIcon,
  failed: CircleXIcon,
  blocked: BanIcon,
  skipped: SkipForwardIcon,
  untested: CircleDashedIcon,
}

const STATUS_TEXT: Record<RunCaseStatus, string> = {
  passed: "text-status-pass-ink",
  failed: "text-status-fail-ink",
  blocked: "text-status-blocked-ink",
  skipped: "text-status-skipped-ink",
  untested: "text-muted-foreground",
}

/** A selected result button: the status fill with text that keeps 4.5:1 in both themes. Stripes sit in a left band, never under the label. */
export const STATUS_PRESSED: Record<RunCaseStatus, string> = {
  passed: "bg-status-pass hover:bg-status-pass text-on-status",
  failed:
    "bg-status-fail hover:bg-status-fail hatched bg-[length:0.5rem_100%] bg-no-repeat text-on-status",
  blocked:
    "bg-status-blocked hover:bg-status-blocked hatched-reverse bg-[length:0.5rem_100%] bg-no-repeat text-on-status",
  skipped: "bg-status-skipped hover:bg-status-skipped text-on-status",
  untested: "",
}

const BAR_ORDER = ["passed", "failed", "blocked", "skipped"] as const

/** The run's results as one stacked bar; the untested rest is the track. */
export function ProgressBar({
  counts,
  className,
}: {
  counts: RunCounts
  className?: string
}) {
  const total = countTotal(counts)
  const label = `${formatPercent(completion(counts))} complete: ${BAR_ORDER.map(
    (s) => `${counts[s]} ${RUN_CASE_STATUS_LABELS[s].toLowerCase()}`
  ).join(", ")}, ${counts.untested} untested`
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "flex h-3 overflow-hidden rounded-full bg-muted ring-1 ring-input ring-inset",
        className
      )}
    >
      {total > 0 &&
        BAR_ORDER.map((s) =>
          counts[s] > 0 ? (
            <span
              key={s}
              className={cn(
                "h-full not-first:border-l not-first:border-background",
                STATUS_FILL[s]
              )}
              style={{ width: `${(counts[s] / total) * 100}%` }}
            />
          ) : null
        )}
    </div>
  )
}

export function StatusLegend({ className }: { className?: string }) {
  return (
    <ul
      className={cn(
        "flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground",
        className
      )}
    >
      {([...BAR_ORDER, "untested"] as const).map((s) => (
        <li key={s} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn(
              "size-2.5 rounded-[3px]",
              STATUS_FILL[s],
              s === "untested" && "ring-1 ring-input ring-inset"
            )}
          />
          {RUN_CASE_STATUS_LABELS[s]}
        </li>
      ))}
    </ul>
  )
}

/** Icon plus word: readable without colour. */
export function RunCaseStatusBadge({
  status,
  className,
}: {
  status: RunCaseStatus
  className?: string
}) {
  const Icon = STATUS_ICON[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap",
        className
      )}
    >
      <Icon aria-hidden className={cn("size-4", STATUS_TEXT[status])} />
      {RUN_CASE_STATUS_LABELS[status]}
    </span>
  )
}

/** Just the icon, with the status as its accessible name. */
export function RunCaseStatusIcon({
  status,
  className,
  decorative = false,
}: {
  status: RunCaseStatus
  className?: string
  /** When the status is already said in words next to it. */
  decorative?: boolean
}) {
  const Icon = STATUS_ICON[status]
  return (
    <Icon
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": RUN_CASE_STATUS_LABELS[status] })}
      className={cn("size-4 shrink-0", STATUS_TEXT[status], className)}
    />
  )
}
