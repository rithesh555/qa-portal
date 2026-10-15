import {
  type ActivityItem,
  CASE_PRIORITY_LABELS,
  CASE_STATUS_LABELS,
  CASE_TYPE_LABELS,
  PROJECT_ROLE_LABELS,
  type ProjectRole,
  RELEASE_STATUS_LABELS,
  type ReleaseStatus,
  DEFECT_STATUS_LABELS,
  type DefectStatus,
  RESOLUTION_LABELS,
  type Resolution,
  RUN_CASE_STATUS_LABELS,
  SEVERITY_LABELS,
  type Severity,
  type RunCaseStatus,
} from "@qa/shared"

// Activity details are stored JSON written by older versions too, so every
// field is read defensively.
const text = (value: unknown): string | null =>
  typeof value === "string" && value ? value : null

const nameOf = (value: unknown): string | null =>
  typeof value === "object" && value !== null
    ? text((value as { name?: unknown }).name)
    : null

const roleLabel = (value: unknown): string | null =>
  typeof value === "string" && value in PROJECT_ROLE_LABELS
    ? PROJECT_ROLE_LABELS[value as ProjectRole]
    : null

const change = (value: unknown): { from: unknown; to: unknown } | null =>
  typeof value === "object" && value !== null && "to" in value
    ? (value as { from: unknown; to: unknown })
    : null

/** One sentence (without the actor's name) for an activity log entry. */
export function describeActivity(item: ActivityItem): string {
  const c = item.changes ?? {}
  const key = `${item.entityType}.${item.action}`

  switch (key) {
    case "project.created": {
      const lead = nameOf(c.lead)
      return lead
        ? `created the project and made ${lead} QA Lead`
        : "created the project"
    }
    case "project.updated": {
      const renamed = text(change(c.name)?.to)
      return renamed
        ? `renamed the project to ${renamed}`
        : "updated the project description"
    }
    case "project.archived":
      return "archived the project"
    case "project.unarchived":
      return "restored the project from the archive"
    case "member.added": {
      const who = nameOf(c.user)
      const role = roleLabel(c.role)
      if (!who) return "added someone"
      return role ? `added ${who} as ${role}` : `added ${who}`
    }
    case "member.role_changed": {
      const who = nameOf(c.user) ?? "someone"
      const role = change(c.role)
      const from = roleLabel(role?.from)
      const to = roleLabel(role?.to)
      return from && to
        ? `changed ${who} from ${from} to ${to}`
        : `changed ${who}'s role`
    }
    case "member.removed":
      return `removed ${nameOf(c.user) ?? "someone"}`
    case "release.created": {
      const name = text(c.name)
      return name ? `created release ${name}` : "created a release"
    }
    case "release.updated": {
      const name = text(c.name)
      const status = text(change(c.status)?.to)
      const label =
        status && status in RELEASE_STATUS_LABELS
          ? RELEASE_STATUS_LABELS[status as ReleaseStatus]
          : null
      if (!name) return "updated a release"
      return label
        ? `set release ${name} to ${label}`
        : `updated release ${name}`
    }
    case "case.created":
    case "case.updated":
    case "case.archived":
    case "case.restored": {
      const verb = item.action
      const caseKey = text(c.key)
      return caseKey ? `${verb} test case ${caseKey}` : `${verb} a test case`
    }
    case "suite.created": {
      const name = text(c.name)
      return name ? `created suite ${name}` : "created a suite"
    }
    case "suite.updated": {
      const name = text(c.name)
      return name ? `updated suite ${name}` : "updated a suite"
    }
    case "suite.archived": {
      const name = text(c.name) ?? "a suite"
      const cases = typeof c.cases === "number" ? c.cases : null
      if (cases === null) return `archived suite ${name}`
      return `archived suite ${name} and its ${cases} test ${cases === 1 ? "case" : "cases"}`
    }
    case "import.created": {
      const created = typeof c.created === "number" ? c.created : null
      const file = text(c.fileName)
      const number =
        typeof c.importNumber === "number" ? ` (import #${c.importNumber})` : ""
      if (created === null) return `imported test cases${number}`
      return `imported ${created} test ${created === 1 ? "case" : "cases"}${file ? ` from ${file}` : ""}${number}`
    }
    case "import.restored": {
      const number =
        typeof c.importNumber === "number"
          ? `import #${c.importNumber}`
          : "an import"
      const cases =
        typeof c.cases === "number"
          ? ` (${c.cases} test ${c.cases === 1 ? "case" : "cases"})`
          : ""
      return `restored ${number}${cases}`
    }
    case "import.archived": {
      const number =
        typeof c.importNumber === "number"
          ? `import #${c.importNumber}`
          : "an import"
      const cases =
        typeof c.cases === "number"
          ? ` (${c.cases} test ${c.cases === 1 ? "case" : "cases"})`
          : ""
      return `archived ${number}${cases}`
    }
    case "bulk.updated":
    case "bulk.archived":
      return describeBulk(item.action, c)
    default:
      return item.entityType === "run"
        ? describeRun(item.action, c)
        : item.entityType === "defect"
          ? describeDefect(item.action, c)
          : "made a change"
  }
}

