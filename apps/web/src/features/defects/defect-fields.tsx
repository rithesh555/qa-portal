import {
  DEFECT_PRIORITIES,
  DEFECT_PRIORITY_HELP,
  DEFECT_PRIORITY_LABELS,
  type Defect,
  DETECTED_IN,
  DETECTED_IN_LABELS,
  REPRODUCIBILITY,
  REPRODUCIBILITY_LABELS,
  SEVERITIES,
  SEVERITY_HELP,
  SEVERITY_LABELS,
  trackerUrlSchema,
  type UpdateDefectInput,
} from "@qa/shared"
import { CircleAlertIcon, ExternalLinkIcon } from "lucide-react"
import { type ReactNode, useEffect, useId, useRef, useState } from "react"
import { Link } from "react-router"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { projectPath } from "@/app/nav"
import { useProjectContext } from "@/features/projects/project-layout"
import { useAssignable } from "@/features/runs/run-people"
import { ApiError, errorMessage } from "@/lib/api"
import { exactTime } from "@/lib/time"
import { useDefect, useUpdateDefect } from "./api"
import { SeverityIndicator } from "./defect-badges"

const NONE = "__none__"

function Row({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <>
      <dt className="text-sm text-muted-foreground">
        {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : label}
      </dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </>
  )
}

function Choice({
  id,
  value,
  items,
  onChange,
}: {
  id: string
  value: string
  /** `hint` shows in the open list only, so the closed box stays short. */
  items: { value: string; label: string; hint?: string }[]
  onChange: (value: string) => void
}) {
  return (
    <Select
      items={items.map(({ value, label }) => ({ value, label }))}
      value={value}
      onValueChange={(v) => onChange(v as string)}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        align="end"
        alignItemWithTrigger={false}
        className="min-w-[min(18rem,calc(100vw-2rem))]"
      >
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.hint ? (
              <span className="flex flex-col">
                {item.label}
                <span className="text-xs text-muted-foreground">
                  {item.hint}
                </span>
              </span>
            ) : (
              item.label
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** A text field saved when it loses focus, if changed. */
function TextField({
  id,
  value,
  placeholder,
  type = "text",
  onSave,
}: {
  id: string
  value: string
  placeholder?: string
  type?: string
  onSave: (value: string) => void
}) {
  const [draft, setDraft] = useState(value)
  const [synced, setSynced] = useState(value)
  if (value !== synced) {
    setSynced(value)
    setDraft(value)
  }
  return (
    <Input
      id={id}
      type={type}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft.trim() !== value) onSave(draft.trim())
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur()
      }}
    />
  )
}

/** The tracker link as a link; editing checks it before saving and keeps what was typed. */
function TrackerLink({
  url,
  onSave,
}: {
  url: string
  onSave?: (v: string) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const id = useId()
  const add = useRef<HTMLButtonElement>(null)

  function finish(save: boolean) {
    if (draft === null) return
    const value = draft.trim()
    if (save && value !== url) {
      const check = trackerUrlSchema.safeParse(value)
      if (!check.success) {
        setError(check.error.issues[0]?.message ?? "Use a full link")
        return
      }
      onSave?.(value)
    }
    setDraft(null)
    setError(null)
    requestAnimationFrame(() => add.current?.focus())
  }

  if (draft !== null && onSave)
    return (
      <span className="flex flex-col gap-1">
        <Input
          id={id}
          type="url"
          autoFocus
          aria-label="Tracker link"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          placeholder="https://jira…/PAY-1203"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setError(null)
          }}
          onBlur={() => finish(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") finish(true)
            if (e.key === "Escape") finish(false)
          }}
        />
        {error && (
          <span id={`${id}-error`} className="text-xs text-destructive">
            {error}
          </span>
        )}
      </span>
    )
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-2">
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          title={url}
          className="inline-flex max-w-full min-w-0 items-center gap-1 text-primary underline-offset-4 hover:underline"
        >
          <span className="truncate">{url.replace(/^https?:\/\//, "")}</span>
          <ExternalLinkIcon aria-hidden className="size-3.5 shrink-0" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : (
        <span className="text-muted-foreground">None</span>
      )}
      {onSave && (
        <Button
          ref={add}
          size="xs"
          variant="ghost"
          onClick={() => setDraft(url)}
        >
          {url ? "Edit" : "Add"}
          <span className="sr-only"> tracker link</span>
        </Button>
      )}
    </span>
  )
}

