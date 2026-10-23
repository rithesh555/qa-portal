import { type DefectRef, type RunCase, type RunCaseDetail } from "@qa/shared"
import { BugIcon } from "lucide-react"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { projectPath } from "@/app/nav"
import { useProjectContext } from "@/features/projects/project-layout"
import { errorMessage } from "@/lib/api"
import { useTransition } from "./api"
import { DefectStatusBadge } from "./defect-badges"

/** Close a fixed defect as verified, with this run's pass as the evidence. */
function CloseVerified({
  defect,
  resultId,
}: {
  defect: DefectRef
  resultId: string
}) {
  const { project } = useProjectContext()
  const transition = useTransition(project.key, defect.key)
  return (
    <Button
      size="sm"
      disabled={transition.isPending}
      onClick={() =>
        transition.mutate(
          {
            to: "closed",
            note: "",
            evidenceResultId: resultId,
            version: defect.version,
          },
          {
            onSuccess: () =>
              toast.add({ title: `${defect.key} closed as verified` }),
            onError: (err) =>
              toast.add({
                type: "error",
                title: `Couldn't close ${defect.key}`,
                description: errorMessage(err),
              }),
          }
        )
      }
    >
      {transition.isPending && <Spinner data-icon="inline-start" />}
      Close {defect.key} as verified
    </Button>
  )
}

/**
 * Active defects on this case. When one is fixed and awaiting retest, the
 * case's result says what to do: a pass offers to close it, a failure to
 * reopen it.
 */
export function KnownDefects({
  item,
  detail,
  defects,
  onReopen,
}: {
  item: RunCase
  detail: RunCaseDetail | undefined
  defects: DefectRef[]
  onReopen: (defectId: string) => void
}) {
  const { project, allowed } = useProjectContext()
  const onCase = defects.filter((d) => d.onCase)
  if (onCase.length === 0) return null
  const canEdit = allowed("defects:edit")
  const latest = detail?.results[0]
  return (
    <section
      aria-label="Known defects on this case"
      className="flex flex-col gap-2 rounded-lg border bg-muted/50 p-3"
    >
      {onCase.map((d) => {
        const retest = d.status === "fixed"
        return (
          <div
            key={d.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm"
          >
            <BugIcon aria-hidden className="size-4 shrink-0" />
            <span className="min-w-0 flex-1">
              {retest ? "Retesting " : "Known defect "}
              <Link
                to={projectPath(project.key, `defects/${d.key}`)}
                className="font-semibold underline-offset-4 hover:underline"
              >
                {d.key}
              </Link>{" "}
              {d.title}
            </span>
            <DefectStatusBadge status={d.status} />
            {retest &&
              canEdit &&
              item.status === "passed" &&
              latest?.status === "passed" && (
                <CloseVerified defect={d} resultId={latest.id} />
              )}
            {retest &&
              canEdit &&
              (item.status === "failed" || item.status === "blocked") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReopen(d.id)}
                >
                  Still failing: reopen {d.key}…
                </Button>
              )}
          </div>
        )
      })}
    </section>
  )
}
