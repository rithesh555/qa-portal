import type { DirectoryUser } from "@qa/shared"
import { ChevronsUpDownIcon, XIcon } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useDirectory } from "./directory"

/** Pick one active person by searching name or username. */
export function PersonPicker({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string
  value: DirectoryUser | null
  onChange: (person: DirectoryUser | null) => void
  invalid?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const results = useDirectory(search)

  if (value) {
    return (
      <div className="flex h-9 items-center gap-2 rounded-lg border px-2">
        <span className="flex-1 truncate text-sm">
          {value.name}{" "}
          <span className="text-muted-foreground">@{value.username}</span>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove ${value.name}`}
          onClick={() => onChange(null)}
        >
          <XIcon />
        </Button>
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-invalid={invalid}
            className="w-full justify-between font-normal text-muted-foreground"
          />
        }
      >
        Search people
        <ChevronsUpDownIcon />
      </PopoverTrigger>
      <PopoverContent className="w-(--anchor-width) min-w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Name or username…"
            aria-label="Search people"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {search.trim()
                ? "No active person matches."
                : "Type a name or username."}
            </CommandEmpty>
            {search.trim() &&
              results.data?.items.map((person) => (
                <CommandItem
                  key={person.id}
                  value={person.id}
                  onSelect={() => {
                    onChange(person)
                    setOpen(false)
                    setSearch("")
                  }}
                >
                  <span className="flex flex-col">
                    <span className="font-medium">{person.name}</span>
                    <span className="text-xs text-muted-foreground">
                      @{person.username}
                    </span>
                  </span>
                </CommandItem>
              ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
