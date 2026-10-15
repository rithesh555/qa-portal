import {
  DEFECT_STATUS_LABELS,
  type DefectStatus,
  SEVERITIES,
  type Severity,
  SEVERITY_LABELS,
} from "@qa/shared"
import {
  CheckIcon,
  CircleDotIcon,
  CircleIcon,
  type LucideIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  TimerIcon,
  XIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

/** Each status has a word, an icon and its own tint; none reuse the result colours. */
const STATUS_STYLE: Record<DefectStatus, string> = {
  new: "bg-defect-new text-defect-new-ink",
  open: "bg-defect-open text-defect-open-ink",
  in_progress: "bg-defect-progress text-defect-progress-ink",
  fixed: "bg-defect-fixed text-defect-fixed-ink",
  reopened: "bg-defect-reopened text-defect-reopened-ink",
  closed: "bg-muted text-muted-foreground border-border",
  rejected: "bg-transparent text-muted-foreground border-dashed border-input",
}

export const DEFECT_STATUS_ICON: Record<DefectStatus, LucideIcon> = {
  new: CircleDotIcon,
  open: CircleIcon,
  in_progress: TimerIcon,
  fixed: RefreshCwIcon,
  reopened: RotateCcwIcon,
  closed: CheckIcon,
  rejected: XIcon,
}

export function DefectStatusBadge({
  status,
  className,
}: {
  status: DefectStatus
  className?: string
}) {
  const Icon = DEFECT_STATUS_ICON[status]
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border border-transparent px-2.5 text-xs font-medium whitespace-nowrap",
        STATUS_STYLE[status],
        className
      )}
    >
      <Icon aria-hidden className="size-3" />
      {DEFECT_STATUS_LABELS[status]}
    </span>
  )
}

const LEVEL: Record<Severity, number> = {
  critical: 4,
  major: 3,
  minor: 2,
  trivial: 1,
}

/** Severity as a word with 1–4 bars, in the text colour. */
export function SeverityIndicator({ severity }: { severity: Severity }) {
  const filled = LEVEL[severity]
  return (
    <span
      className={cn(
        "inline-flex items-end gap-1.5 text-sm whitespace-nowrap",
        severity === "critical" && "font-semibold"
      )}
    >
      <span aria-hidden className="inline-flex items-end gap-0.5">
        {SEVERITIES.map((_, i) => (
          <span
            key={i}
            className={cn(
              "inline-block w-[3px] rounded-[1px]",
              i < filled ? "bg-foreground" : "bg-border"
            )}
            style={{ height: 5 + i * 3 }}
          />
        ))}
      </span>
      {SEVERITY_LABELS[severity]}
    </span>
  )
}
