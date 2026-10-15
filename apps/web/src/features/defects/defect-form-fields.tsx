import {
  DETECTED_IN,
  DETECTED_IN_LABELS,
  type DetectedIn,
  REPRODUCIBILITY,
  REPRODUCIBILITY_LABELS,
  type Reproducibility,
  SEVERITIES,
  SEVERITY_HELP,
  SEVERITY_LABELS,
  type Severity,
} from "@qa/shared"
import { useId } from "react"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useProjectContext } from "@/features/projects/project-layout"
import { useAssignable } from "@/features/runs/run-people"

const NONE = "__none__"

export interface DefectDraft {
  title: string
  severity: Severity | null
  reproducibility: Reproducibility
  detectedIn: DetectedIn
  description: string
  steps: string
  expected: string
  actual: string
  environment: string
  assigneeId: string | null
}

export const emptyDraft = (over: Partial<DefectDraft> = {}): DefectDraft => ({
  title: "",
  severity: null,
  reproducibility: "always",
  detectedIn: "qa",
  description: "",
  steps: "",
  expected: "",
  actual: "",
  environment: "",
  assigneeId: null,
  ...over,
})

export type DraftErrors = Partial<
  Record<"title" | "severity" | "steps" | "actual", string>
>

/** The required fields; severity has no default, so the tester chooses one. */
export function draftErrors(d: DefectDraft): DraftErrors {
  const e: DraftErrors = {}
  if (!d.title.trim()) e.title = "Give the defect a title"
  if (!d.severity) e.severity = "Choose a severity"
  if (!d.steps.trim())
    e.steps = "Add the steps, so someone else can see it happen"
  if (!d.actual.trim()) e.actual = "Say what actually happens"
  return e
}

function Pick<T extends string>({
  id,
  value,
  items,
  onChange,
  invalid,
  describedBy,
}: {
  id: string
  value: T | null
  items: { value: string; label: string }[]
  onChange: (v: T) => void
  invalid?: boolean
  describedBy?: string
}) {
  return (
    <Select
      items={items}
      value={value ?? NONE}
      onValueChange={(v) => onChange(v as T)}
    >
      <SelectTrigger
        id={id}
        className="w-full"
        aria-invalid={invalid}
        aria-describedby={describedBy}
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
  )
}

export function DefectFormFields({
  draft,
  onChange,
  errors,
  /** Shown under steps when they were copied from a case. */
  stepsNote,
  environmentNote,
  foundIn,
  autoFocusTitle = false,
}: {
  draft: DefectDraft
  onChange: (draft: DefectDraft) => void
  errors: DraftErrors
  stepsNote?: string
  environmentNote?: string
  /** Read-only "found in" line, when it comes from the run. */
  foundIn?: string
  autoFocusTitle?: boolean
}) {
  const { project } = useProjectContext()
  const people = useAssignable(project.key) ?? []
  const id = useId()
  const set = (patch: Partial<DefectDraft>) => onChange({ ...draft, ...patch })
  const f = (name: string) => `${id}-${name}`

  return (
    <div className="flex flex-col gap-4">
      <Field data-invalid={Boolean(errors.title)}>
        <FieldLabel htmlFor={f("title")}>Title</FieldLabel>
        <Input
          id={f("title")}
          maxLength={200}
          autoFocus={autoFocusTitle}
          placeholder="What goes wrong, in one line"
          value={draft.title}
          aria-invalid={Boolean(errors.title)}
          onChange={(e) => set({ title: e.target.value })}
        />
        {errors.title && <FieldError errors={[{ message: errors.title }]} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field data-invalid={Boolean(errors.severity)}>
          <FieldLabel htmlFor={f("severity")}>Severity</FieldLabel>
          <Pick<Severity>
            id={f("severity")}
            value={draft.severity}
            invalid={Boolean(errors.severity)}
            describedBy={f("severity-help")}
            items={[
              { value: NONE, label: "Choose…" },
              ...SEVERITIES.map((s) => ({
                value: s,
                label: SEVERITY_LABELS[s],
              })),
            ]}
            onChange={(v) =>
              set({ severity: (v as string) === NONE ? null : v })
            }
          />
          {errors.severity && (
            <FieldError errors={[{ message: errors.severity }]} />
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor={f("repro")}>Reproducible</FieldLabel>
          <Pick<Reproducibility>
            id={f("repro")}
            value={draft.reproducibility}
            items={REPRODUCIBILITY.map((r) => ({
              value: r,
              label: REPRODUCIBILITY_LABELS[r],
            }))}
            onChange={(v) => set({ reproducibility: v })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={f("detected")}>Detected in</FieldLabel>
          <Pick<DetectedIn>
            id={f("detected")}
            value={draft.detectedIn}
            items={DETECTED_IN.map((d) => ({
              value: d,
              label: DETECTED_IN_LABELS[d],
            }))}
            onChange={(v) => set({ detectedIn: v })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={f("assignee")}>Assignee (QA)</FieldLabel>
          <Pick<string>
            id={f("assignee")}
            value={draft.assigneeId ?? NONE}
            items={[
              { value: NONE, label: "Unassigned" },
              ...people.map((p) => ({ value: p.userId, label: p.name })),
            ]}
            onChange={(v) => set({ assigneeId: v === NONE ? null : v })}
          />
        </Field>
      </div>
      <p
        id={f("severity-help")}
        className="-mt-2 text-xs text-muted-foreground"
      >
        {SEVERITIES.map(
          (s) => `${SEVERITY_LABELS[s]}: ${SEVERITY_HELP[s].toLowerCase()}`
        ).join(" · ")}
        . A QA Lead sets the priority at triage.
      </p>
      <Field>
        <FieldLabel htmlFor={f("description")}>
          What happens{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </FieldLabel>
        <Textarea
          id={f("description")}
          rows={3}
          value={draft.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </Field>
      <Field data-invalid={Boolean(errors.steps)}>
        <FieldLabel htmlFor={f("steps")}>Steps to reproduce</FieldLabel>
        <Textarea
          id={f("steps")}
          rows={4}
          value={draft.steps}
          aria-invalid={Boolean(errors.steps)}
          onChange={(e) => set({ steps: e.target.value })}
        />
        {stepsNote && <FieldDescription>{stepsNote}</FieldDescription>}
        {errors.steps && <FieldError errors={[{ message: errors.steps }]} />}
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={f("expected")}>
            Expected{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </FieldLabel>
          <Textarea
            id={f("expected")}
            rows={3}
            value={draft.expected}
            onChange={(e) => set({ expected: e.target.value })}
          />
        </Field>
        <Field data-invalid={Boolean(errors.actual)}>
          <FieldLabel htmlFor={f("actual")}>Actual</FieldLabel>
          <Textarea
            id={f("actual")}
            rows={3}
            value={draft.actual}
            aria-invalid={Boolean(errors.actual)}
            onChange={(e) => set({ actual: e.target.value })}
          />
          {errors.actual && (
            <FieldError errors={[{ message: errors.actual }]} />
          )}
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor={f("env")}>
          Environment / build{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </FieldLabel>
        <Input
          id={f("env")}
          maxLength={200}
          placeholder="e.g. Safari 18 · build 4.2.0-rc1"
          value={draft.environment}
          onChange={(e) => set({ environment: e.target.value })}
        />
        {environmentNote && (
          <FieldDescription>{environmentNote}</FieldDescription>
        )}
      </Field>
      {foundIn && <p className="text-sm text-muted-foreground">{foundIn}</p>}
    </div>
  )
}
