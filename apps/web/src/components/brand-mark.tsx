import { cn } from "cn"

/**
 * The QA Portal mark: a test-run result bar (passed, failed, blocked,
 * skipped). Decorative; always pair it with the product name.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-2 w-10 gap-px overflow-hidden rounded-full",
        className
      )}
    >
      <span className="basis-[58%] bg-status-pass" />
      <span className="basis-[14%] bg-status-fail" />
      <span className="basis-[10%] bg-status-blocked" />
      <span className="basis-[18%] bg-status-skipped" />
    </span>
  )
}
