import {
  CASE_PRIORITIES,
  CASE_PRIORITY_LABELS,
  CASE_STATUS_LABELS,
  CASE_STATUSES,
  CASE_TYPE_LABELS,
  CASE_TYPES,
  type ImportBatch,
  type ImportCheck,
  IMPORT_FIELD_LABELS,
  IMPORT_FIELDS,
  type ImportField,
  type ImportResult,
  MAX_IMPORT_ROWS,
  type UnknownValue,
  type ValueChoice,
  type ValueMap,
  valueMapKey,
} from "@qa/shared"
import {
  CheckIcon,
  CircleAlertIcon,
  FileSpreadsheetIcon,
  UploadIcon,
} from "lucide-react"
import { type DragEvent, useEffect, useId, useRef, useState } from "react"
import { Link } from "react-router"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { useProjectContext } from "@/features/projects/project-layout"
import { errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  checkImport,
  useArchiveImport,
  useImports,
  useRestoreImport,
  useRunImport,
  useSuites,
} from "./api"
import {
  buildRows,
  type ColumnMapping,
  defaultValueChoice,
  errorRowsCsv,
  guessMapping,
  uniqueHeaders,
  unknownValues,
} from "./import-mapping"
import {
  downloadCases,
  readSpreadsheet,
  type SheetTable,
  SpreadsheetError,
} from "./spreadsheet"
import { suiteOptions } from "./suite-tree"

type Step = "upload" | "map" | "check" | "done"

const STEPS: { id: Step; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "map", label: "Match columns" },
  { id: "check", label: "Check rows" },
  { id: "done", label: "Done" },
]

const importDate = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
})

const SKIP = "__skip__"
const NONE = "none"

const plural = (n: number, one: string, many: string) =>
  `${n.toLocaleString()} ${n === 1 ? one : many}`

