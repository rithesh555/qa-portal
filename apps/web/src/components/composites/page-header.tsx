import type { ReactNode, Ref } from "react"
import { cn } from "@/lib/utils"

export interface Fact {
  label: string
  value: ReactNode
}

/**
 * A page's title block: the h1, one line of description, its actions, and
 * the facts about the page as keyline pills (instead of dot-joined meta lines).
 * `before` holds breadcrumbs, `media` sits beside the title (a project tile),
 * `children` follow the facts, and `headingRef` lets a page focus its h1.
 */
export function PageHeader({
  title,
  description,
  facts,
  factsLabel,
  actions,
  before,
  media,
  headingRef,
  headingId,
  children,
  className,
}: {
  title: string
  description?: ReactNode
  facts?: Fact[]
  factsLabel?: string
  actions?: ReactNode
  before?: ReactNode
  media?: ReactNode
  headingRef?: Ref<HTMLHeadingElement>
  /** Lets a surrounding landmark name itself after the title. */
  headingId?: string
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {before}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-[1_1_28rem] items-start gap-4">
          {media}
          <div className="flex max-w-2xl min-w-0 flex-col gap-1.5">
            <h1
              id={headingId}
              ref={headingRef}
              tabIndex={headingRef ? -1 : undefined}
              className="text-3xl font-semibold tracking-tight break-words outline-none"
            >
              {title}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
            {facts && facts.length > 0 && (
              <FactPills
                label={factsLabel ?? `${title} details`}
                facts={facts}
              />
            )}
            {children}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
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
            <span className="text-muted-foreground">
              {f.label}
              <span className="sr-only">: </span>
            </span>
            <span className="min-w-0 font-medium break-words">{f.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
