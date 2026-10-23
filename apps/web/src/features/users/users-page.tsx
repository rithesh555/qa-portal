import {
  PORTAL_ROLE_LABELS,
  type User,
  userListQuerySchema,
  USER_STATUSES,
} from "@qa/shared"
import {
  CircleAlertIcon,
  EllipsisIcon,
  KeyRoundIcon,
  PencilIcon,
  PlusIcon,
  UserCheckIcon,
  UserXIcon,
  UsersIcon,
} from "lucide-react"
import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
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
import { ListPagination } from "@/components/list-pagination"
import { SearchBox } from "@/components/search-box"
import { useSession } from "@/features/auth/session"
import { useListParams } from "@/hooks/use-list-params"
import { errorMessage } from "@/lib/api"
import { useSetActive, useUsers } from "./api"
import { DeactivateDialog, ResetPasswordDialog } from "./user-action-dialogs"
import { UserFormDialog } from "./user-form-dialog"

const STATUS_LABELS: Record<(typeof USER_STATUSES)[number], string> = {
  active: "Active",
  deactivated: "Deactivated",
  all: "All",
}

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" })

function RowActions({
  user,
  isSelf,
  onEdit,
  onResetPassword,
  onDeactivate,
}: {
  user: User
  isSelf: boolean
  onEdit: () => void
  onResetPassword: () => void
  onDeactivate: () => void
}) {
  const setActive = useSetActive()

  async function reactivate() {
    try {
      await setActive.mutateAsync({ user, active: true })
      toast.add({ title: `${user.name} can sign in again` })
    } catch (err) {
      toast.add({
        type: "error",
        title: `Couldn't reactivate ${user.name}`,
        description: errorMessage(err),
      })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${user.name}`}
          />
        }
      >
        <EllipsisIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onEdit}>
            <PencilIcon />
            Edit
          </DropdownMenuItem>
          {/* Your own password is changed from the account menu. */}
          {!isSelf && (
            <DropdownMenuItem onClick={onResetPassword}>
              <KeyRoundIcon />
              Reset password
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        {!isSelf && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {user.active ? (
                <DropdownMenuItem variant="destructive" onClick={onDeactivate}>
                  <UserXIcon />
                  Deactivate
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => void reactivate()}>
                  <UserCheckIcon />
                  Reactivate
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function LoadingRows() {
  return Array.from({ length: 5 }, (_, i) => (
    <TableRow key={i}>
      <TableCell colSpan={6}>
        <Skeleton className="h-8 w-full" />
      </TableCell>
    </TableRow>
  ))
}

export function UsersPage() {
  const [query, setQuery] = useListParams(userListQuerySchema)
  const users = useUsers(query)
  const { data: me } = useSession()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [resetting, setResetting] = useState<User | null>(null)
  const [deactivating, setDeactivating] = useState<User | null>(null)

  const page = users.data
  const filtered = Boolean(query.q) || query.status !== "active"

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            Create accounts, reset passwords and deactivate people who&apos;ve
            left. Project access is set on each project.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <PlusIcon data-icon="inline-start" />
          New user
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={query.status}
          onValueChange={(status) => setQuery({ status: status as string })}
        >
          <TabsList>
            {USER_STATUSES.map((status) => (
              <TabsTrigger key={status} value={status}>
                {STATUS_LABELS[status]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <SearchBox
          value={query.q ?? ""}
          onChange={(q) => setQuery({ q })}
          label="Search name, username or email"
        />
      </div>

      {users.isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Couldn&apos;t load users</AlertTitle>
          <AlertDescription>
            {errorMessage(users.error)}{" "}
            <Button
              variant="link"
              className="h-auto p-0"
              onClick={() => void users.refetch()}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : page && page.total === 0 ? (
        <Empty role="status" className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>
              {filtered ? "No users match" : "No users yet"}
            </EmptyTitle>
            <EmptyDescription>
              {filtered
                ? "Try another search or status."
                : "Create the first account with New user."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto rounded-lg border">
            <Table aria-busy={users.isFetching}>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Created
                  </TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!page ? (
                  <LoadingRows />
                ) : (
                  page.items.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {user.name}
                            {user.id === me?.id && (
                              <span className="font-normal text-muted-foreground">
                                {" "}
                                (you)
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            @{user.username}
                          </span>
                          {!user.active && (
                            <Badge
                              variant="destructive"
                              className="mt-1 sm:hidden"
                            >
                              Deactivated
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.role === "admin" ? "default" : "secondary"
                          }
                        >
                          {PORTAL_ROLE_LABELS[user.role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {user.active ? (
                          <Badge variant="outline">Active</Badge>
                        ) : (
                          <Badge variant="destructive">Deactivated</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">
                        {dateFormat.format(new Date(user.createdAt))}
                      </TableCell>
                      <TableCell>
                        <RowActions
                          user={user}
                          isSelf={user.id === me?.id}
                          onEdit={() => {
                            setEditing(user)
                            setFormOpen(true)
                          }}
                          onResetPassword={() => setResetting(user)}
                          onDeactivate={() => setDeactivating(user)}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {page && (
            <ListPagination
              page={page.page}
              pageSize={page.pageSize}
              total={page.total}
              noun={["user", "users"]}
              onPageChange={(next) => setQuery({ page: next })}
            />
          )}
        </div>
      )}

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editing}
      />
      <ResetPasswordDialog
        user={resetting}
        onClose={() => setResetting(null)}
      />
      <DeactivateDialog
        user={deactivating}
        onClose={() => setDeactivating(null)}
      />
    </div>
  )
}