export function DefectFields({ defect }: { defect: Defect }) {
  const { project, allowed } = useProjectContext()
  const update = useUpdateDefect(project.key, defect.key)
  const detail = useDefect(project.key, defect.key)
  const people = useAssignable(project.key) ?? []
  const [status, setStatus] = useState<{
    kind: "saving" | "saved" | "error"
    text: string
  } | null>(null)
  const canEdit = allowed("defects:edit")
  const canTriage = allowed("defects:triage")
  const ids = {
    severity: useId(),
    priority: useId(),
    assignee: useId(),
    developer: useId(),
    reproducibility: useId(),
    detected: useId(),
    environment: useId(),
  }

  // Saves run one after another, each against the version the last one
  // returned, so quick edits to two fields don't trip the conflict check.
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const version = useRef(defect.version)
  useEffect(() => {
    if (defect.version > version.current) version.current = defect.version
  }, [defect.version])

  function save(patch: Omit<UpdateDefectInput, "version">) {
    setStatus({ kind: "saving", text: "Saving…" })
    queue.current = queue.current.then(() => saveNow(patch))
  }

  async function saveNow(patch: Omit<UpdateDefectInput, "version">) {
    try {
      const saved = await update.mutateAsync({
        ...patch,
        version: version.current,
      })
      version.current = saved.version
      setStatus({ kind: "saved", text: "Saved" })
    } catch (err) {
      setStatus({
        kind: "error",
        text:
          err instanceof ApiError && err.status === 409
            ? `${err.message}`
            : `Not saved: ${errorMessage(err)}`,
      })
    }
  }

  const assigneeItems = [
    { value: NONE, label: "Unassigned" },
    ...people.map((p) => ({ value: p.userId, label: p.name })),
    // A deactivated or former member stays visible on old defects.
    ...(defect.assignee && !people.some((p) => p.userId === defect.assignee!.id)
      ? [{ value: defect.assignee.id, label: defect.assignee.name }]
      : []),
  ]
  const found = [
    defect.foundInRelease ? `Release ${defect.foundInRelease.name}` : null,
  ].filter(Boolean)

  return (
    <aside
      aria-labelledby="defect-fields"
      className="flex flex-col gap-4 rounded-xl border bg-card p-5"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="defect-fields" className="text-base font-semibold">
          Fields
        </h2>
        <span role="status" className="text-xs text-muted-foreground">
          {status && status.kind !== "error" ? status.text : ""}
        </span>
      </div>
      {status?.kind === "error" && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>
            <p>{status.text}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => {
                setStatus(null)
                void detail.refetch()
              }}
            >
              Reload
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <dl className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3">
        <Row label="Severity" htmlFor={canEdit ? ids.severity : undefined}>
          {canEdit ? (
            <Choice
              id={ids.severity}
              value={defect.severity}
              items={SEVERITIES.map((s) => ({
                value: s,
                label: SEVERITY_LABELS[s],
                hint: SEVERITY_HELP[s],
              }))}
              onChange={(v) => void save({ severity: v as Defect["severity"] })}
            />
          ) : (
            <SeverityIndicator severity={defect.severity} />
          )}
        </Row>
        <Row label="Priority" htmlFor={canTriage ? ids.priority : undefined}>
          {canTriage ? (
            <Choice
              id={ids.priority}
              value={defect.priority ?? NONE}
              items={[
                { value: NONE, label: "Not set yet" },
                ...DEFECT_PRIORITIES.map((p) => ({
                  value: p,
                  label: DEFECT_PRIORITY_LABELS[p],
                  hint: DEFECT_PRIORITY_HELP[p],
                })),
              ]}
              onChange={(v) =>
                void save({
                  priority: v === NONE ? null : (v as Defect["priority"]),
                })
              }
            />
          ) : (
            <span>
              {defect.priority
                ? DEFECT_PRIORITY_LABELS[defect.priority]
                : "Not set yet"}
              {canEdit && (
                <span className="text-xs text-muted-foreground">
                  , set by a QA Lead
                </span>
              )}
            </span>
          )}
        </Row>
        <Row label="Assignee (QA)" htmlFor={canEdit ? ids.assignee : undefined}>
          {canEdit ? (
            <Choice
              id={ids.assignee}
              value={defect.assignee?.id ?? NONE}
              items={assigneeItems}
              onChange={(v) => void save({ assigneeId: v === NONE ? null : v })}
            />
          ) : (
            (defect.assignee?.name ?? (
              <span className="text-muted-foreground">Unassigned</span>
            ))
          )}
        </Row>
        <Row label="Developer" htmlFor={canEdit ? ids.developer : undefined}>
          {canEdit ? (
            <TextField
              id={ids.developer}
              value={defect.developer}
              placeholder="As in your tracker"
              onSave={(developer) => void save({ developer })}
            />
          ) : (
            defect.developer || (
              <span className="text-muted-foreground">Not set</span>
            )
          )}
        </Row>
        <Row label="Tracker link">
          <TrackerLink
            url={defect.trackerUrl}
            onSave={
              canEdit ? (trackerUrl) => void save({ trackerUrl }) : undefined
            }
          />
        </Row>
        <Row
          label="Reproducible"
          htmlFor={canEdit ? ids.reproducibility : undefined}
        >
          {canEdit ? (
            <Choice
              id={ids.reproducibility}
              value={defect.reproducibility}
              items={REPRODUCIBILITY.map((r) => ({
                value: r,
                label: REPRODUCIBILITY_LABELS[r],
              }))}
              onChange={(v) =>
                void save({ reproducibility: v as Defect["reproducibility"] })
              }
            />
          ) : (
            REPRODUCIBILITY_LABELS[defect.reproducibility]
          )}
        </Row>
        <Row label="Detected in" htmlFor={canEdit ? ids.detected : undefined}>
          {canEdit ? (
            <Choice
              id={ids.detected}
              value={defect.detectedIn}
              items={DETECTED_IN.map((d) => ({
                value: d,
                label: DETECTED_IN_LABELS[d],
              }))}
              onChange={(v) =>
                void save({ detectedIn: v as Defect["detectedIn"] })
              }
            />
          ) : (
            DETECTED_IN_LABELS[defect.detectedIn]
          )}
        </Row>
        <Row
          label="Environment"
          htmlFor={canEdit ? ids.environment : undefined}
        >
          {canEdit ? (
            <TextField
              id={ids.environment}
              value={defect.environment}
              placeholder="e.g. Safari 18 build 4.2"
              onSave={(environment) => void save({ environment })}
            />
          ) : (
            defect.environment || (
              <span className="text-muted-foreground">Not set</span>
            )
          )}
        </Row>
        <Row label="Found in">
          {found.join(", ") || (
            <span className="text-muted-foreground">No release</span>
          )}
          {defect.foundInRun && (
            <>
              {", "}
              <Link
                to={projectPath(project.key, `runs/${defect.foundInRun.key}`)}
                className="text-primary underline-offset-4 hover:underline"
              >
                {defect.foundInRun.key}
              </Link>
            </>
          )}
        </Row>
        {defect.case && (
          <Row label="Test case">
            <Link
              to={projectPath(project.key, `cases/${defect.case.key}`)}
              className="text-primary underline-offset-4 hover:underline"
            >
              {defect.case.key}
            </Link>
          </Row>
        )}
        <Row
          label={
            defect.fixedAt &&
            (defect.status === "reopened" || defect.status === "in_progress")
              ? "Previously fixed in"
              : "Fixed in"
          }
        >
          {defect.fixedAt ? (
            [defect.fixedInRelease?.name, defect.fixedInBuild]
              .filter(Boolean)
              .join(", ") || "Not given"
          ) : (
            <span className="text-muted-foreground">Set when marked fixed</span>
          )}
        </Row>
        <Row label="Reported by">{defect.reporter.name}</Row>
        <Row label="Logged">{exactTime.format(new Date(defect.createdAt))}</Row>
        {defect.reopenCount > 0 && (
          <Row label="Reopened">{defect.reopenCount}×</Row>
        )}
      </dl>
    </aside>
  )
}
