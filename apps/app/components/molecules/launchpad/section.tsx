"use client";

import { Info } from "lucide-react";

import { cn } from "@/utils/object";

/**
 * Launchpad form section. Replaces the per-field Card wrapper that the
 * launchpad forms previously used (six identical card boxes stacked
 * vertically with no rhythm).
 *
 * The redesign converts each setting into a deliberate, numbered row:
 *
 *   ┌─ 01  Title here  · required                                  ─┐
 *   │     One-line description.                                    │
 *   │     ┌──────────────────────────────────────────────────────┐ │
 *   │     │   <form control(s)>                                   │ │
 *   │     └──────────────────────────────────────────────────────┘ │
 *   │     ⓘ Hint about the field.                                  │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Visual details:
 *   • Subtle 1px border + soft inner top sheen — reads as a single
 *     plate rather than a heavy card.
 *   • Numbered marker uses tabular monospace + brand color.
 *   • "Required" surfaces as an inline pill (primary tint), not a
 *     loud blue badge.
 *   • Help text becomes an info-icon paragraph below the control,
 *     not a footer with a top divider — keeps vertical rhythm tight.
 */
export default function LaunchpadSection({
  index,
  title,
  description,
  help,
  required,
  children,
  className,
}: {
  /** 1-based ordinal shown in the header marker (01, 02, ...). */
  index?: number;
  title: string;
  description?: string;
  help?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative flex flex-col gap-4 rounded-xl border border-border/60 bg-card/60 p-5",
        "shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_8px_24px_-16px_rgba(0,0,0,0.55)]",
        "transition-[border-color,box-shadow] focus-within:border-primary/45",
        "focus-within:shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_0_0_1px_rgba(245,200,67,0.18),0_8px_28px_-14px_rgba(245,200,67,0.25)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {typeof index === "number" && (
            <span
              aria-hidden
              className="mt-0.5 inline-flex items-center justify-center rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-mini font-semibold tabular-nums tracking-tight text-primary ring-1 ring-inset ring-primary/25"
            >
              {String(index).padStart(2, "0")}
            </span>
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="text-sm font-semibold leading-tight tracking-tight text-foreground">
              {title}
            </h3>
            {description && (
              <p className="text-xs leading-relaxed text-muted-foreground/85">
                {description}
              </p>
            )}
          </div>
        </div>
        {required && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-2xs font-semibold uppercase tracking-[0.08em] text-primary/90">
            <span
              aria-hidden
              className="size-1 rounded-full bg-primary shadow-[0_0_6px_rgba(245,200,67,0.7)]"
            />
            Required
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3">{children}</div>

      {help && (
        <p className="flex items-start gap-2 border-t border-border/40 pt-3 text-xs leading-relaxed text-muted-foreground/75">
          <Info className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/55" />
          <span>{help}</span>
        </p>
      )}
    </section>
  );
}
