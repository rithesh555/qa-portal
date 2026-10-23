import { Spinner } from "@/components/ui/spinner"

export function FullPageSpinner({ label }: { label: string }) {
  return (
    <div
      role="status"
      className="flex min-h-svh items-center justify-center gap-2 text-sm text-muted-foreground"
    >
      <Spinner aria-hidden />
      {label}
    </div>
  )
}
