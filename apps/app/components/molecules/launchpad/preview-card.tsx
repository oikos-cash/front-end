"use client";

import { CheckCircle2, Circle, ArrowRight } from "lucide-react";

import { useLaunchpadStore } from "@/stores/launchpad";
import { useLaunchpadDerived } from "@/hooks/use-launchpad-derived";
import { LAUNCHPAD_STEPS, LAUNCHPAD_STEP_LABELS } from "@/types/constants";
import { formatStakeNumber } from "@/utils/number";
import { cn } from "@/utils/object";
import { useTranslations } from "next-intl";

/**
 * Premium live preview panel for the launchpad wizard. Sits at 2xl+
 * next to the form column. Reads from the same store that powers the
 * form and updates in real time as the user types.
 *
 * Layout (top → bottom):
 *
 *   ┌──────────────────────────────┐
 *   │  ◆  TOKEN PREVIEW            │   eyebrow + status chip
 *   │                              │
 *   │        ┌──────────┐          │
 *   │        │   coin   │          │   large coin avatar w/ ring + glow
 *   │        └──────────┘          │
 *   │       Token Name             │
 *   │         $TICKER              │
 *   │                              │
 *   ├──────────────────────────────┤
 *   │  Supply        12,345,678    │   metric list (label/value rows)
 *   │  Floor price   0.0₅3 BNB     │
 *   │  Market cap    1.2 BNB       │
 *   ├──────────────────────────────┤
 *   │  PROGRESS              60%   │
 *   │  ────────────────────────    │
 *   │  ◉ Token Info   · Complete   │   per-step checklist
 *   │  ○ Pool Setup   · Current    │
 *   │  ○ Presale      · Pending    │
 *   │  ○ Review                    │
 *   └──────────────────────────────┘
 */
