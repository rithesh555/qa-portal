import {
  type BulkCaseAction,
  CASE_PRIORITIES,
  CASE_PRIORITY_LABELS,
  CASE_STATUS_LABELS,
  CASE_STATUSES,
  CASE_TYPE_LABELS,
  CASE_TYPES,
  type CaseFilter,
  type Suite,
} from "@qa/shared"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { useProjectContext } from "@/features/projects/project-layout"
import { errorMessage } from "@/lib/api"
import { useBulkCases } from "./api"
import { LabelsInput } from "./labels-input"
import { suiteOptions } from "./suite-tree"

export type Selection =
  { ids: string[] } | { filter: Partial<CaseFilter>; exclude: string[] }

type Kind = "move" | "priority" | "type" | "status" | "labels" | "archive"

const plural = (n: number) => `${n} test ${n === 1 ? "case" : "cases"}`

const FIELD_LABELS: Record<Kind, string> = {
  move: "Suite",
  priority: "Priority",
  type: "Type",
  status: "Status",
  labels: "Labels to add",
  archive: "Reason",
}

const TITLES: Record<Kind, string> = {
  move: "Move to suite",
  priority: "Set priority",
  type: "Set type",
  status: "Set Draft or Ready",
  labels: "Add labels",
  archive: "Archive",
}

function BulkDialog({
  kind,
  selection,
  count,
  suites,
  labels,
  onClose,
  onDone,
}: {
  kind: Kind
  selection: Selection
  count: number
  suites: readonly Suite[]
  labels: readonly string[]
  onClose: () => void
  onDone: () => void
}) {
  const { project } = useProjectContext()
  const bulk = useBulkCases(project.key)
  // Nothing is preselected: a stray click on Apply must not change anything.
  const [value, setValue] = useState<string | null>(null)
  const [chosen, setChosen] = useState<string[]>([])
  const [reason, setReason] = useState("")

  const options =
    kind === "move"
      ? suiteOptions(suites)
      : kind === "priority"
        ? CASE_PRIORITIES.map((v) => ({
            value: v,
            label: CASE_PRIORITY_LABELS[v],
          }))
        : kind === "type"
          ? CASE_TYPES.map((v) => ({ value: v, label: CASE_TYPE_LABELS[v] }))
          : CASE_STATUSES.map((v) => ({
              value: v,
              label: CASE_STATUS_LABELS[v],
            }))

  function action(): BulkCaseAction["action"] {
    switch (kind) {
      case "move":
        return { kind: "move", suiteId: value === "none" ? null : value! }
      case "priority":
        return { kind: "setPriority", priority: value as never }
      case "type":
        return { kind: "setType", type: value as never }
      case "status":
        return { kind: "setStatus", status: value as never }
      case "labels":
        return { kind: "addLabels", labels: chosen }
      case "archive":
        return { kind: "archive", reason: reason.trim() }
    }
  }

  async function apply() {
    try {
      const { updated } = await bulk.mutateAsync({
        selection:
          "ids" in selection
            ? selection
            : { filter: selection.filter, exclude: selection.exclude },
        action: action(),
      })
      toast.add({
        title:
          kind === "archive"
            ? `${plural(updated)} archived`
            : `${plural(updated)} updated`,
        description:
          updated < count
            ? `${count - updated} already had that value or were archived.`
            : undefined,
      })
      onDone()
    } catch (err) {
      toast.add({
        type: "error",
        title: "Couldn't change the test cases",
        description: errorMessage(err),
      })
    }
  }

  const fieldId = "bulk-value"
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {kind === "archive"
              ? `Archive ${plural(count)}?`
              : `${TITLES[kind]} for ${plural(count)}`}
          </DialogTitle>
          <DialogDescription>
            {kind === "archive"
              ? "They become read-only and are left out of new test runs. Past runs keep their copy. A QA Lead can restore them later."
              : "Archived cases in the selection are skipped. Each change is recorded in the case's history."}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup className="py-2">
          {kind === "labels" ? (
            <Field>
              <FieldLabel htmlFor={fieldId}>Labels to add</FieldLabel>
              <LabelsInput
                id={fieldId}
                value={chosen}
                onChange={setChosen}
                suggestions={labels}
              />
            </Field>
          ) : kind === "archive" ? (
            <Field>
              <FieldLabel htmlFor={fieldId}>
                Reason{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </FieldLabel>
              <Input
                id={fieldId}
                value={reason}
                maxLength={200}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
          ) : (
            <Field>
              <FieldLabel htmlFor={fieldId}>{FIELD_LABELS[kind]}</FieldLabel>
              <Select
                items={options}
                value={value}
                onValueChange={(v) => setValue(v as string)}
              >
                <SelectTrigger id={fieldId} className="w-full">
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={kind === "archive" ? "destructive" : "default"}
            disabled={
              bulk.isPending ||
              (kind === "labels" && chosen.length === 0) ||
              (kind !== "labels" && kind !== "archive" && value === null)
            }
            onClick={() => void apply()}
          >
            {bulk.isPending && <Spinner data-icon="inline-start" />}
            {kind === "archive"
              ? `Archive ${plural(count)}`
              : kind === "move"
                ? `Move ${plural(count)}`
                : kind === "labels"
                  ? `Add to ${plural(count)}`
                  : `Update ${plural(count)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** The bar shown while cases are selected. */
export function BulkBar({
  selection,
  count,
  pageCount,
  matchCount,
  allMatching,
  onSelectAllMatching,
  onClear,
  canArchive,
  suites,
  labels,
}: {
  selection: Selection
  count: number
  /** Rows on this page, all selected: offers "select all matching". */
  pageCount: number
  matchCount: number
  allMatching: boolean
  onSelectAllMatching: () => void
  onClear: () => void
  canArchive: boolean
  suites: readonly Suite[]
  labels: readonly string[]
}) {
  const [open, setOpen] = useState<Kind | null>(null)
  const kinds: Kind[] = ["move", "priority", "type", "labels", "status"]
  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b bg-accent px-3 py-2"
    >
      <strong className="mr-1 text-sm font-semibold">
        {allMatching
          ? count === matchCount
            ? `All ${matchCount} matching cases selected`
            : `${count} of ${matchCount} matching cases selected`
          : `${count} selected`}
      </strong>
      {!allMatching && count === pageCount && matchCount > pageCount && (
        <Button
          variant="link"
          size="sm"
          className="h-auto px-0"
          onClick={onSelectAllMatching}
        >
          Select all {matchCount} matching
        </Button>
      )}
      <span className="basis-full sm:hidden" />
      {kinds.map((kind) => (
        <Button
          key={kind}
          variant="outline"
          size="sm"
          onClick={() => setOpen(kind)}
        >
          {TITLES[kind]}…
        </Button>
      ))}
      {canArchive && (
        <Button
          variant="outline"
          size="sm"
          className="text-destructive"
          onClick={() => setOpen("archive")}
        >
          Archive…
        </Button>
      )}
      <Button variant="ghost" size="sm" className="ml-auto" onClick={onClear}>
        Clear selection
      </Button>
      {open && (
        <BulkDialog
          kind={open}
          selection={selection}
          count={count}
          suites={suites}
          labels={labels}
          onClose={() => setOpen(null)}
          onDone={() => {
            setOpen(null)
            onClear()
          }}
        />
      )}
    </div>
  )
}
