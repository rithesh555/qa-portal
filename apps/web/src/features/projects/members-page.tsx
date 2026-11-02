import { PageHeader } from "@/components/composites/page-header"
import { DataError } from "@/components/composites/data-state"
import {
  type Member,
  memberListQuerySchema,
  PROJECT_ROLE_LABELS,
  PROJECT_ROLES,
  type ProjectRole,
} from "@qa/shared"
import { PlusIcon, UsersRoundIcon } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router"
import { ListPagination } from "@/components/list-pagination"
import { SearchBox } from "@/components/search-box"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/toast"
import { useSession } from "@/features/auth/session"
import { useCan } from "@/hooks/use-can"
import { useListParams } from "@/hooks/use-list-params"
import { errorMessage } from "@/lib/api"
import { AddMembersDialog } from "./add-members-dialog"
import { useChangeRole, useMembers, useRemoveMember } from "./api"
import { useProjectContext } from "./project-layout"

const ROLE_ITEMS = PROJECT_ROLES.map((value) => ({
  value,
  label: PROJECT_ROLE_LABELS[value],
}))

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" })

/** The only active QA Lead: removing or demoting them leaves no one in charge. */
function isLastLead(member: Member, leadCount: number) {
  return member.role === "lead" && member.active && leadCount <= 1
}

const LAST_LEAD_NOTE_ID = "last-lead-note"

