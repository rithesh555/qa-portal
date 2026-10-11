import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router"
import type { z } from "zod"

type Primitive = string | number | undefined

/**
 * List state (page, search, filters, sort) kept in the URL so it survives
 * reloads and can be shared. Parsed with the same shared schema the API uses;
 * invalid values fall back to their defaults one field at a time.
 */
export function useListParams<S extends z.ZodObject>(schema: S) {
  const [searchParams, setSearchParams] = useSearchParams()

  const defaults = useMemo(
    () => schema.parse({}) as Record<string, Primitive>,
    [schema]
  )

  const params = useMemo(() => {
    const raw = Object.fromEntries(searchParams)
    const valid: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(raw)) {
      if (!(key in schema.shape)) continue
      const field = schema.shape[key] as z.ZodType
      if (field.safeParse(value).success) valid[key] = value
    }
    return schema.parse(valid) as z.infer<S>
  }, [schema, searchParams])

  const update = useCallback(
    (patch: Partial<Record<keyof z.infer<S> & string, Primitive>>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          // Any change other than paging starts again from the first page.
          if (!("page" in patch)) next.delete("page")
          for (const [key, value] of Object.entries(patch)) {
            if (
              value === undefined ||
              value === "" ||
              String(value) === String(defaults[key])
            ) {
              next.delete(key)
            } else {
              next.set(key, String(value))
            }
          }
          return next
        },
        { replace: true }
      )
    },
    [defaults, setSearchParams]
  )

  return [params, update] as const
}
