import { formatPercent, type ReleaseSummary } from "@qa/shared"
import { CheckIcon, CircleHelpIcon, XIcon } from "lucide-react"
import { Link } from "react-router"
import { ProjectTile } from "@/components/project-tile"
import { formatDay } from "@/features/projects/release-status"
import { cn } from "@/lib/utils"

/** Days from today (UTC calendar days) to a YYYY-MM-DD date. */
export function daysUntil(day: string, now = new Date()): number {
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  )
  return Math.round((Date.parse(`${day}T00:00:00Z`) - today) / 86_400_000)
}

export function targetText(day: string | null, now = new Date()) {
  if (!day) return "No target date"
  const d = daysUntil(day, now)
  const when =
    d === 0
      ? "today"
      : d === 1
        ? "tomorrow"
        : d > 0
          ? `${d} days`
          : d === -1
            ? "1 day late"
            : `${-d} days late`
  return `${formatDay(day)} · ${when}`
}

export type Verdict = "no" | "yes" | "na"

export const verdictOf = (r: ReleaseSummary): Verdict =>
  !r.hasRuns ? "na" : r.failingChecks > 0 ? "no" : "yes"

export function verdictText(r: ReleaseSummary) {
  const v = verdictOf(r)
  if (v === "na") return "No runs yet"
  if (v === "yes") return "Ready · all checks pass"
  return `Not ready · ${r.failingChecks} ${r.failingChecks === 1 ? "check fails" : "checks fail"}`
}

export function Verdict({ release }: { release: ReleaseSummary }) {
  const v = verdictOf(release)
  const Icon = v === "no" ? XIcon : v === "yes" ? CheckIcon : CircleHelpIcon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold whitespace-nowrap",
        v === "na" && "font-normal text-muted-foreground"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full",
          v === "no" && "bg-foreground text-background",
          v === "yes" && "bg-muted text-foreground",
          v === "na" && "border border-dashed border-input"
        )}
      >
        <Icon className="size-3" strokeWidth={3} />
      </span>
      {verdictText(release)}
    </span>
  )
}

export const reportUrl = (r: ReleaseSummary) =>
  `/projects/${r.project.key}/reports?release=${r.release.id}`

/** Active releases side by side; each project's numbers are its own, never averaged. */
export function ReleaseTable({
  releases,
  showLead = false,
}: {
  releases: ReleaseSummary[]
  showLead?: boolean
}) {
  const th =
    "px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap text-muted-foreground"
  // Columns shown from md up; on a phone they fold into the first cell.
  const wide = "hidden md:table-cell"
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th scope="col" className={th}>
              Project · release
            </th>
            <th scope="col" className={cn(th, wide)}>
              Ready to ship?
            </th>
            <th scope="col" className={cn(th, wide, "text-right")}>
              Pass rate
            </th>
            <th scope="col" className={cn(th, wide, "text-right")}>
              Tested
            </th>
            <th
              scope="col"
              className={cn(th, wide, "text-right whitespace-normal")}
            >
              Open Critical / Major
            </th>
            <th scope="col" className={cn(th, wide)}>
              Target
            </th>
            {showLead && (
              <th scope="col" className={cn(th, wide)}>
                QA Lead
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {releases.map((r) => {
            const late = r.release.targetDate
              ? daysUntil(r.release.targetDate) < 0
              : false
            const passRate =
              r.passRate === null ? "—" : formatPercent(r.passRate)
            const tested = r.readyCases
              ? formatPercent(r.testedReady / r.readyCases)
              : "—"
            return (
              <tr key={r.release.id} className="border-b last:border-0">
                <td className="px-3 py-3">
                  <span className="flex min-w-44 items-center gap-2.5">
                    <ProjectTile projectKey={r.project.key} size="sm" />
                    <span className="flex flex-col">
                      <Link
                        to={reportUrl(r)}
                        className="font-medium underline-offset-4 hover:text-primary hover:underline"
                      >
                        {r.project.name} · {r.release.name}
                      </Link>
                      {/* On a phone the other columns fold in here (F15). */}
                      <span className="mt-1 flex flex-col gap-1 text-xs text-muted-foreground md:hidden">
                        <Verdict release={r} />
                        <span>
                          Pass rate {passRate} · tested {tested} · open Critical
                          / Major {r.openCritical} / {r.openMajor}
                        </span>
                        <span>
                          {targetText(r.release.targetDate)}
                          {showLead && ` · ${r.lead ?? "No QA Lead"}`}
                        </span>
                      </span>
                    </span>
                  </span>
                </td>
                <td className={cn("px-3 py-3", wide)}>
                  <Verdict release={r} />
                </td>
                <td className={cn("px-3 py-3 text-right tabular-nums", wide)}>
                  {passRate}
                </td>
                <td className={cn("px-3 py-3 text-right tabular-nums", wide)}>
                  {tested}
                </td>
                <td className={cn("px-3 py-3 text-right tabular-nums", wide)}>
                  {r.openCritical} / {r.openMajor}
                </td>
                <td
                  className={cn(
                    "px-3 py-3 whitespace-nowrap",
                    wide,
                    late && "font-medium"
                  )}
                >
                  {targetText(r.release.targetDate)}
                </td>
                {showLead && (
                  <td className={cn("px-3 py-3 whitespace-nowrap", wide)}>
                    {r.lead ?? (
                      <span className="text-muted-foreground">No QA Lead</span>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
