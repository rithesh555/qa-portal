import type { RunCaseDetail } from "@qa/shared"
import { InlineError } from "@/components/inline-error"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useCase } from "@/features/cases/api"
import { useProjectContext } from "@/features/projects/project-layout"

/** The run's copy next to the case as it is now, changed fields only. */
export function CompareDialog({
  detail,
  open,
  onOpenChange,
  onUseLatest,
  canUpdate,
}: {
  detail: RunCaseDetail
  open: boolean
  onOpenChange: (open: boolean) => void
  onUseLatest: () => void
  canUpdate: boolean
}) {
  const { project } = useProjectContext()
  const latest = useCase(project.key, open ? detail.caseKey : null)
  const rows: { field: string; before: string; after: string }[] = []
  if (latest.data) {
    const now = latest.data
    if (now.title !== detail.title)
      rows.push({ field: "Title", before: detail.title, after: now.title })
    if (now.preconditions !== detail.preconditions)
      rows.push({
        field: "Preconditions",
        before: detail.preconditions || "—",
        after: now.preconditions || "—",
      })
    const steps = Math.max(now.steps.length, detail.steps.length)
    const text = (s?: { action: string; expected: string }) =>
      s ? `${s.action}${s.expected ? ` → ${s.expected}` : ""}` : "—"
    for (let i = 0; i < steps; i++) {
      const a = detail.steps[i]
      const b = now.steps[i]
      if (a?.action !== b?.action || a?.expected !== b?.expected)
        rows.push({
          field: `Step ${i + 1}`,
          before: a ? text(a) : "—",
          after: b ? text(b) : "Removed",
        })
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {detail.caseKey}: version {detail.revision} →{" "}
            {detail.latestRevision}
          </DialogTitle>
          <DialogDescription>
            Only the fields that changed are listed.
          </DialogDescription>
        </DialogHeader>
        {latest.isPending ? (
          <Skeleton className="h-32" />
        ) : latest.isError ? (
          <InlineError
            what="Couldn't load the latest version."
            error={latest.error}
            onRetry={() => void latest.refetch()}
          />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            The title, preconditions and steps are the same; only details such
            as priority or labels changed.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pe-3 font-semibold">Field</th>
                  <th className="py-2 pe-3 font-semibold">
                    In this run (v{detail.revision})
                  </th>
                  <th className="py-2 font-semibold">
                    Latest (v{detail.latestRevision})
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.field} className="border-b align-top">
                    <th
                      scope="row"
                      className="py-2 pe-3 text-left font-medium whitespace-nowrap"
                    >
                      {r.field}
                    </th>
                    <td className="py-2 pe-3 whitespace-pre-wrap">
                      {r.before}
                    </td>
                    <td className="py-2 whitespace-pre-wrap">{r.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {canUpdate && (
            <Button onClick={onUseLatest}>Use the latest version…</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
