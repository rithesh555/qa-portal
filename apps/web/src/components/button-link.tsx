import { type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Link, type LinkProps } from "react-router"
import { buttonVariants } from "@/components/ui/button"

/**
 * Navigation that looks like a button but stays a link for assistive tech
 * (`<Button render={<Link />}>` is announced as a button). Disabled, it has
 * no href and says so.
 */
export function ButtonLink({
  className,
  variant = "default",
  size = "default",
  disabled = false,
  ...props
}: LinkProps &
  VariantProps<typeof buttonVariants> & {
    disabled?: boolean
  }) {
  const classes = cn(buttonVariants({ variant, size, className }))
  if (disabled)
    return (
      <a
        data-slot="button"
        aria-disabled="true"
        className={cn(classes, "pointer-events-none opacity-50")}
      >
        {props.children}
      </a>
    )
  return <Link data-slot="button" className={classes} {...props} />
}
