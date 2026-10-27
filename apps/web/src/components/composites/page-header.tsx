import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface Fact {
  label: string
  value: ReactNode
}

/**
 * A page's title block: the h1, one line of description, its actions, and
 * the facts about the page as keyline pills (instead of dot-joined meta lines).
 */
export function PageHeader({
  title,
  description,
  facts,
  actions,
  className,
}: {
  title: string
  description?: ReactNode
  facts?: Fact[]
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-4",
        className
      )}
    >
      <div className="flex max-w-2xl min-w-0 flex-col gap-1.5">
        <h1 className="text-3xl font-semibold tracking-tight break-words">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {facts && facts.length > 0 && (
          <FactPills label={`${title} details`} facts={facts} />
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function FactPills({ label, facts }: { label: string; facts: Fact[] }) {
  return (
    <div role="group" aria-label={label} className="mt-1">
      <ul className="flex flex-wrap gap-1.5">
        {facts.map((f) => (
          <li
            key={f.label}
            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-rule-strong bg-card px-3 py-0.5 text-xs"
          >
            <span className="text-muted-foreground">{f.label}</span>
            <span className="min-w-0 font-medium break-words">{f.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
