import { idOf } from "../catalogue/types.ts"
import type { Portal } from "./portal.ts"

/** Catalogue id → portal case key, for the active cases of the E2E project. */
export async function portalCaseIds(
  portal: Portal,
  key: string
): Promise<Map<string, string>> {
  const ids = new Map<string, string>()
  for (let page = 1; ; page++) {
    const res = await portal.call<{
      items: { key: string; title: string }[]
      total: number
    }>("GET", `/projects/${key}/cases?page=${page}&pageSize=100`)
    for (const c of res.items) {
      const id = idOf(c.title)
      if (id) ids.set(id, c.key)
    }
    if (page * 100 >= res.total) return ids
  }
}
