import { LockIcon } from "lucide-react"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export function NoAccess() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <LockIcon />
        </EmptyMedia>
        <EmptyTitle>
          <h1>You don&apos;t have access to this page</h1>
        </EmptyTitle>
        <EmptyDescription>
          Your role doesn&apos;t include this area. Ask an admin if you need it.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" nativeButton={false} render={<Link to="/" />}>
          Go to home
        </Button>
      </EmptyContent>
    </Empty>
  )
}
