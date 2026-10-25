import { useEffect } from "react"

/**
 * A page that knows better than its URL what it shows (a not-found page)
 * names the tab itself. It runs after the app shell's own title, which is set
 * in a layout effect, and the shell sets it again when the address changes.
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · QA Portal`
  }, [title])
}
