import { ConstructionIcon } from "lucide-react"
import type { NavItem } from "@/app/nav"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

/** Stand-in for a module that is built in a later phase. */
export function ModulePlaceholder({ item }: { item: NavItem }) {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{item.title}</h1>
      <Empty className="flex-1 border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ConstructionIcon />
          </EmptyMedia>
          <EmptyTitle>Not built yet</EmptyTitle>
          <EmptyDescription>
            {item.title} arrives in phase {item.phase} of the build.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}
