// Components
import Link from "next/link";

// Utils
import { cn } from "@/utils/object";

// Icons
import { ChevronRight } from "lucide-react";

/**
 * Premium per-step header for the launchpad wizard. Replaces the generic
 * PageHeader on `/launchpad/*` routes. Establishes a single, deliberate
 * point of brand presence per step:
 *   • eyebrow brand label ("OIKOS LAUNCHPAD") with a glowing primary mark
 *   • compact "STEP N OF 4 · <step name>" indicator
 *   • title with tight negative tracking
 *   • optional one-line description
 *   • a 1px gradient accent line below as a tasteful divider
 *
 * The accompanying tab strip is the navigator, so we deliberately omit
 * breadcrumbs to avoid double nav UI.
 */
export default function LaunchpadStepHeader({
  step,
  totalSteps,
  stepLabel,
  title,
  description,
  className,
  backHref,
  backLabel,
}: {
  step: number;
  totalSteps: number;
  stepLabel: string;
  title: string;
  description?: string;
  className?: string;
  /** Optional "back to" affordance — kept for the final review step. */
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="block size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(245,200,67,0.65)]"
          />
          <span className="eyebrow-strong">Oikos Launchpad</span>
        </span>
        <span aria-hidden className="h-3 w-px bg-border" />
        <span className="eyebrow">
          Step {step} of {totalSteps}
          <span className="mx-1.5 text-muted-foreground/40">·</span>
          <span className="text-foreground/70">{stepLabel}</span>
        </span>
        {backHref && backLabel && (
          <Link
            href={backHref}
            className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <span>{backLabel}</span>
            <ChevronRight className="size-3" />
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-[28px]">
          {title}
        </h1>
        {description && (
          <p className="max-w-[58ch] text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      <span
        aria-hidden
        className="h-px w-full bg-[linear-gradient(90deg,rgba(245,200,67,0.45)_0%,rgba(245,200,67,0.18)_18%,transparent_55%)]"
      />
    </header>
  );
}