function Stepper({ step }: { step: Step }) {
  const at = STEPS.findIndex((s) => s.id === step)
  return (
    <ol
      aria-label="Import steps"
      className="flex flex-wrap items-center gap-x-6 gap-y-2"
    >
      {STEPS.map((s, i) => (
        <li
          key={s.id}
          aria-current={i === at ? "step" : undefined}
          className={cn(
            "flex items-center gap-2 text-sm font-medium",
            i === at ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <span
            className={cn(
              "grid size-6 place-items-center rounded-full border text-xs font-semibold",
              i === at && "border-primary bg-primary text-primary-foreground",
              i < at && "border-primary text-primary"
            )}
          >
            {i < at ? (
              <CheckIcon className="size-3.5" aria-label="Done:" />
            ) : (
              i + 1
            )}
          </span>
          {s.label}
        </li>
      ))}
    </ol>
  )
}

function choiceOptions(
  unknown: UnknownValue
): { value: string; label: string }[] {
  if (unknown.field === "priority") {
    return CASE_PRIORITIES.map((v) => ({
      value: v,
      label: CASE_PRIORITY_LABELS[v],
    }))
  }
  if (unknown.field === "status") {
    return CASE_STATUSES.map((v) => ({
      value: v,
      label: CASE_STATUS_LABELS[v],
    }))
  }
  const asLabel = defaultValueChoice(unknown).addLabel
  return CASE_TYPES.flatMap((v) => [
    ...(asLabel
      ? [
          {
            value: `${v}+label`,
            label: `${CASE_TYPE_LABELS[v]}, plus label “${asLabel}”`,
          },
        ]
      : []),
    { value: v, label: CASE_TYPE_LABELS[v] },
  ])
}

const choiceKey = (c: ValueChoice) =>
  c.addLabel ? `${c.value}+label` : c.value

function RecentImports() {
  const { project, allowed } = useProjectContext()
  const imports = useImports(project.key)
  const archive = useArchiveImport(project.key)
  const restore = useRestoreImport(project.key)
  const [confirming, setConfirming] = useState<ImportBatch | null>(null)
  const [restoring, setRestoring] = useState<ImportBatch | null>(null)
  const items = imports.data ?? []
  if (items.length === 0) return null

  async function confirm() {
    if (!confirming) return
    try {
      const { archivedCases } = await archive.mutateAsync(confirming.number)
      toast.add({
        title: `Import #${confirming.number} archived`,
        description: `${plural(archivedCases, "test case", "test cases")} archived.`,
      })
      setConfirming(null)
    } catch (err) {
      toast.add({
        type: "error",
        title: "Couldn't archive the import",
        description: errorMessage(err),
      })
    }
  }

  async function confirmRestore() {
    if (!restoring) return
    try {
      const { restoredCases } = await restore.mutateAsync(restoring.number)
      toast.add({
        title: `Import #${restoring.number} restored`,
        description: `${plural(restoredCases, "test case", "test cases")} restored.`,
      })
      setRestoring(null)
    } catch (err) {
      toast.add({
        type: "error",
        title: "Couldn't restore the import",
        description: errorMessage(err),
      })
    }
  }

  return (
    <section aria-labelledby="recent-imports" className="flex flex-col gap-2">
      <h2 id="recent-imports" className="text-base font-semibold">
        Recent imports
      </h2>
      <ul className="divide-y rounded-xl border bg-card">
        {items.slice(0, 5).map((batch) => (
          <li
            key={batch.number}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm"
          >
            <span className="font-medium">Import #{batch.number}</span>
            <span className="min-w-0 truncate text-muted-foreground">
              {batch.fileName} · {plural(batch.caseCount, "case", "cases")} ·{" "}
              {batch.createdBy.name} ·{" "}
              <time dateTime={batch.createdAt}>
                {importDate.format(new Date(batch.createdAt))}
              </time>
            </span>
            {batch.archived ? (
              <span className="ml-auto flex items-center gap-2">
                <Badge variant="secondary">Archived</Badge>
                {allowed("cases:archive") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRestoring(batch)}
                  >
                    Restore this import…
                  </Button>
                )}
              </span>
            ) : (
              allowed("cases:archive") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-destructive"
                  onClick={() => setConfirming(batch)}
                >
                  Archive this import…
                </Button>
              )
            )}
          </li>
        ))}
      </ul>
      <ArchiveImportDialog
        batch={confirming}
        busy={archive.isPending}
        onCancel={() => setConfirming(null)}
        onConfirm={() => void confirm()}
      />
      <RestoreImportDialog
        number={restoring?.number ?? null}
        busy={restore.isPending}
        onCancel={() => setRestoring(null)}
        onConfirm={() => void confirmRestore()}
      />
    </section>
  )
}

