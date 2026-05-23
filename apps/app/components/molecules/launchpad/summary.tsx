"use client";

import { FileText } from "lucide-react";

import { useLaunchpadDerived } from "@/hooks/use-launchpad-derived";
import { formatStakeNumber } from "@/utils/number";
import { cn } from "@/utils/object";

/**
 * Inline summary card placed under the Pool / Presale form. Renders a
 * horizontal row of derived metrics (BNB headline + USD equivalent
 * underneath), with a Presale Price column injected when the presale step
 * is active and enabled. Mirrors the legacy frontend's Summary card.
 */
export default function LaunchpadSummary({
  variant = "pool",
  className,
}: {
  /** "pool" — Floor / FDV / Protocol.
   *  "presale" — Floor / Presale / FDV / Protocol. */
  variant?: "pool" | "presale";
  className?: string;
}) {
  const d = useLaunchpadDerived();
  if (d.floorPriceBnb <= 0 || d.supply <= 0) return null;

  const showPresale = variant === "presale" && d.enablePresale;

  const cols: Array<{ label: string; bnb: number; usd: number }> = [
    { label: "Floor price", bnb: d.floorPriceBnb, usd: d.floorPriceUsd },
  ];
  if (showPresale) {
    cols.push({
      label: "Presale price",
      bnb: d.presalePriceBnb,
      usd: d.presalePriceUsd,
    });
  }
  cols.push({ label: "FDV", bnb: d.fdvBnb, usd: d.fdvUsd });

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-primary">
          <FileText className="size-3.5" />
        </span>
        <span className="text-sm font-semibold uppercase tracking-[0.08em] text-foreground">
          Summary
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg border border-border/60 bg-card/40 px-4 py-3 sm:grid-cols-3 lg:grid-cols-4">
        {cols.map((c) => (
          <div key={c.label} className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground/70">
              {c.label}
            </span>
            <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {formatStakeNumber(c.bnb, 7, true)} BNB
            </span>
            <span className="font-mono text-[11px] tabular-nums text-primary/90">
              ${formatStakeNumber(c.usd, 2, true)}
            </span>
          </div>
        ))}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground/70">
            Protocol
          </span>
          <span className="flex items-center gap-1.5">
            {d.protocol === "uniswap" || d.protocol === "pancakeswap" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={d.protocol === "uniswap" ? "/uniswap.png" : "/pancake.png"}
                alt={d.protocol}
                className="size-4 shrink-0 rounded-full object-contain"
              />
            ) : null}
            <span className="text-sm font-semibold capitalize text-foreground">
              {d.protocol === "pancakeswap" ? "PancakeSwap" : d.protocol || "—"}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
