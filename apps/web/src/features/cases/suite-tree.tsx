import { zodResolver } from "@hookform/resolvers/zod"
import {
  type Suite,
  type UpdateSuiteInput,
  updateSuiteSchema,
} from "@qa/shared"
import {
  ChevronRightIcon,
  CircleAlertIcon,
  EllipsisIcon,
  FolderIcon,
  ListIcon,
  PlusIcon,
} from "lucide-react"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import type { z } from "zod"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
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
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { useProjectContext } from "@/features/projects/project-layout"
import { ApiError, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useArchiveSuite, useCreateSuite, useUpdateSuite } from "./api"

const TOP = "__top__"

export function topLevel(suites: readonly Suite[]) {
  return suites.filter((s) => !s.parentId)
}

export function childrenOf(suites: readonly Suite[], id: string) {
  return suites.filter((s) => s.parentId === id)
}

/** Cases in a suite including its sub-suites. */
export function totalCount(suites: readonly Suite[], suite: Suite) {
  return childrenOf(suites, suite.id).reduce(
    (sum, child) => sum + child.caseCount,
    suite.caseCount
  )
}

/** Options for a suite picker: "No suite", then each top-level suite followed by its sub-suites. */
export function suiteOptions(suites: readonly Suite[]) {
  return [
    { value: "none", label: "No suite" },
    ...topLevel(suites).flatMap((top) => [
      { value: top.id, label: top.name },
      ...childrenOf(suites, top.id).map((child) => ({
        value: child.id,
        label: `${top.name} › ${child.name}`,
      })),
    ]),
  ]
}

type FormValues = z.input<typeof updateSuiteSchema>

/** Create a suite (no `suite`) or rename/move one. */
function SuiteForm({
  suites,
  suite,
  parentId,
  onDone,
}: {
  suites: readonly Suite[]
  suite: Suite | null
  parentId: string | null
  onDone: (created?: Suite) => void
}) {
  const { project } = useProjectContext()
  const create = useCreateSuite(project.key)
  const update = useUpdateSuite(project.key)
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<FormValues, unknown, UpdateSuiteInput>({
    resolver: zodResolver(updateSuiteSchema),
    defaultValues: {
      name: suite?.name ?? "",
      parentId: suite ? suite.parentId : parentId,
      version: suite?.version ?? 1,
    },
  })
  // A suite with sub-suites stays top-level (one level of nesting).
  const hasChildren = suite ? childrenOf(suites, suite.id).length > 0 : false
  const parents = [
    { value: TOP, label: "Top level" },
    ...topLevel(suites)
      .filter((s) => s.id !== suite?.id)
      .map((s) => ({ value: s.id, label: s.name })),
  ]

  async function onSubmit(values: UpdateSuiteInput) {
    setFormError(null)
    try {
      if (suite) {
        await update.mutateAsync({ id: suite.id, ...values })
        toast.add({ title: `Suite ${values.name} saved` })
        onDone()
      } else {
        const created = await create.mutateAsync({
          name: values.name,
          parentId: values.parentId ?? null,
        })
        toast.add({ title: `Suite ${created.name} created` })
        onDone(created)
      }
    } catch (err) {
      // A taken name belongs on the Name field.
      if (err instanceof ApiError && err.status === 409) {
        form.setError("name", { message: err.message }, { shouldFocus: true })
        return
      }
      setFormError(errorMessage(err))
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <DialogHeader>
        <DialogTitle>
          {suite ? `Edit suite ${suite.name}` : "New suite"}
        </DialogTitle>
        <DialogDescription>
          Suites group test cases. They can have one level of sub-suites.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup className="py-4">
        {formError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="suite-name">Name</FieldLabel>
              <Input
                {...field}
                id="suite-name"
                autoComplete="off"
                autoFocus
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="parentId"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="suite-parent">Inside</FieldLabel>
              <Select
                items={parents}
                value={field.value ?? TOP}
                onValueChange={(value) =>
                  field.onChange(value === TOP ? null : value)
                }
                disabled={hasChildren}
              >
                <SelectTrigger id="suite-parent" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {parents.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasChildren && (
                <FieldDescription>
                  It has sub-suites, so it stays at the top level.
                </FieldDescription>
              )}
            </Field>
          )}
        />
      </FieldGroup>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner data-icon="inline-start" />}
          {suite ? "Save suite" : "Create suite"}
        </Button>
      </DialogFooter>
    </form>
  )
}

type Editing =
  | { kind: "create"; parentId: string | null }
  | { kind: "edit"; suite: Suite }
  | null

interface RowProps {
  suite: Suite
  depth: 0 | 1
  suites: readonly Suite[]
  selected: string
  collapsed: ReadonlySet<string>
  canEdit: boolean
  canArchive: boolean
  onSelect: (suite: string) => void
  onToggle: (id: string, open: boolean) => void
  onEdit: (editing: Editing) => void
  onArchive: (suite: Suite) => void
}

