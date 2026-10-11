import { RELEASE_STATUS_LABELS, type ReleaseStatus } from "@qa/shared"
import { Badge } from "@/components/ui/badge"

const VARIANT: Record<ReleaseStatus, "outline" | "default" | "secondary"> = {
  planned: "outline",
  in_progress: "default",
  released: "secondary",
}

export function ReleaseStatusBadge({ status }: { status: ReleaseStatus }) {
  return (
    <Badge variant={VARIANT[status]}>{RELEASE_STATUS_LABELS[status]}</Badge>
  )
}

const dayFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeZone: "UTC",
})

/** "2026-10-24" → "Oct 24, 2026". Calendar days, so no time zone shift. */
export function formatDay(day: string | null): string | null {
  return day ? dayFormat.format(new Date(`${day}T00:00:00Z`)) : null
}
