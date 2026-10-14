import { labelSchema, MAX_LABELS } from "@qa/shared"
import { XIcon } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Chips for labels: type and press Enter or comma to add, Backspace on an
 * empty field removes the last one. Labels used elsewhere in the project are
 * offered below. Normalised the same way as the API (lowercase, dashes).
 */
export function LabelsInput({
  id,
  value,
  onChange,
  suggestions,
  describedBy,
  onErrorChange,
}: {
  id: string
  value: string[]
  onChange: (labels: string[]) => void
  suggestions: readonly string[]
  describedBy?: string
  /** Told when typed text can't become a label, so a form can refuse to save. */
  onErrorChange?: (hasError: boolean) => void
}) {
  const [draft, setDraft] = useState("")
  const [error, setErrorState] = useState<string | null>(null)
  const setError = (message: string | null) => {
    setErrorState(message)
    onErrorChange?.(message !== null)
  }
  const full = value.length >= MAX_LABELS

  function add(raw: string) {
    const parsed = labelSchema.safeParse(raw)
    if (!raw.trim()) {
      setError(null)
      return
    }
    if (!parsed.success) {
      setError(parsed.error.issues[0]!.message)
      return
    }
    setError(null)
    setDraft("")
    if (!value.includes(parsed.data) && !full) onChange([...value, parsed.data])
  }

  const offered = suggestions.filter((s) => !value.includes(s)).slice(0, 12)
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "flex min-h-8 flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent px-1 py-1 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
          error && "border-destructive"
        )}
      >
        {value.map((label) => (
          <span
            key={label}
            className="inline-flex h-6 items-center gap-0.5 rounded-sm bg-muted pl-1.5 text-xs font-medium"
          >
            {label}
            <button
              type="button"
              aria-label={`Remove label ${label}`}
              onClick={() => onChange(value.filter((l) => l !== label))}
              className="grid size-5 place-items-center rounded-sm text-muted-foreground outline-none hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <XIcon className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          disabled={full}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [error ? errorId : null, describedBy].filter(Boolean).join(" ") ||
            undefined
          }
          placeholder={
            full
              ? `At most ${MAX_LABELS} labels`
              : value.length
                ? ""
                : "Type a label and press Enter"
          }
          onChange={(e) => {
            const next = e.target.value
            // Pasting "a, b" adds both.
            if (next.includes(",")) {
              const parts = next.split(",")
              parts.slice(0, -1).forEach(add)
              setDraft(parts.at(-1) ?? "")
              return
            }
            setDraft(next)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              add(draft)
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1))
            }
          }}
          onBlur={() => add(draft)}
          className="h-6 min-w-32 flex-1 bg-transparent px-1 outline-none placeholder:text-muted-foreground"
        />
      </div>
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
      {offered.length > 0 && !full && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Used in this project:</span>
          {offered.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => add(label)}
              className="h-6 rounded-sm border border-dashed border-input px-1.5 text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="sr-only">Add label </span>+ {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