function SuiteRow(props: RowProps) {
  const {
    suite,
    depth,
    suites,
    selected,
    collapsed,
    canEdit,
    canArchive,
    onSelect,
    onToggle,
    onEdit,
    onArchive,
  } = props
  const kids = depth === 0 ? childrenOf(suites, suite.id) : []
  const open = !collapsed.has(suite.id)
  const current = selected === suite.id
  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-0.5 rounded-md hover:bg-muted",
          current && "bg-accent hover:bg-accent"
        )}
      >
        {depth === 0 &&
          (kids.length > 0 ? (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`${open ? "Collapse" : "Expand"} ${suite.name}`}
              aria-expanded={open}
              onClick={() => onToggle(suite.id, open)}
            >
              <ChevronRightIcon
                className={cn("transition-transform", open && "rotate-90")}
              />
            </Button>
          ) : (
            <span className="size-6 shrink-0" />
          ))}
        <button
          type="button"
          aria-current={current ? "true" : undefined}
          onClick={() => onSelect(suite.id)}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 rounded-md py-1.5 pr-1 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
            depth === 1 && "pl-7",
            current && "font-semibold text-accent-foreground"
          )}
        >
          {depth === 0 && (
            <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate">{suite.name}</span>
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {depth === 0 ? totalCount(suites, suite) : suite.caseCount}
          </span>
        </button>
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Actions for ${suite.name}`}
                  // Hidden until hover only where hovering exists; always shown on touch.
                  className="[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100 [@media(hover:hover)]:data-popup-open:opacity-100"
                />
              }
            >
              <EllipsisIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuItem onClick={() => onEdit({ kind: "edit", suite })}>
                Rename or move…
              </DropdownMenuItem>
              {depth === 0 && (
                <DropdownMenuItem
                  onClick={() => onEdit({ kind: "create", parentId: suite.id })}
                >
                  Add sub-suite…
                </DropdownMenuItem>
              )}
              {canArchive && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onArchive(suite)}
                  >
                    Archive suite…
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {kids.length > 0 && open && (
        <ul>
          {kids.map((child) => (
            <SuiteRow key={child.id} {...props} suite={child} depth={1} />
          ))}
        </ul>
      )}
    </li>
  )
}

export function SuiteTree({
  suites,
  noSuiteCount,
  selected,
  onSelect,
  canEdit,
  canArchive,
}: {
  suites: readonly Suite[]
  noSuiteCount: number
  selected: string
  onSelect: (suite: string) => void
  canEdit: boolean
  canArchive: boolean
}) {
  const { project } = useProjectContext()
  const archive = useArchiveSuite(project.key)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<Editing>(null)
  const [archiving, setArchiving] = useState<Suite | null>(null)
  const total = noSuiteCount + suites.reduce((sum, s) => sum + s.caseCount, 0)

  async function confirmArchive() {
    if (!archiving) return
    try {
      const { archivedCases } = await archive.mutateAsync(archiving.id)
      toast.add({
        title: `Suite ${archiving.name} archived`,
        description: `${archivedCases} test ${archivedCases === 1 ? "case" : "cases"} archived with it.`,
      })
      if (
        selected === archiving.id ||
        childrenOf(suites, archiving.id).some((c) => c.id === selected)
      ) {
        onSelect("all")
      }
      setArchiving(null)
    } catch (err) {
      toast.add({
        type: "error",
        title: "Couldn't archive the suite",
        description: errorMessage(err),
      })
    }
  }

  const archivingCount = archiving ? totalCount(suites, archiving) : 0

  return (
    <nav aria-labelledby="suites-heading" className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-1 pb-1">
        <h2
          id="suites-heading"
          className="text-xs font-semibold text-muted-foreground"
        >
          Suites
        </h2>
        {canEdit && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setEditing({ kind: "create", parentId: null })}
          >
            <PlusIcon data-icon="inline-start" />
            New suite
          </Button>
        )}
      </div>
      <ul className="flex flex-col gap-0.5">
        <li>
          <button
            type="button"
            aria-current={selected === "all" ? "true" : undefined}
            onClick={() => onSelect("all")}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
              selected === "all" &&
                "bg-accent font-semibold text-accent-foreground hover:bg-accent"
            )}
          >
            <ListIcon className="size-4 text-muted-foreground" />
            All cases
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {total}
            </span>
          </button>
        </li>
        {topLevel(suites).map((suite) => (
          <SuiteRow
            key={suite.id}
            suite={suite}
            depth={0}
            suites={suites}
            selected={selected}
            collapsed={collapsed}
            canEdit={canEdit}
            canArchive={canArchive}
            onSelect={onSelect}
            onToggle={(id, open) =>
              setCollapsed((prev) => {
                const next = new Set(prev)
                if (open) next.add(id)
                else next.delete(id)
                return next
              })
            }
            onEdit={setEditing}
            onArchive={setArchiving}
          />
        ))}
        <li>
          <button
            type="button"
            aria-current={selected === "none" ? "true" : undefined}
            onClick={() => onSelect("none")}
            className={cn(
              "flex w-full items-center gap-2 rounded-md py-1.5 pr-1 pl-7.5 text-left text-sm text-muted-foreground italic outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
              selected === "none" &&
                "bg-accent font-semibold text-accent-foreground hover:bg-accent"
            )}
          >
            No suite
            <span className="ml-auto text-xs not-italic tabular-nums">
              {noSuiteCount}
            </span>
          </button>
        </li>
      </ul>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="sm:max-w-md">
          {editing && (
            <SuiteForm
              suites={suites}
              suite={editing.kind === "edit" ? editing.suite : null}
              parentId={editing.kind === "create" ? editing.parentId : null}
              onDone={(created) => {
                setEditing(null)
                if (created) onSelect(created.id)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={archiving !== null}
        onOpenChange={(open) => !open && setArchiving(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Archive suite {archiving?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {archivingCount === 0
                ? "It has no active test cases. "
                : `Its ${archivingCount} test ${archivingCount === 1 ? "case is" : "cases are"} archived with it. They're read-only and left out of new test runs. Past runs keep their copy. `}
              Restoring one of its cases brings the suite back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={archive.isPending}
              onClick={() => void confirmArchive()}
            >
              {archive.isPending && <Spinner data-icon="inline-start" />}
              {archivingCount === 0
                ? "Archive suite"
                : `Archive suite and ${archivingCount} ${archivingCount === 1 ? "case" : "cases"}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  )
}
