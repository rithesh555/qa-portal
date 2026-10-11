import {
  type DirectoryUser,
  PROJECT_ROLE_LABELS,
  PROJECT_ROLES,
  type ProjectRole,
} from "@qa/shared"
import { CircleAlertIcon, SearchIcon, XIcon } from "lucide-react"
import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { useDirectory } from "@/features/users/directory"
import { errorMessage } from "@/lib/api"
import { useAddMembers } from "./api"
import { useProjectContext } from "./project-layout"

const ROLE_ITEMS = PROJECT_ROLES.map((value) => ({
  value,
  label: PROJECT_ROLE_LABELS[value],
}))

function AddMembersForm({ onDone }: { onDone: () => void }) {
  const { project } = useProjectContext()
  const add = useAddMembers(project.key)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Map<string, DirectoryUser>>(
    new Map()
  )
  const [role, setRole] = useState<ProjectRole>("tester")
  const [formError, setFormError] = useState<string | null>(null)

  // One search: the same results say who's already on the project.
  const results = useDirectory(search, project.key)

  function toggle(person: DirectoryUser, on: boolean) {
    setSelected((prev) => {
      const next = new Map(prev)
      if (on) next.set(person.id, person)
      else next.delete(person.id)
      return next
    })
  }

  async function submit() {
    setFormError(null)
    try {
      const result = await add.mutateAsync({
        userIds: [...selected.keys()],
        role,
      })
      toast.add({
        title: `Added ${result.added} ${result.added === 1 ? "person" : "people"} as ${PROJECT_ROLE_LABELS[role]}`,
      })
      onDone()
    } catch (err) {
      setFormError(errorMessage(err))
    }
  }

  const people = search.trim() ? (results.data?.items ?? []) : []
  const count = selected.size

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add members to {project.name}</DialogTitle>
        <DialogDescription>
          Search by name or username. Pick several, then choose their role.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-4">
        {formError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            autoFocus
            placeholder="Name or username…"
            aria-label="Search people"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </InputGroup>
        <div
          role="group"
          aria-label="People"
          className="max-h-64 overflow-y-auto rounded-lg border"
        >
          {!search.trim() ? (
            <p className="p-4 text-sm text-muted-foreground">
              Type to find people. Deactivated accounts don&apos;t appear.
            </p>
          ) : results.isPending ? (
            <div className="flex justify-center p-4">
              <Spinner />
            </div>
          ) : people.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No active person matches.
            </p>
          ) : (
            <ul className="divide-y">
              {people.map((person) => {
                const already = person.memberRole ?? null
                const id = `add-${person.id}`
                return (
                  <li key={person.id}>
                    <label
                      htmlFor={id}
                      className={
                        already
                          ? "flex min-h-11 items-center gap-3 px-3 py-2 text-muted-foreground"
                          : "flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/50"
                      }
                    >
                      <Checkbox
                        id={id}
                        checked={already ? false : selected.has(person.id)}
                        disabled={Boolean(already)}
                        onCheckedChange={(on) => toggle(person, on)}
                      />
                      <span className="flex flex-1 flex-col">
                        <span className="text-sm font-medium">
                          {person.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          @{person.username}
                        </span>
                      </span>
                      {already && (
                        <span className="text-xs">
                          Already a {PROJECT_ROLE_LABELS[already]}
                        </span>
                      )}
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        {count > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">Selected:</span>
            {[...selected.values()].map((person) => (
              <Badge
                key={person.id}
                variant="secondary"
                className="h-6 gap-1 pr-0.5"
              >
                {person.name}
                <button
                  type="button"
                  aria-label={`Unselect ${person.name}`}
                  className="flex size-5 items-center justify-center rounded-full hover:bg-foreground/10"
                  onClick={() => toggle(person, false)}
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <Field orientation="horizontal" className="items-center">
          <FieldLabel htmlFor="add-role">
            Role for the {count || ""} selected
          </FieldLabel>
          <Select
            items={ROLE_ITEMS}
            value={role}
            onValueChange={(value) => setRole(value as ProjectRole)}
          >
            <SelectTrigger id="add-role" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <DialogFooter>
        <Button
          disabled={count === 0 || add.isPending}
          onClick={() => void submit()}
        >
          {add.isPending && <Spinner data-icon="inline-start" />}
          {count === 0
            ? "Add people"
            : `Add ${count} ${count === 1 ? "person" : "people"}`}
        </Button>
      </DialogFooter>
    </>
  )
}

export function AddMembersDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        {open && <AddMembersForm onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}
