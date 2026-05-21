import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/utils/object"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-primary/15 text-primary border-primary/30 [a&]:hover:bg-primary/25",
        secondary:
          "bg-secondary text-secondary-foreground border-border/60 [a&]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/15 text-destructive border-destructive/30 [a&]:hover:bg-destructive/25",
        outline:
          "border-border/70 bg-card/40 text-muted-foreground [a&]:hover:bg-accent [a&]:hover:text-foreground",
        ghost: "border-transparent text-muted-foreground [a&]:hover:bg-accent [a&]:hover:text-foreground",
        link: "text-primary border-transparent underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