function RoleSelect({
  member,
  lastLead,
  isAdmin,
}: {
  member: Member
  lastLead: boolean
  isAdmin: boolean
}) {
  const { project } = useProjectContext()
  const changeRole = useChangeRole(project.key)
  // An admin changing the last lead confirms first.
  const [confirming, setConfirming] = useState<ProjectRole | null>(null)

  async function change(role: ProjectRole) {
    setConfirming(null)
    if (role === member.role) return
    try {
      await changeRole.mutateAsync({ userId: member.userId, role })
      toast.add({
        title: `${member.name} is now ${PROJECT_ROLE_LABELS[role]}`,
      })
    } catch (err) {
      toast.add({
        type: "error",
        title: `Couldn't change ${member.name}'s role`,
        description: errorMessage(err),
      })
    }
  }

  return (
    <>
      <Select
        items={ROLE_ITEMS}
        value={member.role}
        onValueChange={(role) => {
          if (lastLead && role !== "lead") setConfirming(role as ProjectRole)
          else void change(role as ProjectRole)
        }}
        disabled={changeRole.isPending || (lastLead && !isAdmin)}
      >
        <SelectTrigger
          size="sm"
          aria-label={`Role for ${member.name}`}
          aria-describedby={lastLead ? LAST_LEAD_NOTE_ID : undefined}
          className="w-32"
        >
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
      <AlertDialog
        open={confirming !== null}
        onOpenChange={(open) => !open && setConfirming(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Make {member.name} {confirming && PROJECT_ROLE_LABELS[confirming]}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {member.name} is the only active QA Lead. {project.name} will have
              no one to manage its members and releases until you make someone
              else QA Lead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => confirming && void change(confirming)}
            >
              Change role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function RemoveDialog({
  member,
  lastLead,
  onClose,
}: {
  member: Member | null
  lastLead: boolean
  onClose: () => void
}) {
  const { project } = useProjectContext()
  const remove = useRemoveMember(project.key)
  const navigate = useNavigate()
  const { data: me } = useSession()
  const self = member?.userId === me?.id

  async function confirm() {
    if (!member) return
    try {
      await remove.mutateAsync(member.userId)
      if (self) {
        toast.add({ title: `You left ${project.name}` })
        // The project is no longer visible to them.
        navigate("/projects", { replace: true })
        return
      }
      toast.add({ title: `${member.name} removed from ${project.name}` })
      onClose()
    } catch (err) {
      toast.add({
        type: "error",
        title: `Couldn't remove ${member.name}`,
        description: errorMessage(err),
      })
    }
  }

  return (
    <AlertDialog
      open={member !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {self ? `Leave ${project.name}?` : `Remove ${member?.name}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {self
              ? "You'll lose access to this project straight away."
              : "They lose access to this project straight away. Their past work and history stay."}
            {lastLead &&
              ` ${project.name} will then have no active QA Lead until you make someone else QA Lead.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => void confirm()}
          >
            {remove.isPending && <Spinner data-icon="inline-start" />}
            {self ? "Leave" : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function MembersPage() {
  const { project, allowed } = useProjectContext()
  const [query, setQuery] = useListParams(memberListQuerySchema)
  const members = useMembers(project.key, query)
  const { data: me } = useSession()
  // Only admins may change or remove the last QA Lead.
  const isAdmin = useCan()("projects:manage")
  const canManage = allowed("members:manage")
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<Member | null>(null)

  const page = members.data
  const leadCount = project.roleCounts.lead
  const active =
    project.roleCounts.lead +
    project.roleCounts.tester +
    project.roleCounts.viewer

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Members"
        description={
          <>
            {active} active {active === 1 ? "member" : "members"}. Admins can
            open every project and aren&apos;t listed here.
          </>
        }
        actions={
          canManage && (
            <Button onClick={() => setAdding(true)}>
              <PlusIcon data-icon="inline-start" />
              Add members
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={query.role ?? "all"}
          onValueChange={(role) =>
            setQuery({ role: role === "all" ? undefined : (role as string) })
          }
        >
          <TabsList>
            <TabsTrigger value="all">All ({active})</TabsTrigger>
            {PROJECT_ROLES.map((role) => (
              <TabsTrigger key={role} value={role}>
                {PROJECT_ROLE_LABELS[role]}s ({project.roleCounts[role]})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <SearchBox
          value={query.q ?? ""}
          onChange={(q) => setQuery({ q })}
          label="Search members"
        />
      </div>

      {canManage && (
        <p id={LAST_LEAD_NOTE_ID} className="text-xs text-muted-foreground">
          {isAdmin
            ? "Every project should keep an active QA Lead. As an admin you can still remove or change the last one, for example while reorganising; you'll be asked to confirm."
            : "Every project keeps at least one active QA Lead, so the last one can't be removed or given another role. Make someone else QA Lead first."}
        </p>
      )}

      {members.isError ? (
        <DataError
          title="Couldn't load members"
          error={members.error}
          onRetry={() => void members.refetch()}
        />
      ) : page && page.total === 0 ? (
        <Empty role="status" className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersRoundIcon />
            </EmptyMedia>
            <EmptyTitle>No members match</EmptyTitle>
            <EmptyDescription>Try another search or role.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto rounded-lg border">
            <Table aria-busy={members.isFetching}>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Project role</TableHead>
                  <TableHead className="hidden sm:table-cell">Added</TableHead>
                  {canManage && (
                    <TableHead className="w-24">
                      <span className="sr-only">Remove</span>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {!page
                  ? Array.from({ length: 4 }, (_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={4}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : page.items.map((member) => {
                      const self = member.userId === me?.id
                      const lastLead = isLastLead(member, leadCount)
                      const locked = lastLead && !isAdmin
                      return (
                        <TableRow key={member.userId}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span
                                className={
                                  member.active
                                    ? "font-medium"
                                    : "font-medium text-muted-foreground"
                                }
                              >
                                {member.name}
                                {self && (
                                  <span className="font-normal text-muted-foreground">
                                    {" "}
                                    (you)
                                  </span>
                                )}
                              </span>
                              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                @{member.username}
                                {!member.active && (
                                  <Badge variant="destructive">
                                    Deactivated
                                  </Badge>
                                )}
                                {lastLead && canManage && (
                                  <Badge variant="outline">Only QA Lead</Badge>
                                )}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {canManage && member.active ? (
                              <RoleSelect
                                member={member}
                                lastLead={lastLead}
                                isAdmin={isAdmin}
                              />
                            ) : (
                              PROJECT_ROLE_LABELS[member.role]
                            )}
                          </TableCell>
                          <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                            {dateFormat.format(new Date(member.addedAt))}
                          </TableCell>
                          {canManage && (
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                disabled={locked}
                                aria-describedby={
                                  lastLead ? LAST_LEAD_NOTE_ID : undefined
                                }
                                aria-label={
                                  self
                                    ? `Leave ${project.name}`
                                    : `Remove ${member.name}`
                                }
                                onClick={() => setRemoving(member)}
                              >
                                {self ? "Leave" : "Remove"}
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })}
              </TableBody>
            </Table>
          </div>
          {page && (
            <ListPagination
              page={page.page}
              pageSize={page.pageSize}
              total={page.total}
              noun={["member", "members"]}
              onPageChange={(next) => setQuery({ page: next })}
            />
          )}
        </div>
      )}

      {canManage && <AddMembersDialog open={adding} onOpenChange={setAdding} />}
      <RemoveDialog
        member={removing}
        lastLead={removing ? isLastLead(removing, leadCount) : false}
        onClose={() => setRemoving(null)}
      />
    </div>
  )
}
