import {
  DEFECT_PRIORITY_LABELS,
  DEFECT_STATUS_LABELS,
  type DefectActivity,
  type DefectPriority,
  type DefectStatus,
  DETECTED_IN_LABELS,
  type DetectedIn,
  REPRODUCIBILITY_LABELS,
  type Reproducibility,
  RESOLUTION_LABELS,
  type Resolution,
  type Severity,
  SEVERITY_LABELS,
} from "@qa/shared"

// Activity details are stored JSON, so every value is read defensively.
const str = (v: unknown): string | null =>
  typeof v === "string" && v ? v : null

const FIELD_NAMES: Record<string, string> = {
  title: "title",
  description: "description",
  steps: "steps to reproduce",
  expected: "expected result",
  actual: "actual result",
  severity: "severity",
  priority: "priority",
  reproducibility: "reproducibility",
  detectedIn: "where it was detected",
  environment: "environment",
  assigneeId: "assignee",
  developer: "developer",
  trackerUrl: "tracker link",
}

function valueLabel(field: string, v: unknown): string | null {
  const s = str(v)
  if (field === "severity" && s) return SEVERITY_LABELS[s as Severity] ?? s
  if (field === "priority")
    return s ? (DEFECT_PRIORITY_LABELS[s as DefectPriority] ?? s) : "not set"
  if (field === "reproducibility" && s)
    return REPRODUCIBILITY_LABELS[s as Reproducibility] ?? s
  if (field === "detectedIn" && s)
    return DETECTED_IN_LABELS[s as DetectedIn] ?? s
  return null
}

const statusLabel = (v: unknown) => {
  const s = str(v)
  return s && s in DEFECT_STATUS_LABELS
    ? DEFECT_STATUS_LABELS[s as DefectStatus]
    : null
}

/** One sentence (without the actor's name) for a defect history entry. */
export function describeDefectActivity(item: DefectActivity): string {
  const c = item.changes ?? {}
  switch (item.action) {
    case "commented":
      return "commented"
    case "created":
      return "logged this defect"
    case "status_changed": {
      const to = statusLabel(c.to)
      const resolution = str(c.resolution)
      const reason =
        resolution && resolution in RESOLUTION_LABELS
          ? ` (${RESOLUTION_LABELS[resolution as Resolution]})`
          : ""
      return to ? `moved it to ${to}${reason}` : "changed the status"
    }
    case "linked":
    case "unlinked": {
      const kind = str(c.result)
      const what = kind ? `a ${kind} result` : "a result"
      return item.action === "linked" ? `linked ${what}` : `unlinked ${what}`
    }
    case "updated": {
      const parts: string[] = []
      for (const [field, change] of Object.entries(c)) {
        if (field === "key" || !(field in FIELD_NAMES)) continue
        const to =
          typeof change === "object" && change !== null && "to" in change
            ? valueLabel(field, (change as { to: unknown }).to)
            : null
        parts.push(to ? `${FIELD_NAMES[field]} to ${to}` : FIELD_NAMES[field]!)
      }
      return parts.length ? `changed ${parts.join(", ")}` : "edited the defect"
    }
    default:
      return "made a change"
  }
}
