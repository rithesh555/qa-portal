import {
  type Member,
  memberListQuerySchema,
  PROJECT_ROLE_LABELS,
} from "@qa/shared"
import { ChevronDownIcon, XIcon } from "lucide-react"
import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useMembers } from "@/features/projects/api"

const ALL_MEMBERS = memberListQuerySchema.parse({ pageSize: 100 })

/** Active QA Leads and Testers: the people a case can be assigned to. */
export function useAssignable(key: string): Member[] | undefined {
  const members = useMembers(key, ALL_MEMBERS)
  return members.data?.items.filter((m) => m.active && m.role !== "viewer")
}

/** Pick several people; shows them as removable chips. */
export function AssigneePicker({
  people,
  value,
  onChange,
  labelledBy,
}: {
  people: Member[]
  value: string[]
  onChange: (ids: string[]) => void
  labelledBy: string
}) {
  const [search, setSearch] = useState("")
  const searchId = useId()
  const chosen = value
    .map((id) => people.find((p) => p.userId === id))
    .filter((p): p is Member => Boolean(p))
  const term = search.trim().toLocaleLowerCase()
  const shown = term
    ? people.filter(
        (p) =>
          p.name.toLocaleLowerCase().includes(term) ||
          p.username.toLocaleLowerCase().includes(term)
      )
    : people

  function toggle(id: string) {
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id]
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chosen.map((p) => (
        <span
          key={p.userId}
          className="inline-flex h-7 items-center gap-1 rounded-full bg-accent ps-3 pe-1 text-sm"
        >
          {p.name}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="rounded-full"
            aria-label={`Remove ${p.name}`}
            onClick={() => toggle(p.userId)}
          >
            <XIcon />
          </Button>
        </span>
      ))}
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-labelledby={labelledBy}
            />
          }
        >
          {chosen.length ? "Change" : "Choose people"}
          <ChevronDownIcon data-icon="inline-end" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 gap-2 p-2">
          <Input
            aria-label="Search people"
            id={searchId}
            placeholder="Search people"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ul className="max-h-64 overflow-y-auto">
            {shown.map((p) => (
              <li key={p.userId}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                  <Checkbox
                    checked={value.includes(p.userId)}
                    onCheckedChange={() => toggle(p.userId)}
                  />
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {PROJECT_ROLE_LABELS[p.role]}
                  </span>
                </label>
              </li>
            ))}
            {shown.length === 0 && (
              <li className="px-2 py-3 text-sm text-muted-foreground">
                No one matches “{search.trim()}”.
              </li>
            )}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  )
}
