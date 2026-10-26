import {
  type Announcements,
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { MAX_STEPS } from "@qa/shared"
import { EllipsisIcon, GripVerticalIcon, PlusIcon } from "lucide-react"
import { useState } from "react"
import {
  type Control,
  Controller,
  type FieldErrors,
  useFieldArray,
  useFormContext,
} from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export interface StepValue {
  action: string
  expected: string
}

export interface StepsFormValues {
  steps: StepValue[]
}

/** Focus a step's action field once React has rendered it. */
function focusAction(index: number) {
  requestAnimationFrame(() =>
    document.getElementById(`step-${index}-action`)?.focus()
  )
}

function StepRow({
  id,
  index,
  count,
  control,
  errors,
  onInsertBelow,
  onDuplicate,
  onMove,
  onRemove,
}: {
  id: string
  index: number
  count: number
  control: Control<StepsFormValues>
  errors: FieldErrors<StepsFormValues>["steps"]
  onInsertBelow: () => void
  onDuplicate: () => void
  onMove: (to: number) => void
  onRemove: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })
  const n = index + 1
  const actionError = errors?.[index]?.action?.message
  const errorId = `step-${index}-action-error`

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "grid grid-cols-[1.75rem_1.5rem_minmax(0,1fr)_2rem] items-start gap-2 rounded-lg border bg-card p-3 md:grid-cols-[1.75rem_1.5rem_minmax(0,1fr)_minmax(0,1fr)_2rem]",
        isDragging && "relative z-10 shadow-lg ring-2 ring-ring"
      )}
    >
      <Button
        ref={setActivatorNodeRef}
        type="button"
        variant="ghost"
        size="icon-sm"
        className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        aria-label={`Reorder step ${n}`}
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon />
      </Button>
      <span className="grid h-8 place-items-center text-sm font-semibold text-muted-foreground tabular-nums">
        {n}
      </span>
      <div className="flex flex-col gap-1">
        <label htmlFor={`step-${index}-action`} className="sr-only">
          Step {n} action
        </label>
        <Controller
          name={`steps.${index}.action`}
          control={control}
          render={({ field }) => (
            <Textarea
              {...field}
              id={`step-${index}-action`}
              rows={2}
              placeholder="What the tester does"
              aria-invalid={actionError ? true : undefined}
              aria-describedby={actionError ? errorId : undefined}
            />
          )}
        />
        {actionError && (
          <p id={errorId} className="text-sm text-destructive">
            {actionError}
          </p>
        )}
      </div>
      <div className="col-start-3 md:col-start-auto">
        <label htmlFor={`step-${index}-expected`} className="sr-only">
          Step {n} expected result
        </label>
        <Controller
          name={`steps.${index}.expected`}
          control={control}
          render={({ field }) => (
            <Textarea
              {...field}
              id={`step-${index}-expected`}
              rows={2}
              placeholder="What should happen (optional)"
            />
          )}
        />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Step ${n} actions`}
              className="col-start-4 row-start-1 md:col-start-5"
            />
          }
        >
          <EllipsisIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem
            onClick={onInsertBelow}
            disabled={count >= MAX_STEPS}
          >
            Insert step below
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate} disabled={count >= MAX_STEPS}>
            Duplicate step
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onMove(index - 1)}
            disabled={index === 0}
          >
            Move up
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onMove(index + 1)}
            disabled={index === count - 1}
          >
            Move down
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={onRemove}
            disabled={count === 1}
          >
            Remove step
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}

/**
 * The ordered steps of a test case. Reorder by dragging a step's handle,
 * with the keyboard (focus the handle, Space, arrows, Space), or from its
 * menu; every move is announced to screen readers.
 */
export function StepsEditor() {
  const {
    control,
    getValues,
    formState: { errors },
  } = useFormContext<StepsFormValues>()
  const { fields, append, insert, move, remove } = useFieldArray({
    control,
    name: "steps",
  })
  const [announcement, setAnnouncement] = useState("")
  // The last removed step, offered back inline (a toast would cover the save bar).
  const [removed, setRemoved] = useState<{
    index: number
    step: StepValue
  } | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  const position = (id: string | number) =>
    fields.findIndex((f) => f.id === id) + 1

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up step ${position(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `Step ${position(active.id)} is over position ${position(over.id)}.`
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `Step ${position(active.id)} moved to position ${position(over.id)}.`
        : `Step ${position(active.id)} dropped.`,
    onDragCancel: ({ active }) =>
      `Reordering cancelled. Step ${position(active.id)} stayed where it was.`,
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    move(position(active.id) - 1, position(over.id) - 1)
  }

  function moveTo(from: number, to: number) {
    move(from, to)
    setAnnouncement(`Step ${from + 1} moved to position ${to + 1}.`)
    requestAnimationFrame(() =>
      document.getElementById(`step-${to}-action`)?.focus()
    )
  }

  function removeAt(index: number) {
    const step = getValues(`steps.${index}`)
    remove(index)
    setRemoved({ index, step })
    setAnnouncement(`Step ${index + 1} removed.`)
    // Keep focus in the list: the step that took its place, or the one above.
    focusAction(Math.min(index, fields.length - 2))
  }

  function undoRemove() {
    if (!removed) return
    insert(removed.index, removed.step)
    setAnnouncement(`Step ${removed.index + 1} restored.`)
    focusAction(removed.index)
    setRemoved(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        aria-hidden
        className="hidden grid-cols-[1.75rem_1.5rem_minmax(0,1fr)_minmax(0,1fr)_2rem] gap-2 px-3 text-xs font-semibold text-muted-foreground md:grid"
      >
        <span />
        <span />
        <span>Action</span>
        <span>Expected result</span>
        <span />
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              "To reorder this step, press Space. Use the up and down arrow keys to move it, then Space to drop it or Escape to cancel.",
          },
        }}
      >
        <SortableContext
          items={fields.map((f) => f.id)}
          strategy={verticalListSortingStrategy}
        >
          <ol className="flex flex-col gap-2">
            {fields.map((field, index) => (
              <StepRow
                key={field.id}
                id={field.id}
                index={index}
                count={fields.length}
                control={control}
                errors={errors.steps}
                onInsertBelow={() => {
                  insert(index + 1, { action: "", expected: "" })
                  focusAction(index + 1)
                }}
                onDuplicate={() => {
                  insert(index + 1, {
                    ...getValues(`steps.${index}`),
                  })
                  setAnnouncement(
                    `Step ${index + 1} duplicated as step ${index + 2}.`
                  )
                  focusAction(index + 1)
                }}
                onMove={(to) => moveTo(index, to)}
                onRemove={() => removeAt(index)}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {removed && (
        <p className="flex flex-wrap items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
          Step {removed.index + 1} removed.
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto px-0"
            onClick={undoRemove}
          >
            Undo
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto h-auto"
            onClick={() => setRemoved(null)}
          >
            Dismiss
          </Button>
        </p>
      )}
      <div>
        <Button
          type="button"
          variant="outline"
          disabled={fields.length >= MAX_STEPS}
          onClick={() => {
            append({ action: "", expected: "" })
            focusAction(fields.length)
          }}
        >
          <PlusIcon data-icon="inline-start" />
          Add step
        </Button>
      </div>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}
