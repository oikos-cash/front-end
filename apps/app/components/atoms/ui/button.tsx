import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/utils/object";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium tracking-tight transition-[background,color,box-shadow,transform,filter] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-40 disabled:saturate-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // Primary: vertical brand gradient + inner bevel + outer glow on hover.
        default:
          "bg-[linear-gradient(180deg,#f6cf5a_0%,#f0bf30_100%)] text-primary-foreground border border-[rgba(0,0,0,0.15)] shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_-1px_0_rgba(0,0,0,0.15)_inset,0_2px_6px_-2px_rgba(245,200,67,0.45)] hover:brightness-[1.05] hover:shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_-1px_0_rgba(0,0,0,0.15)_inset,0_0_0_1px_rgba(245,200,67,0.35),0_4px_18px_-4px_rgba(245,200,67,0.55)]",
        destructive:
          "bg-[linear-gradient(180deg,#ec6868_0%,#d83a3a_100%)] text-white border border-[rgba(0,0,0,0.15)] shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_-1px_0_rgba(0,0,0,0.15)_inset,0_2px_6px_-2px_rgba(227,79,79,0.45)] hover:brightness-[1.05] focus-visible:ring-destructive/60",
        success:
          "bg-[linear-gradient(180deg,#1ad6a3_0%,#00b285_100%)] text-white border border-[rgba(0,0,0,0.15)] shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_-1px_0_rgba(0,0,0,0.15)_inset,0_2px_6px_-2px_rgba(0,200,151,0.45)] hover:brightness-[1.05] focus-visible:ring-success/60",
        outline:
          "border border-border bg-card/40 text-foreground backdrop-blur-[2px] hover:bg-accent/60 hover:border-border-strong",
        secondary:
          "bg-secondary text-secondary-foreground border border-border/40 hover:bg-secondary/70",
        ghost:
          "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/90",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

// Types
export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
