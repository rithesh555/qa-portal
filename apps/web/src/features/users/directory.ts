import { directoryUserSchema } from "@qa/shared"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useDeferredValue } from "react"
import { z } from "zod"
import { apiGet, toSearch } from "@/lib/api"

const directoryList = z.object({ items: z.array(directoryUserSchema) })

/**
 * Active people matching `search` (name or username), at most 20. Nothing is
 * fetched until something is typed. With `project` (a key), admins are left
 * out and each person's role in that project comes back as `memberRole`.
 */
export function useDirectory(search: string, project?: string) {
  const q = useDeferredValue(search.trim())
  return useQuery({
    queryKey: ["users", "directory", q, project ?? null],
    queryFn: ({ signal }) =>
      apiGet(`/users/directory?${toSearch({ q, project })}`, directoryList, {
        signal,
      }),
    enabled: q.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}
