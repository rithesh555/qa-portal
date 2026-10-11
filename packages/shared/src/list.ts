import { z } from "zod"

export const DEFAULT_PAGE_SIZE = 25
export const MAX_PAGE_SIZE = 100

/**
 * Query string for every paginated list endpoint. `sortable` whitelists the
 * fields a client may sort by; the first one is the default.
 */
export function listQuerySchema<const T extends readonly [string, ...string[]]>(
  sortable: T
) {
  return z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_PAGE_SIZE)
      .default(DEFAULT_PAGE_SIZE),
    q: z
      .string()
      .trim()
      .max(100)
      .optional()
      .transform((value) => value || undefined),
    sort: z.enum(sortable).default(sortable[0]),
    order: z.enum(["asc", "desc"]).default("asc"),
  })
}

/** Response of every paginated list endpoint. */
export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
  })
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
