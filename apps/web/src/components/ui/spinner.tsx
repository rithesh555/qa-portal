import { cn } from "cn"
import { Loader2Icon } from "lucide-react"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  // Inside a button (data-icon) or next to its own text, the spinner is just
  // decoration: the button's or caller's words say what's happening.
  const decorative =
    "data-icon" in props ||
    props["aria-hidden"] === true ||
    props["aria-hidden"] === "true"
  return (
    <Loader2Icon
      data-slot="spinner"
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "status", "aria-label": "Loading" })}
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
