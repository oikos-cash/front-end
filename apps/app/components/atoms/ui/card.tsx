import * as React from "react"

import { cn } from "@/utils/object"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        // Surface: navy card tone with a faint top sheen + bottom shadow.
        // The 1px inner top-border creates the "lit edge" effect.
        "relative flex flex-col overflow-hidden rounded-lg border border-border/60 bg-card text-card-foreground",
        "shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_10px_30px_-16px_rgba(0,0,0,0.7)]",
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-lg",
        "before:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_50%)]",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        // Headers sit on a subtly tinted bg (slightly warm tint from the
        // brand color) and are separated from body by a stronger divider.
        "@container/card-header relative grid auto-rows-min grid-rows-[auto_auto] items-start gap-1 border-b border-border/70 px-4 py-3 has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        "bg-[linear-gradient(180deg,rgba(245,200,67,0.035),transparent_100%)]",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-sm font-semibold leading-tight tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-xs leading-relaxed text-muted-foreground/80", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("relative z-[1] flex flex-1 flex-col gap-3 px-4 py-3.5", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "relative z-[1] flex items-center border-t border-border/60 bg-[linear-gradient(0deg,rgba(255,255,255,0.02),transparent)] px-4 py-3",
        className,
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
