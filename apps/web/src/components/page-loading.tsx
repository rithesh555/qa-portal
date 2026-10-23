import type { ReactNode } from "react"

/**
 * A page (or panel) still loading: busy for assistive tech, with a short
 * spoken label, around the visual skeleton.
 */
export function PageLoading({
  label,
  children,
  className,
}: {
  /** "Loading the run…" */
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div aria-busy="true" className={className}>
      <span role="status" className="sr-only">
        {label}
      </span>
      {children}
    </div>
  )
}
