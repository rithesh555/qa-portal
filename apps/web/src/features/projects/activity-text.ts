import {
  type ActivityItem,
  PROJECT_ROLE_LABELS,
  type ProjectRole,
  RELEASE_STATUS_LABELS,
  type ReleaseStatus,
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
    default:
      return "made a change"
  }
}
