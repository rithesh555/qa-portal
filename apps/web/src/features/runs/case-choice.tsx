import {
  CASE_PRIORITIES,
  CASE_PRIORITY_LABELS,
  CASE_TYPE_LABELS,
  CASE_TYPES,
  caseListQuerySchema,
  MAX_BULK,
  type RunPreview,
  type RunSelection,
  type Suite,
} from "@qa/shared"
import { ListPlusIcon } from "lucide-react"
import { useState } from "react"
import { SearchBox } from "@/components/search-box"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useCases, useLabels, useSuites } from "@/features/cases/api"
import { suitePath } from "@/features/cases/case-badges"
import { childrenOf, topLevel } from "@/features/cases/suite-tree"
import { useProjectContext } from "@/features/projects/project-layout"
import { InlineError } from "@/components/inline-error"

const ANY = "__any__"

export type Mode = "all" | "filter" | "suites"

export interface Choice {
  mode: Mode
  includeDrafts: boolean
  label?: string
  priority?: string
  type?: string
  /** Ticked suites; ticking a top-level suite ticks its sub-suites. */
  suites: Set<string>
  noSuite: boolean
  /** Single cases picked by hand, by id. */
  picked: Map<string, { key: string; title: string }>
}

const MODES = [
  {
    value: "all",
    title: "All Ready cases",
    hint: "Every active case marked Ready",
  },
  {
    value: "filter",
    title: "By label or filter",
    hint: "For example, everything labelled “regression”",
  },
  {
    value: "suites",
    title: "Choose suites",
    hint: "Tick suites, or pick single cases",
  },
] as const

/** The API selection for a choice; null while nothing is picked. */
export function toSelection(
  c: Choice,
  suites: readonly Suite[]
): RunSelection | null {
  if (c.mode === "all") return { mode: "all", includeDrafts: c.includeDrafts }
  if (c.mode === "filter")
    return {
      mode: "filter",
      includeDrafts: c.includeDrafts,
      ...(c.label ? { label: c.label } : {}),
      ...(c.priority ? { priority: c.priority as never } : {}),
      ...(c.type ? { type: c.type as never } : {}),
    }
  // A fully ticked top-level suite brings its sub-suites; otherwise send the ticked ones.
  const suiteIds: string[] = []
  for (const top of topLevel(suites)) {
    if (c.suites.has(top.id)) suiteIds.push(top.id)
    else
      for (const child of childrenOf(suites, top.id))
        if (c.suites.has(child.id)) suiteIds.push(child.id)
  }
  if (suiteIds.length === 0 && c.picked.size === 0 && !c.noSuite) return null
  return {
    mode: "suites",
    suiteIds,
    includeNoSuite: c.noSuite,
    caseIds: [...c.picked.keys()],
    includeDrafts: c.includeDrafts,
  }
}

function SuitePicker({
  suites,
  noSuiteCount,
  choice,
  onChange,
}: {
  suites: readonly Suite[]
  noSuiteCount: number
  choice: Choice
  onChange: (suites: Set<string>, noSuite: boolean) => void
}) {
  const ticked = choice.suites
  function toggle(suite: Suite) {
    const next = new Set(ticked)
    const on = !next.has(suite.id)
    const kids = childrenOf(suites, suite.id)
    for (const s of [suite, ...kids]) {
      if (on) next.add(s.id)
      else next.delete(s.id)
    }
    // A top-level suite is ticked when all of its sub-suites are.
    if (suite.parentId) {
      const siblings = childrenOf(suites, suite.parentId)
      if (siblings.every((s) => next.has(s.id))) next.add(suite.parentId)
      else next.delete(suite.parentId)
    }
    onChange(next, choice.noSuite)
  }
  const count = (n: number) => `${n} ${n === 1 ? "case" : "cases"}`

  const row = (suite: Suite, depth: number) => {
    const kids = childrenOf(suites, suite.id)
    const partial = !ticked.has(suite.id) && kids.some((k) => ticked.has(k.id))
    const total =
      suite.caseCount + kids.reduce((sum, k) => sum + k.caseCount, 0)
    return (
      <li key={suite.id}>
        <label
          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
          style={{ paddingInlineStart: `${0.5 + depth * 1.5}rem` }}
        >
          <Checkbox
            checked={ticked.has(suite.id)}
            indeterminate={partial}
            onCheckedChange={() => toggle(suite)}
          />
          <span className={depth === 0 ? "font-medium" : undefined}>
            {suite.name}
          </span>
          <span className="ms-auto text-xs text-muted-foreground tabular-nums">
            {count(total)}
          </span>
        </label>
        {kids.length > 0 && <ul>{kids.map((k) => row(k, depth + 1))}</ul>}
      </li>
    )
  }

  return (
    <ul aria-label="Suites" className="flex flex-col">
      {topLevel(suites).map((s) => row(s, 0))}
      <li>
        <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
          <Checkbox
            checked={choice.noSuite}
            onCheckedChange={(on) => onChange(ticked, on)}
          />
          <span className="font-medium">No suite</span>
          <span className="ms-auto text-xs text-muted-foreground tabular-nums">
            {count(noSuiteCount)}
          </span>
        </label>
      </li>
    </ul>
  )
}

