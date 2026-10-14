import type { CaseFilter } from "@qa/shared"
import { CheckIcon } from "lucide-react"
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
import { Field, FieldLegend, FieldSet } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useProjectContext } from "@/features/projects/project-layout"
import { errorMessage } from "@/lib/api"
import { fetchExport } from "./api"
import { SELECTED_TOGGLE } from "./case-badges"
import { downloadCases, type ExportFormat } from "./spreadsheet"

export function ExportDialog({
  open,
  onOpenChange,
  filter,
  count,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  filter: Partial<CaseFilter>
  count: number
}) {
  const { project } = useProjectContext()
  const [format, setFormat] = useState<ExportFormat>("xlsx")
  const [busy, setBusy] = useState(false)

  async function download() {
    setBusy(true)
    try {
      const { items } = await fetchExport(project.key, filter)
      const day = new Date().toISOString().slice(0, 10)
      await downloadCases(items, format, `${project.key}-test-cases-${day}`)
      toast.add({
        title: `Exported ${items.length} test ${items.length === 1 ? "case" : "cases"}`,
      })
      onOpenChange(false)
    } catch (err) {
      toast.add({
        type: "error",
        title: "Couldn't export",
        description: errorMessage(err),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export test cases</DialogTitle>
          <DialogDescription>
            Exports the {count} {count === 1 ? "case" : "cases"} that match your
            current suite, search and filters — every page, not just this one.
          </DialogDescription>
        </DialogHeader>
        <FieldSet>
          <FieldLegend variant="label">Format</FieldLegend>
          <Field>
            <ToggleGroup
              value={[format]}
              onValueChange={(value) =>
                value[0] && setFormat(value[0] as ExportFormat)
              }
              variant="outline"
              aria-label="Format"
            >
              <ToggleGroupItem value="xlsx" className={SELECTED_TOGGLE}>
                {format === "xlsx" && <CheckIcon data-icon="inline-start" />}
                Excel (.xlsx)
              </ToggleGroupItem>
              <ToggleGroupItem value="csv" className={SELECTED_TOGGLE}>
                {format === "csv" && <CheckIcon data-icon="inline-start" />}
                CSV (.csv)
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>
        </FieldSet>
        <p className="rounded-lg bg-muted px-3 py-2 text-sm">
          The file uses the import template&apos;s columns plus an ID column.{" "}
          <span className="font-semibold">Importing it creates new cases</span>{" "}
          — it doesn&apos;t update the existing ones.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={busy || count === 0}
            onClick={() => void download()}
          >
            {busy && <Spinner data-icon="inline-start" />}
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