const cases = (n: number) => `${n} test ${n === 1 ? "case" : "cases"}`

/** A change made to many test cases at once. */
function describeBulk(action: string, c: Record<string, unknown>): string {
  const count =
    typeof c.count === "number" ? cases(c.count) : "several test cases"
  const label = (labels: Record<string, string>, value: unknown) =>
    typeof value === "string" ? labels[value] : undefined
  if (action === "archived") {
    const reason = text(c.reason)
    return reason ? `archived ${count}: ${reason}` : `archived ${count}`
  }
  switch (c.kind) {
    case "setPriority": {
      const to = label(CASE_PRIORITY_LABELS, c.priority)
      if (to) return `set priority to ${to} on ${count}`
      break
    }
    case "setType": {
      const to = label(CASE_TYPE_LABELS, c.type)
      if (to) return `set type to ${to} on ${count}`
      break
    }
    case "setStatus": {
      const to = label(CASE_STATUS_LABELS, c.status)
      if (to) return `marked ${count} ${to}`
      break
    }
    case "move":
      return `moved ${count} to ${text(c.suite) ?? "No suite"}`
    case "addLabels": {
      const labels = Array.isArray(c.labels)
        ? c.labels.filter((l): l is string => typeof l === "string")
        : []
      if (labels.length) {
        return `added ${labels.length === 1 ? "label" : "labels"} ${labels.join(", ")} to ${count}`
      }
      break
    }
  }
  return `changed ${count}`
}

const runCases = (n: number) => `${n} ${n === 1 ? "case" : "cases"}`

/** Something done to a test run (single results aren't logged here). */
function describeRun(action: string, c: Record<string, unknown>): string {
  const key = text(c.key)
  const run = key ? `run ${key}` : "a run"
  const count = typeof c.count === "number" ? runCases(c.count) : "some cases"
  const inRun = key ? ` in ${key}` : ""
  switch (action) {
    case "created": {
      const name = text(c.name)
      const from = text(c.copiedFrom)
      const n = typeof c.cases === "number" ? ` with ${cases(c.cases)}` : ""
      return `started ${run}${name ? ` (${name})` : ""}${from ? ` from ${from}` : ""}${n}`
    }
    case "updated":
      return `updated ${run}`
    case "closed": {
      const untested = typeof c.untested === "number" ? c.untested : 0
      return untested > 0
        ? `closed ${run} with ${runCases(untested)} untested`
        : `closed ${run}`
    }
    case "reopened":
      return `reopened ${run}`
    case "results_recorded": {
      const status =
        typeof c.status === "string" && c.status in RUN_CASE_STATUS_LABELS
          ? RUN_CASE_STATUS_LABELS[c.status as RunCaseStatus]
          : null
      return status
        ? `marked ${count} ${status}${inRun}`
        : `recorded results on ${count}${inRun}`
    }
    case "assigned": {
      const who = nameOf(c.assignee)
      return who
        ? `assigned ${count}${inRun} to ${who}`
        : `unassigned ${count}${inRun}`
    }
    case "cases_added":
      return `added ${count} to ${key ?? "a run"}`
    case "cases_removed":
      return `removed ${count} from ${key ?? "a run"}`
    default:
      return `changed ${run}`
  }
}

/** A defect logged or moved along its workflow (field edits stay out of the feed). */
function describeDefect(action: string, c: Record<string, unknown>): string {
  const key = text(c.key)
  const defect = key ? `defect ${key}` : "a defect"
  if (action === "created") {
    const severity = text(c.severity)
    const level =
      severity && severity in SEVERITY_LABELS
        ? ` (${SEVERITY_LABELS[severity as Severity]})`
        : ""
    const title = text(c.title)
    return `logged ${defect}${level}${title ? `: ${title}` : ""}`
  }
  if (action === "status_changed") {
    const to = text(c.to)
    if (!key || !to || !(to in DEFECT_STATUS_LABELS))
      return "changed a defect's status"
    if (to === "rejected") {
      const r = text(c.resolution)
      return r && r in RESOLUTION_LABELS
        ? `rejected ${defect} (${RESOLUTION_LABELS[r as Resolution]})`
        : `rejected ${defect}`
    }
    return `moved ${defect} to ${DEFECT_STATUS_LABELS[to as DefectStatus]}`
  }
  return `changed ${defect}`
}