/** Search the project's active cases and tick single ones. */
function CasePickerDialog({
  open,
  onOpenChange,
  picked,
  onChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  picked: Choice["picked"]
  onChange: (picked: Choice["picked"]) => void
}) {
  const { project } = useProjectContext()
  const [q, setQ] = useState("")
  const cases = useCases(project.key, {
    ...caseListQuerySchema.parse({ pageSize: 25 }),
    q: q || undefined,
  })
  const suites = useSuites(project.key).data?.items ?? []
  const items = cases.data?.items.filter((c) => !c.archived) ?? []
  const total = cases.data?.total ?? 0
  const full = picked.size >= MAX_BULK

  function toggle(c: { id: string; key: string; title: string }) {
    const next = new Map(picked)
    if (next.has(c.id)) next.delete(c.id)
    else if (next.size < MAX_BULK)
      next.set(c.id, { key: c.key, title: c.title })
    onChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Pick single cases</DialogTitle>
          <DialogDescription>
            Picked cases join the run on top of the ticked suites, drafts
            included.
          </DialogDescription>
        </DialogHeader>
        <SearchBox value={q} onChange={setQ} label="Search by ID or title" />
        <ul
          className="-mx-2 max-h-80 overflow-y-auto"
          aria-busy={cases.isFetching}
        >
          {items.map((c) => (
            <li key={c.id}>
              <label className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-muted">
                <Checkbox
                  className="mt-0.5"
                  disabled={full && !picked.has(c.id)}
                  checked={picked.has(c.id)}
                  onCheckedChange={() => toggle(c)}
                />
                <span className="min-w-0 flex-1">
                  <span className="me-2 font-mono text-xs text-muted-foreground">
                    {c.key}
                  </span>
                  {c.title}
                  <span className="block text-xs text-muted-foreground">
                    {c.suiteId ? suitePath(suites, c.suiteId) : "No suite"}
                    {c.status === "draft" && " · Draft"}
                  </span>
                </span>
              </label>
            </li>
          ))}
          {total > items.length && (
            <li className="px-2 py-2 text-xs text-muted-foreground">
              Showing the first {items.length} of {total}. Search to find
              others.
            </li>
          )}
          {cases.isError && (
            <li className="px-2 py-4">
              <InlineError
                what="Couldn't load the cases."
                error={cases.error}
                onRetry={() => void cases.refetch()}
              />
            </li>
          )}
          {cases.isSuccess && items.length === 0 && (
            <li className="px-2 py-6 text-center text-sm text-muted-foreground">
              No active cases match “{q}”.
            </li>
          )}
        </ul>
        <DialogFooter className="items-center sm:justify-between">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {picked.size} picked
            {full && ` (the most at once: ${MAX_BULK.toLocaleString()})`}
          </p>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const emptyChoice = (): Choice => ({
  mode: "all",
  includeDrafts: false,
  suites: new Set(),
  noSuite: false,
  picked: new Map(),
})

/** "Which test cases?": all Ready cases, a filter, or suites and single cases. */
export function CaseChoiceFields({
  choice,
  onChange,
  preview,
  legend = "Which test cases?",
}: {
  choice: Choice
  onChange: (choice: Choice) => void
  /** What the current choice takes, for the drafts note. */
  preview: RunPreview | undefined
  legend?: string
}) {
  const { project } = useProjectContext()
  const suitesQuery = useSuites(project.key)
  const labels = useLabels(project.key)
  const [picking, setPicking] = useState(false)
  const suites = suitesQuery.data?.items ?? []
  const selection = toSelection(choice, suites)
  const update = (patch: Partial<Choice>) => onChange({ ...choice, ...patch })

  const labelItems = [
    { value: ANY, label: "Any label" },
    ...(labels.data ?? []).map((l) => ({ value: l, label: l })),
  ]
  const priorityItems = [
    { value: ANY, label: "Any priority" },
    ...CASE_PRIORITIES.map((p) => ({
      value: p,
      label: CASE_PRIORITY_LABELS[p],
    })),
  ]
  const typeItems = [
    { value: ANY, label: "Any type" },
    ...CASE_TYPES.map((t) => ({ value: t, label: CASE_TYPE_LABELS[t] })),
  ]
  const filterSelect = (
    label: string,
    items: { value: string; label: string }[],
    value: string | undefined,
    onChange: (v: string | undefined) => void
  ) => (
    <Select
      items={items}
      value={value ?? ANY}
      onValueChange={(v) => onChange(v === ANY ? undefined : (v as string))}
    >
      <SelectTrigger aria-label={label} className="w-full sm:w-auto">
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
  )

  return (
    <FieldSet>
      <FieldLegend>{legend}</FieldLegend>
      <RadioGroup
        value={choice.mode}
        onValueChange={(mode) => update({ mode: mode as Mode })}
        className="grid gap-3 md:grid-cols-3"
      >
        {MODES.map((m) => (
          <FieldLabel key={m.value} htmlFor={`mode-${m.value}`}>
            <Field orientation="horizontal">
              <RadioGroupItem value={m.value} id={`mode-${m.value}`} />
              <FieldContent>
                <FieldTitle>{m.title}</FieldTitle>
                <FieldDescription>{m.hint}</FieldDescription>
              </FieldContent>
            </Field>
          </FieldLabel>
        ))}
      </RadioGroup>

      {choice.mode === "filter" && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {filterSelect("Label", labelItems, choice.label, (label) =>
            update({ label })
          )}
          {filterSelect(
            "Priority",
            priorityItems,
            choice.priority,
            (priority) => update({ priority })
          )}
          {filterSelect("Type", typeItems, choice.type, (type) =>
            update({ type })
          )}
        </div>
      )}

      {choice.mode === "suites" && (
        <div className="flex flex-col gap-3">
          {suitesQuery.isPending ? (
            <Skeleton className="h-40" />
          ) : (
            <SuitePicker
              suites={suites}
              noSuiteCount={suitesQuery.data?.noSuiteCount ?? 0}
              choice={choice}
              onChange={(s, noSuite) => update({ suites: s, noSuite })}
            />
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPicking(true)}
            >
              <ListPlusIcon data-icon="inline-start" />
              Pick single cases…
            </Button>
            {choice.picked.size > 0 && (
              <span className="text-sm text-muted-foreground">
                {choice.picked.size} picked by hand
              </span>
            )}
          </div>
          <CasePickerDialog
            open={picking}
            onOpenChange={setPicking}
            picked={choice.picked}
            onChange={(picked) => update({ picked })}
          />
        </div>
      )}

      <Field orientation="horizontal">
        <Checkbox
          id="include-drafts"
          checked={choice.includeDrafts}
          onCheckedChange={(on) => update({ includeDrafts: on })}
        />
        <FieldLabel htmlFor="include-drafts" className="font-normal">
          Include Draft cases
        </FieldLabel>
      </Field>
      {!choice.includeDrafts &&
        (preview?.draftsLeftOut ?? 0) > 0 &&
        selection && (
          <p className="rounded-lg bg-status-blocked/15 px-3 py-2 text-sm">
            {preview!.draftsLeftOut} Draft{" "}
            {preview!.draftsLeftOut === 1 ? "case is" : "cases are"} left out:
            they may not be ready to run.
          </p>
        )}
      {choice.includeDrafts && (
        <p className="rounded-lg bg-accent px-3 py-2 text-sm">
          Draft cases are included. Their steps may still change; the run keeps
          the version it copies now.
        </p>
      )}
    </FieldSet>
  )
}
