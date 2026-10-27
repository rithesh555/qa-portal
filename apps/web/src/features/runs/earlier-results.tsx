import { RUN_CASE_STATUS_LABELS, type RunCaseDetail } from "@qa/shared"
import { HistoryIcon } from "lucide-react"
import { exactTime } from "@/lib/time"
import { RunCaseStatusIcon } from "./run-status"

/** The results recorded for a run case, newest first. */
export function EarlierResults({ detail }: { detail: RunCaseDetail }) {
  if (detail.results.length === 0) return null
  return (
    <section aria-labelledby="earlier-results" className="flex flex-col gap-2">
      <h3
        id="earlier-results"
        className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
      >
        <HistoryIcon aria-hidden className="size-3.5" />
        Results in this run ({detail.results.length})
      </h3>
      <ol className="flex flex-col gap-2">
        {detail.results.map((r) => (
          <li key={r.id} className="flex gap-2 text-sm">
            <RunCaseStatusIcon status={r.status} className="mt-0.5" />
            <div className="min-w-0">
              <p>
                <span className="font-medium">
                  {RUN_CASE_STATUS_LABELS[r.status]}
                  {r.failedStep !== null && ` at step ${r.failedStep}`}
                </span>{" "}
                <span className="text-muted-foreground">
                  by {r.recordedBy.name} ·{" "}
                  {exactTime.format(new Date(r.recordedAt))} · version{" "}
                  {r.revision}
                </span>
              </p>
              {r.note && (
                <p className="break-words whitespace-pre-wrap text-muted-foreground">
                  “{r.note}”
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