function RestoreImportDialog({
  number,
  busy,
  onCancel,
  onConfirm,
}: {
  number: number | null
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog
      open={number !== null}
      onOpenChange={(open) => !open && onCancel()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restore import #{number}?</AlertDialogTitle>
          <AlertDialogDescription>
            The test cases archived when this import was archived become active
            again, with their suites. Cases that were archived separately, for
            another reason, stay archived.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={onConfirm}>
            {busy && <Spinner data-icon="inline-start" />}
            Restore import
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function ArchiveImportDialog({
  batch,
  busy,
  onCancel,
  onConfirm,
}: {
  batch: { number: number; caseCount: number } | null
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog
      open={batch !== null}
      onOpenChange={(open) => !open && onCancel()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Archive every case from import #{batch?.number}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Its {plural(batch?.caseCount ?? 0, "test case", "test cases")} that
            are still active are archived. Suites the import created are
            archived too if that leaves them empty. Cases already in a test run
            keep their results there.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy && <Spinner data-icon="inline-start" />}
            Archive import
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function ImportPage() {
  const { project, allowed } = useProjectContext()
  const suites = useSuites(project.key)
  const run = useRunImport(project.key)
  const archive = useArchiveImport(project.key)
  const restoreImport = useRestoreImport(project.key)
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>("upload")
  const [reading, setReading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState("")
  const [sheets, setSheets] = useState<SheetTable[]>([])
  const [sheetIndex, setSheetIndex] = useState(0)
  // Kept across "upload fixed file", matched by header text.
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [choices, setChoices] = useState<ValueMap>({})
  const [defaultSuite, setDefaultSuite] = useState<string>(NONE)
  const [check, setCheck] = useState<ImportCheck | null>(null)
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState<string | null>(null)
  const [onlyProblems, setOnlyProblems] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [undoing, setUndoing] = useState(false)
  const [undone, setUndone] = useState(false)
  const stepHeading = useRef<HTMLHeadingElement>(null)
  const shownStep = useRef(step)

  // Moving between steps replaces the page content; take focus to the new step.
  useEffect(() => {
    if (shownStep.current === step) return
    shownStep.current = step
    stepHeading.current?.focus()
  }, [step])

  const listPath = `/projects/${project.key}/cases`
  const sheet = sheets[sheetIndex]
  // Unique names: two columns called "Title" are mapped separately.
  const headers = uniqueHeaders(sheet?.rows[0]?.cells ?? [])
  const rows = sheet ? buildRows(sheet, mapping, choices) : []
  const unknown = unknownValues(sheet ? buildRows(sheet, mapping, {}) : [])
  const used = Object.values(mapping).filter(Boolean) as ImportField[]
  const dupes = new Set(used.filter((f, i) => used.indexOf(f) !== i))
  const noTitle = !used.includes("title")

  async function takeFile(file: File | undefined) {
    if (!file) return
    setUploadError(null)
    setReading(true)
    try {
      const read = await readSpreadsheet(file)
      const dataRows = read[0]!.rows.length - 1
      if (dataRows > MAX_IMPORT_ROWS) {
        throw new SpreadsheetError(
          "size",
          `That file has ${dataRows.toLocaleString()} test cases. The limit is ${MAX_IMPORT_ROWS.toLocaleString()} per import — split it into smaller files.`
        )
      }
      setFileName(file.name)
      setSheets(read)
      setSheetIndex(0)
      // Keep earlier choices for columns that are still there; guess the rest.
      const guessed = guessMapping(read[0]!.rows[0]!.cells)
      setMapping((prev) => {
        const next: ColumnMapping = {}
        for (const header of Object.keys(guessed)) {
          next[header] = header in prev ? prev[header]! : guessed[header]!
        }
        return next
      })
      setCheck(null)
      setStep("map")
    } catch (err) {
      setUploadError(
        err instanceof SpreadsheetError
          ? err.message
          : "We couldn't read that file."
      )
    } finally {
      setReading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  function choose(u: UnknownValue) {
    return choices[valueMapKey(u.field, u.value)] ?? defaultValueChoice(u)
  }

  /** Every unknown value gets a choice (the default unless the user picked one). */
  function fullChoices(): ValueMap {
    const all: ValueMap = { ...choices }
    for (const u of unknown) all[valueMapKey(u.field, u.value)] = choose(u)
    return all
  }

  function request() {
    return {
      fileName,
      defaultSuiteId: defaultSuite === NONE ? null : defaultSuite,
      rows: sheet ? buildRows(sheet, mapping, fullChoices()) : [],
    }
  }

  async function runCheck() {
    setChecking(true)
    setCheckError(null)
    setImportError(null)
    try {
      setCheck(await checkImport(project.key, request()))
      setStep("check")
    } catch (err) {
      setCheckError(errorMessage(err))
    } finally {
      setChecking(false)
    }
  }

  async function doImport() {
    setImportError(null)
    try {
      setResult(await run.mutateAsync(request()))
      setStep("done")
    } catch (err) {
      setImportError(errorMessage(err))
    }
  }

  function restart() {
    setStep("upload")
    setSheets([])
    setCheck(null)
    setResult(null)
    setUndone(false)
  }

  function downloadErrors() {
    if (!sheet || !check) return
    const blob = new Blob([errorRowsCsv(sheet, check.problems)], {
      type: "text/csv;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${fileName.replace(/\.[^.]+$/, "")}-rows-with-errors.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    void takeFile(event.dataTransfer.files[0])
  }

  if (!allowed("cases:edit")) {
    return (
      <Alert>
        <CircleAlertIcon />
        <AlertTitle>You can&apos;t import test cases here</AlertTitle>
        <AlertDescription>
          Only QA Leads and Testers can import.{" "}
          <Link to={listPath} className="underline">
            Back to test cases
          </Link>
        </AlertDescription>
      </Alert>
    )
  }

  const warnings =
    check?.problems.filter((p) => p.severity === "warning").length ?? 0
  const problemsByRow = new Map<number, ImportCheck["problems"]>()
  for (const p of check?.problems ?? [])
    problemsByRow.set(p.row, [...(problemsByRow.get(p.row) ?? []), p])
  const previewRows = (check?.preview ?? []).filter(
    (r) =>
      !onlyProblems ||
      problemsByRow.get(r.row)?.some((p) => p.severity !== "note")
  )
  const suiteItems = suiteOptions(suites.data?.items ?? [])

  return (
    <div className="flex max-w-6xl flex-col gap-5">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link to={listPath} />}>
              Test cases
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Import</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className="text-2xl font-semibold tracking-tight">
        Import test cases
      </h1>
      <Stepper step={step} />
      <h2 ref={stepHeading} tabIndex={-1} className="sr-only">
        Step {STEPS.findIndex((s) => s.id === step) + 1} of {STEPS.length}:{" "}
        {STEPS.find((s) => s.id === step)!.label}
      </h2>

      {step === "upload" && (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <section
              aria-label="Upload a file"
              className="flex flex-col gap-4 rounded-xl border bg-card p-5"
            >
              {uploadError && (
                <Alert variant="destructive">
                  <CircleAlertIcon />
                  <AlertTitle>Couldn&apos;t use that file</AlertTitle>
                  <AlertDescription>{uploadError}</AlertDescription>
                </Alert>
              )}
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-5 py-10 text-center",
                  dragging ? "border-primary bg-accent" : "border-input"
                )}
              >
                {reading ? (
                  <div
                    role="status"
                    className="flex flex-col items-center gap-2"
                  >
                    <Spinner />
                    <p className="font-medium">Reading the file…</p>
                    <p className="text-sm text-muted-foreground">
                      Nothing is saved yet.
                    </p>
                  </div>
                ) : (
                  <>
                    <FileSpreadsheetIcon
                      aria-hidden
                      className="size-9 text-muted-foreground"
                    />
                    <p className="text-base font-semibold">
                      Drop a CSV or Excel file here
                    </p>
                    <p className="text-sm text-muted-foreground">
                      .csv or .xlsx · up to 5 MB and{" "}
                      {MAX_IMPORT_ROWS.toLocaleString()} test cases
                    </p>
                    <input
                      ref={inputRef}
                      id={inputId}
                      type="file"
                      accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      // Fully hidden: the Choose file button opens it, so it
                      // mustn't be a second focusable "Choose File" control.
                      hidden
                      onChange={(e) => void takeFile(e.target.files?.[0])}
                    />
                    <Button onClick={() => inputRef.current?.click()}>
                      <UploadIcon data-icon="inline-start" />
                      Choose file
                    </Button>
                  </>
                )}
              </div>
              <Field className="max-w-sm">
                <FieldLabel htmlFor="default-suite">
                  Rows without a suite go to
                </FieldLabel>
                <Select
                  items={suiteItems}
                  value={defaultSuite}
                  onValueChange={(v) => setDefaultSuite(v as string)}
                >
                  <SelectTrigger id="default-suite" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {suiteItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </section>
            <section
              aria-labelledby="file-help"
              className="flex flex-col gap-2.5 rounded-xl border bg-card p-5 text-sm"
            >
              <h2 id="file-help" className="text-base font-semibold">
                How the file should look
              </h2>
              <p>
                One row per test case. Only <strong>Title</strong> is required.
              </p>
              <p className="text-muted-foreground">
                Columns:{" "}
                {IMPORT_FIELDS.map((f) => IMPORT_FIELD_LABELS[f]).join(", ")}.
              </p>
              <p>
                Number each step in the <strong>Steps</strong> cell (1., 2. …)
                and give its expected result the same number in{" "}
                <strong>Expected results</strong>. A step can span several
                lines; its expected result can be left out.
              </p>
              <p>
                Name a sub-suite as{" "}
                <code className="rounded bg-muted px-1">
                  Checkout › Refunds
                </code>{" "}
                or{" "}
                <code className="rounded bg-muted px-1">
                  Checkout / Refunds
                </code>{" "}
                — one level deep. Missing suites are created; names that differ
                only in capitals or spaces count as the same suite.
              </p>
              <p>
                Separate labels with commas. An <strong>ID</strong> column is
                ignored: <strong>every row becomes a new case</strong>.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void downloadCases([], "xlsx", "test-case-template")
                  }
                >
                  Download template (.xlsx)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void downloadCases([], "csv", "test-case-template")
                  }
                >
                  Template (.csv)
                </Button>
              </div>
            </section>
          </div>
          <RecentImports />
        </>
      )}

      {step === "map" && sheet && (
        <section
          aria-label="Match columns"
          className="flex flex-col rounded-xl border bg-card"
        >
          <div className="flex flex-wrap items-center gap-3 border-b px-5 py-4">
            <p className="min-w-60 flex-1">
              <span className="font-semibold">{fileName}</span>
              <span className="text-muted-foreground">
                {" "}
                · {plural(rows.length, "row", "rows")} ·{" "}
                {plural(headers.length, "column", "columns")}
              </span>
            </p>
            {sheets.length > 1 && (
              <Field orientation="horizontal" className="w-auto">
                <FieldLabel htmlFor="import-sheet">Sheet</FieldLabel>
                <Select
                  items={sheets.map((s, i) => ({
                    value: String(i),
                    label: s.name,
                  }))}
                  value={String(sheetIndex)}
                  onValueChange={(v) => {
                    const i = Number(v)
                    setSheetIndex(i)
                    setMapping(guessMapping(sheets[i]!.rows[0]!.cells))
                  }}
                >
                  <SelectTrigger id="import-sheet" className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sheets.map((s, i) => (
                      <SelectItem key={s.name} value={String(i)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep("upload")}
            >
              Choose another file
            </Button>
          </div>

          <div className="flex flex-col gap-1 px-5 pt-4">
            <h2 className="text-base font-semibold">Columns</h2>
            <p className="text-sm text-muted-foreground">
              We matched your columns by name. Check each one.
            </p>
          </div>
          <div className="overflow-x-auto px-2 pt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Column in your file</TableHead>
                  <TableHead>
                    Example from row {sheet.rows[1]?.number ?? 2}
                  </TableHead>
                  <TableHead>Imports as</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {headers.map((header, i) => {
                  const field = mapping[header] ?? null
                  const items = [
                    { value: SKIP, label: "— Don't import —" },
                    ...IMPORT_FIELDS.map((f) => ({
                      value: f,
                      label:
                        f === "title"
                          ? "Title (required)"
                          : IMPORT_FIELD_LABELS[f],
                    })),
                  ]
                  const note = !field
                    ? /^(id|key|case id)$/i.test(header.trim())
                      ? "IDs are ignored — every row becomes a new case."
                      : "Not imported."
                    : null
                  return (
                    <TableRow key={`${header}-${i}`}>
                      <TableCell className="align-top font-medium">
                        {header || <em>(no header)</em>}
                      </TableCell>
                      <TableCell className="max-w-80 align-top whitespace-pre-line text-muted-foreground">
                        {sheet.rows[1]?.cells[i] ?? ""}
                      </TableCell>
                      <TableCell className="align-top">
                        <Select
                          items={items}
                          value={field ?? SKIP}
                          onValueChange={(v) =>
                            setMapping((prev) => ({
                              ...prev,
                              [header]: v === SKIP ? null : (v as ImportField),
                            }))
                          }
                        >
                          <SelectTrigger
                            aria-label={`${header} imports as`}
                            className="w-52"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {items.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {field && dupes.has(field) && (
                          <p className="mt-1 text-xs text-destructive">
                            Another column already imports as this.
                          </p>
                        )}
                        {note && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {note}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          {noTitle && (
            <p role="alert" className="px-5 pt-2 text-sm text-destructive">
              Choose which column holds the Title.
            </p>
          )}

          {unknown.length > 0 && (
            <>
              <div className="mt-4 flex flex-col gap-1 border-t px-5 pt-4">
                <h2 className="text-base font-semibold">Values to match</h2>
                <p className="text-sm text-muted-foreground">
                  Some values in your file aren&apos;t ones the portal uses.
                  Choose what each should become.
                </p>
              </div>
              <div className="overflow-x-auto px-2 pt-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Column</TableHead>
                      <TableHead>Value in your file</TableHead>
                      <TableHead className="text-right">Rows</TableHead>
                      <TableHead>Becomes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unknown.map((u) => {
                      const items = choiceOptions(u)
                      const current = choose(u)
                      return (
                        <TableRow key={valueMapKey(u.field, u.value)}>
                          <TableCell>{IMPORT_FIELD_LABELS[u.field]}</TableCell>
                          <TableCell>
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                              {u.value}
                            </code>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {u.count}
                          </TableCell>
                          <TableCell>
                            <Select
                              items={items}
                              value={choiceKey(current)}
                              onValueChange={(v) => {
                                const raw = v as string
                                const choice: ValueChoice = raw.endsWith(
                                  "+label"
                                )
                                  ? {
                                      value: raw.replace("+label", ""),
                                      addLabel: defaultValueChoice(u).addLabel,
                                    }
                                  : { value: raw }
                                setChoices((prev) => ({
                                  ...prev,
                                  [valueMapKey(u.field, u.value)]: choice,
                                }))
                              }}
                            >
                              <SelectTrigger
                                aria-label={`${IMPORT_FIELD_LABELS[u.field]} “${u.value}” becomes`}
                                className="w-64"
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {items.map((item) => (
                                  <SelectItem
                                    key={item.value}
                                    value={item.value}
                                  >
                                    {item.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {checkError && (
            <Alert variant="destructive" className="mx-5 mt-4 w-auto">
              <CircleAlertIcon />
              <AlertTitle>Couldn&apos;t check the rows</AlertTitle>
              <AlertDescription>{checkError}</AlertDescription>
            </Alert>
          )}
          <div className="mt-4 flex flex-wrap justify-end gap-2 border-t px-5 py-4">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to={listPath} />}
            >
              Cancel
            </Button>
            <Button
              disabled={noTitle || dupes.size > 0 || checking}
              onClick={() => void runCheck()}
            >
              {checking && <Spinner data-icon="inline-start" />}
              Check rows
            </Button>
          </div>
        </section>
      )}

      {step === "check" && check && (
        <section
          aria-label="Check rows"
          className="flex flex-col rounded-xl border bg-card"
        >
          <div className="flex flex-wrap items-center gap-2 border-b px-5 py-4">
            <Badge variant="secondary">
              {plural(check.total - check.errorRows, "row ready", "rows ready")}
            </Badge>
            {check.errorRows > 0 && (
              <Badge variant="destructive">
                {plural(check.errorRows, "row with errors", "rows with errors")}
              </Badge>
            )}
            {warnings > 0 && (
              <Badge variant="outline">
                {plural(warnings, "warning", "warnings")}
              </Badge>
            )}
            {check.newSuites.length > 0 && (
              <Badge variant="outline" className="max-w-full truncate">
                {plural(check.newSuites.length, "new suite", "new suites")}:{" "}
                {check.newSuites.join(", ")}
              </Badge>
            )}
            <label className="ml-auto flex items-center gap-2 text-sm">
              <Checkbox
                checked={onlyProblems}
                onCheckedChange={(v) => setOnlyProblems(Boolean(v))}
              />
              Only rows with problems
            </label>
          </div>

          {check.errorRows > 0 && (
            <Alert variant="destructive" className="mx-5 mt-4 w-auto">
              <CircleAlertIcon />
              <AlertTitle>
                Fix {plural(check.errorRows, "row", "rows")} before importing
              </AlertTitle>
              <AlertDescription className="flex flex-col gap-2">
                Nothing is imported until every row is valid. Correct them in
                your file and upload it again — your column and value choices
                are kept.
                <span className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={downloadErrors}>
                    Download rows with errors (.csv)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep("upload")}
                  >
                    Upload fixed file
                  </Button>
                </span>
              </AlertDescription>
            </Alert>
          )}
          {importError && (
            <Alert variant="destructive" className="mx-5 mt-4 w-auto">
              <CircleAlertIcon />
              <AlertTitle>
                The import didn&apos;t go through, and nothing was saved
              </AlertTitle>
              <AlertDescription>{importError}</AlertDescription>
            </Alert>
          )}

          <div className="overflow-x-auto px-2 pt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead className="min-w-72">Problem</TableHead>
                  <TableHead className="min-w-56">Title</TableHead>
                  <TableHead>Suite</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Steps</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((r) => {
                  const problems = problemsByRow.get(r.row) ?? []
                  const worst = problems.find((p) => p.severity === "error")
                    ? "error"
                    : problems.find((p) => p.severity === "warning")
                      ? "warning"
                      : null
                  return (
                    <TableRow
                      key={r.row}
                      className={cn(
                        worst === "error" &&
                          "shadow-[inset_3px_0_0_var(--color-destructive)]",
                        worst === "warning" &&
                          "shadow-[inset_3px_0_0_var(--color-amber-500)]"
                      )}
                    >
                      <TableCell className="align-top font-mono text-xs text-muted-foreground">
                        {r.row}
                      </TableCell>
                      <TableCell className="align-top whitespace-normal">
                        <ul className="flex flex-col gap-0.5 text-sm">
                          {problems.map((p, i) => (
                            <li
                              key={i}
                              className={cn(
                                p.severity === "error" && "text-destructive",
                                p.severity === "warning" &&
                                  "text-amber-700 dark:text-amber-400",
                                p.severity === "note" && "text-muted-foreground"
                              )}
                            >
                              <span className="font-semibold">
                                {p.severity === "error"
                                  ? "Error"
                                  : p.severity === "warning"
                                    ? "Warning"
                                    : "Note"}
                              </span>{" "}
                              {p.message}
                            </li>
                          ))}
                        </ul>
                      </TableCell>
                      <TableCell className="align-top whitespace-normal">
                        {r.title || "—"}
                      </TableCell>
                      <TableCell className="align-top">
                        {r.suite || "No suite"}
                      </TableCell>
                      <TableCell className="align-top">
                        {r.priority || "Medium"}
                      </TableCell>
                      <TableCell className="text-right align-top tabular-nums">
                        {r.stepCount}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <p className="px-5 py-2 text-sm text-muted-foreground">
            {onlyProblems
              ? "Showing rows with errors or warnings."
              : "Showing the first rows and every row with a problem. Row numbers match your spreadsheet."}
          </p>
          {run.isPending && (
            <div
              role="status"
              className="mx-5 flex items-center gap-3 rounded-lg bg-accent px-4 py-3 text-sm"
            >
              <Spinner />
              <span>
                <span className="font-semibold">
                  Importing {plural(check.total, "test case", "test cases")}…
                </span>{" "}
                Keep this page open. It&apos;s all or nothing: if anything
                fails, no cases are added.
              </span>
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center justify-end gap-2 border-t px-5 py-4">
            <Button
              variant="outline"
              className="mr-auto"
              disabled={run.isPending}
              onClick={() => setStep("map")}
            >
              Back to matching
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to={listPath} />}
            >
              Cancel
            </Button>
            <Button
              disabled={check.errorRows > 0 || run.isPending}
              onClick={() => void doImport()}
            >
              {run.isPending && <Spinner data-icon="inline-start" />}
              Import {plural(check.total, "test case", "test cases")}
            </Button>
          </div>
        </section>
      )}

      {step === "done" && result && (
        <section className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-10 text-center">
          {undone ? (
            <>
              <h2 role="status" className="text-xl font-semibold">
                Import #{result.importNumber} archived
              </h2>
              <p className="text-muted-foreground">
                Its cases are archived. You can restore them all, here or later
                from the import page.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  variant="outline"
                  disabled={restoreImport.isPending}
                  onClick={() =>
                    void restoreImport
                      .mutateAsync(result.importNumber)
                      .then(({ restoredCases }) => {
                        setUndone(false)
                        toast.add({
                          title: `Import #${result.importNumber} restored`,
                          description: `${plural(restoredCases, "test case", "test cases")} restored.`,
                        })
                      })
                      .catch((err: unknown) =>
                        toast.add({
                          type: "error",
                          title: "Couldn't restore the import",
                          description: errorMessage(err),
                        })
                      )
                  }
                >
                  {restoreImport.isPending && (
                    <Spinner data-icon="inline-start" />
                  )}
                  Restore import
                </Button>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link to={listPath} />}
                >
                  Back to test cases
                </Button>
                <Button onClick={restart}>Import another file</Button>
              </div>
            </>
          ) : (
            <>
              <span
                aria-hidden
                className="grid size-12 place-items-center rounded-full bg-accent text-primary"
              >
                <CheckIcon className="size-6" />
              </span>
              <h2 role="status" className="text-xl font-semibold">
                {plural(result.created, "test case", "test cases")} imported
              </h2>
              <p className="text-muted-foreground">
                IDs{" "}
                <span className="font-mono text-foreground">
                  {result.firstKey}
                </span>{" "}
                to{" "}
                <span className="font-mono text-foreground">
                  {result.lastKey}
                </span>
                . Rows without a status start as Draft.
              </p>
              {result.newSuites.length > 0 && (
                <p className="text-muted-foreground">
                  New suites: {result.newSuites.join(", ")}.
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Recorded as import #{result.importNumber} in the project
                activity.
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                <Button nativeButton={false} render={<Link to={listPath} />}>
                  View imported cases
                </Button>
                <Button variant="outline" onClick={restart}>
                  Import another file
                </Button>
              </div>
              {allowed("cases:archive") && (
                <div className="mt-4 flex max-w-xl flex-col items-center gap-2 border-t pt-4">
                  <p className="text-sm text-muted-foreground">
                    Imported the wrong file? You can archive everything from
                    this import at once — now or later from the import page.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setUndoing(true)}
                  >
                    Archive this import…
                  </Button>
                </div>
              )}
              <ArchiveImportDialog
                batch={
                  undoing
                    ? { number: result.importNumber, caseCount: result.created }
                    : null
                }
                busy={archive.isPending}
                onCancel={() => setUndoing(false)}
                onConfirm={() =>
                  void archive
                    .mutateAsync(result.importNumber)
                    .then(() => {
                      setUndoing(false)
                      setUndone(true)
                    })
                    .catch((err: unknown) =>
                      toast.add({
                        type: "error",
                        title: "Couldn't archive the import",
                        description: errorMessage(err),
                      })
                    )
                }
              />
            </>
          )}
        </section>
      )}
    </div>
  )
}
