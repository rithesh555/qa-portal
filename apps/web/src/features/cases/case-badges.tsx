import {
  CASE_PRIORITIES,
  CASE_PRIORITY_LABELS,
  CASE_STATUS_LABELS,
  type CasePriority,
  type CaseStatus,
  type Suite,
} from "@qa/shared"
import { ArchiveIcon, CheckIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/*
 * Case status and priority deliberately avoid the pass/fail/blocked hues:
 * those are reserved for test results, so a "Ready" case never reads as a pass.
 */

const BARS: Record<CasePriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
}

/** Signal bars plus the word: told apart by shape and text, not colour. */
export function PriorityIndicator({ priority }: { priority: CasePriority }) {
  const filled = BARS[priority]
  return (
    <span
      className={cn(
        "inline-flex items-end gap-0.5 text-sm whitespace-nowrap",
        priority === "critical" && "font-semibold"
      )}
    >
      <span aria-hidden className="mr-1.5 inline-flex items-end gap-0.5">
        {CASE_PRIORITIES.map((_, i) => (
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
      {CASE_PRIORITY_LABELS[priority]}
    </span>
  )
}

export function CaseStatusBadge({
  status,
  archived,
}: {
  status: CaseStatus
  archived: boolean
}) {
  if (archived) {
    return (
      <Badge variant="secondary" className="text-muted-foreground">
        <ArchiveIcon data-icon="inline-start" />
        Archived
      </Badge>
    )
  }
  if (status === "ready") {
    return (
      <Badge className="bg-accent text-accent-foreground">
        <CheckIcon data-icon="inline-start" />
        {CASE_STATUS_LABELS.ready}
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="border-dashed border-input text-muted-foreground"
    >
      {CASE_STATUS_LABELS.draft}
    </Badge>
  )
}

export function LabelChip({ label }: { label: string }) {
  return (
    <span className="inline-flex h-5 items-center rounded-sm border bg-background px-1.5 text-xs text-foreground/80">
      {label}
    </span>
  )
}

/** "Parent › Child" for a suite id, or "No suite". */
export function suitePath(
  suites: readonly Suite[] | undefined,
  id: string | null
): string {
  if (!id) return "No suite"
  const suite = suites?.find((s) => s.id === id)
  if (!suite) return "Archived suite"
  const parent = suite.parentId
    ? suites?.find((s) => s.id === suite.parentId)
    : null
  return parent ? `${parent.name} › ${suite.name}` : suite.name
}

/** A toggle option that is clearly on in both themes: primary outline, tint and a check. */
export const SELECTED_TOGGLE =
  "px-3 aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-foreground dark:aria-pressed:bg-primary/20"