export default function LaunchpadPreviewCard({
  className,
}: {
  className?: string;
}) {
  const t = useTranslations("launchpad");
  const d = useLaunchpadDerived();
  const completedSteps = useLaunchpadStore((s) => s.completedSteps);

  const sym = d.tokenSymbol ? d.tokenSymbol.toUpperCase() : "XXX";
  const name = d.tokenName || "Untitled Token";

  // Status pill driven off progress + active step. Reads like an actual
  // workflow state, not a generic "preview" label.
  const status: { label: string; tone: "draft" | "config" | "ready" } =
    d.progressPercent >= 100
      ? { label: "Ready to deploy", tone: "ready" }
      : d.progressPercent > 0
        ? { label: "Configuring", tone: "config" }
        : { label: "Draft", tone: "draft" };

  const statusStyles = {
    draft:
      "border-border/70 bg-muted/40 text-muted-foreground [&_.dot]:bg-muted-foreground/60",
    config:
      "border-warning/35 bg-warning/15 text-warning [&_.dot]:bg-warning",
    ready:
      "border-success/40 bg-success/15 text-success [&_.dot]:bg-success",
  } as const;

  const tiles: Array<{ label: string; value: string }> = [
    {
      label: "Supply",
      value: d.supply > 0 ? formatStakeNumber(d.supply, 0) : "—",
    },
    ...(d.enablePresale
      ? [
          {
            label: "Presale",
            value:
              d.presalePriceBnb > 0
                ? `${formatStakeNumber(d.presalePriceBnb, 7, true)} BNB`
                : "—",
          },
        ]
      : []),
    {
      label: "Floor price",
      value:
        d.floorPriceBnb > 0
          ? `${formatStakeNumber(d.floorPriceBnb, 7, true)} BNB`
          : "—",
    },
    {
      label: "Market cap",
      value:
        d.marketCapBnb > 0
          ? `${formatStakeNumber(d.marketCapBnb, 4, true)} BNB`
          : "—",
    },
  ];

  return (
    <aside
      className={cn(
        // Premium plate: card-tone surface with brand-tinted top sheen,
        // subtle radial glow under the avatar, and a 1px lit edge.
        "relative isolate flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card",
        "shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_18px_50px_-24px_rgba(0,0,0,0.8)]",
        // Top sheen (very faint warm brand wash, ~16% of the panel).
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-40",
        "before:bg-[radial-gradient(ellipse_80%_100%_at_50%_0%,rgba(245,200,67,0.12),transparent_70%)]",
        // Faint grid texture for depth — only the top half.
        "after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:-z-10 after:h-48",
        "after:bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)]",
        "after:bg-[length:24px_24px] after:[mask-image:linear-gradient(180deg,#000_0%,transparent_85%)]",
        className,
      )}
      aria-label="Token preview"
    >
      {/* Eyebrow + status chip */}
      <div className="flex items-center justify-between gap-2 px-5 pt-5">
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="block size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(245,200,67,0.7)]"
          />
          <span className="eyebrow-strong">Token Preview</span>
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-2xs font-semibold uppercase tracking-[0.08em]",
            statusStyles[status.tone],
          )}
        >
          <span
            aria-hidden
            className="dot block size-1 rounded-full shadow-[0_0_6px_currentColor]"
          />
          {status.label}
        </span>
      </div>

      {/* Coin avatar + identity */}
      <div className="flex flex-col items-center gap-3 px-5 pt-6 pb-5">
        <div className="relative">
          {/* Outer halo — ambient glow only, no border. */}
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-3 rounded-full bg-[radial-gradient(circle,rgba(245,200,67,0.25),transparent_70%)] blur-md"
          />
          <div
            className={cn(
              "relative flex size-28 items-center justify-center overflow-hidden rounded-full",
              // Deep coin surface — radial bevel with a subtle hot-spot.
              "bg-[radial-gradient(circle_at_30%_22%,#2a3045_0%,#13182a_55%,#0a0e1c_100%)]",
              // Concentric ring with brand glow.
              "ring-1 ring-border/80",
              "shadow-[0_0_0_1px_rgba(245,200,67,0.22),0_8px_28px_-12px_rgba(0,0,0,0.85),0_0_22px_-6px_rgba(245,200,67,0.45)]",
            )}
          >
            {d.tokenLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={d.tokenLogoUrl}
                alt={name}
                className="size-full object-cover"
              />
            ) : (
              <span className="font-mono text-2xl font-semibold tracking-tight text-primary drop-shadow-[0_0_10px_rgba(245,200,67,0.5)]">
                {sym.slice(0, 4)}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-base font-semibold leading-tight tracking-tight text-foreground">
            {name}
          </span>
          <span className="font-mono text-xs tracking-tight text-muted-foreground/85">
            ${sym}
          </span>
        </div>
      </div>

      {/* Metrics — label/value rows with hairline separators. */}
      <dl className="mx-5 flex flex-col divide-y divide-border/40 overflow-hidden rounded-md border border-border/45 bg-background/30">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="flex items-center justify-between gap-3 px-3 py-2"
          >
            <dt className="eyebrow">{tile.label}</dt>
            <dd className="truncate font-mono text-sm font-semibold tabular-nums text-foreground">
              {tile.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* Progress + per-step checklist. */}
      <div className="flex flex-col gap-3 px-5 pt-5 pb-5">
        <div className="eyebrow flex items-center justify-between">
          <span>Progress</span>
          <span className="font-mono tabular-nums text-primary">
            {d.progressPercent}%
          </span>
        </div>
        <div
          className="h-1 w-full overflow-hidden rounded-full bg-muted/40 ring-1 ring-inset ring-border/40"
          role="progressbar"
          aria-valuenow={d.progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#f6cf5a,#f0bf30)] shadow-[0_0_10px_-2px_rgba(245,200,67,0.6)] transition-[width] duration-300"
            style={{ width: `${d.progressPercent}%` }}
          />
        </div>
        <ul className="mt-1 flex flex-col gap-1">
          {LAUNCHPAD_STEPS.map((step, idx) => {
            const isCurrent = idx === d.currentStepIndex;
            const isComplete = completedSteps.includes(idx);
            const isSkipped = idx === 2 && !d.enablePresale;
            const label = t(LAUNCHPAD_STEP_LABELS[idx]);
            return (
              <li
                key={step.path}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs",
                  isCurrent
                    ? "bg-primary/10 text-foreground ring-1 ring-inset ring-primary/25"
                    : "text-muted-foreground",
                )}
              >
                <span className="inline-flex items-center gap-2">
                  {isComplete ? (
                    <CheckCircle2 className="size-3.5 text-primary" />
                  ) : isCurrent ? (
                    <ArrowRight className="size-3.5 text-primary" />
                  ) : (
                    <Circle className="size-3.5 text-muted-foreground/45" />
                  )}
                  <span
                    className={cn(
                      "font-medium",
                      isComplete && !isCurrent && "text-foreground/80",
                    )}
                  >
                    {label}
                  </span>
                </span>
                <span className="eyebrow text-muted-foreground/60">
                  {isSkipped
                    ? t("skipped")
                    : isComplete
                      ? "Done"
                      : isCurrent
                        ? "Current"
                        : "Pending"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
