import { createContext, useContext } from "react"

/** The id a Field gives its FieldError, so the field's control can point at it. */
export const FieldErrorIdContext = createContext<string | null>(null)

/**
 * aria-describedby for a control inside a Field: its own description plus,
 * while it's invalid, the field's error message (so the error is read again
 * whenever the control is focused).
 */
export function useFieldDescribedBy(
  invalid: unknown,
  describedBy: string | undefined
): string | undefined {
  const errorId = useContext(FieldErrorIdContext)
  const isInvalid = invalid === true || invalid === "true"
  if (!errorId || !isInvalid) return describedBy
  return describedBy ? `${describedBy} ${errorId}` : errorId
}
