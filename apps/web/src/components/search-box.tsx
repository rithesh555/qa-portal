import { SearchIcon } from "lucide-react"
import { useEffect, useEffectEvent, useState } from "react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"

/**
 * A search field for list pages: reports the trimmed term 300 ms after typing
 * stops. `value` is the term in the URL; outside changes (back button,
 * cleared filters) replace the text, but our own update coming back trimmed
 * doesn't, so a trailing space being typed isn't lost.
 */
export function SearchBox({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (value: string) => void
  label: string
}) {
  const [draft, setDraft] = useState(value)
  const [synced, setSynced] = useState(value)
  if (value !== synced) {
    setSynced(value)
    if (draft.trim() !== value) setDraft(value)
  }
  const pending = draft.trim() !== value
  const commit = useEffectEvent(() => onChange(draft))
  useEffect(() => {
    if (!pending) return
    const timer = setTimeout(commit, 300)
    return () => clearTimeout(timer)
  }, [draft, pending])

  return (
    <InputGroup className="sm:max-w-xs">
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        placeholder={label}
        aria-label={label}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
    </InputGroup>
  )
}
