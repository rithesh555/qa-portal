import { cn } from "@/lib/utils"

/**
 * The QA Portal mark, "Q check": a ring with a check makes the Q, a coral
 * tail finishes it. Ink on light surfaces, paper on dark ones. Decorative by
 * default; pass `label` when it stands alone without the product name.
 */
export function Logo({
  className,
  label,
}: {
  className?: string
  label?: string
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("size-8 shrink-0", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <rect width="48" height="48" rx="14" className="fill-foreground" />
      <circle
        cx="22"
        cy="22"
        r="11"
        fill="none"
        strokeWidth="4"
        className="stroke-background"
      />
      <path
        d="M16.5 22.5l4 4 7-8"
        fill="none"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-background"
      />
      <path
        d="M30.5 30.5l7 7"
        strokeWidth="4.5"
        strokeLinecap="round"
        className="stroke-logo-tail"
      />
    </svg>
  )
}

/** The mark with the product name beside it. */
export function LogoLockup({
  className,
  tagline,
}: {
  className?: string
  tagline?: string
}) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <Logo className="size-10" />
      <span className="flex flex-col leading-tight">
        <span className="text-lg font-semibold tracking-tight">QA Portal</span>
        {tagline && (
          <span className="text-sm text-muted-foreground">{tagline}</span>
        )}
      </span>
    </span>
  )
}
