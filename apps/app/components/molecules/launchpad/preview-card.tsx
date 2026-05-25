"use client";

import { useLaunchpadDerived } from "@/hooks/use-launchpad-derived";
import { formatStakeNumber } from "@/utils/number";
import { cn } from "@/utils/object";

/**
 * Live preview panel mirroring the legacy launchpad's right-side card.
 * Renders a logo placeholder, the token symbol, derived metric tiles, and
 * a progress bar driven by how many required fields are filled. Updates
 * in real time as the user types into the wizard.
 */
export default function LaunchpadPreviewCard({
  className,
}: {
  className?: string;
}) {
  const d = useLaunchpadDerived();
  const sym = d.tokenSymbol ? d.tokenSymbol.toUpperCase() : "XXX";
  const name = d.tokenName || sym;

  const tiles: Array<{ label: string; value: string }> = [
    {
      label: "Supply",
      value: d.supply > 0 ? formatStakeNumber(d.supply, 0) : "—",
    },
    {
      label: "Presale Price",
      value:
        d.presalePriceBnb > 0
          ? `${formatStakeNumber(d.presalePriceBnb, 7, true)} BNB`
          : "—",
    },
    {
      label: "Market Cap",
      value:
        d.marketCapBnb > 0
          ? `${formatStakeNumber(d.marketCapBnb, 4, true)} BNB`
          : "—",
    },
    {
      label: "Floor Price",
      value:
        d.floorPriceBnb > 0
          ? `${formatStakeNumber(d.floorPriceBnb, 7, true)} BNB`
          : "—",
    },
  ];

  return (
    <aside
      className={cn(
        "flex flex-col gap-5 rounded-lg border border-border/60 bg-card/40 px-5 py-6",
        className,
      )}
      aria-label="Token preview"
    >
      <div className="flex items-center gap-2">
        <span className="block size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(245,200,67,0.6)]" />
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Preview
        </span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="relative flex size-24 items-center justify-center overflow-hidden rounded-full bg-[radial-gradient(circle_at_30%_20%,#1f2433,#0e1118)] ring-1 ring-border/60">
          {d.tokenLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={d.tokenLogoUrl}
              alt={name}
              className="size-full object-cover"
            />
          ) : (
            <span className="font-mono text-lg font-semibold tracking-[0.05em] text-primary">
              {sym.slice(0, 4)}
            </span>
          )}
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-base font-semibold text-foreground">
            {name}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            ${sym}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="flex flex-col gap-0.5 rounded-md border border-border/40 bg-background/30 px-3 py-2"
          >
            <span className="eyebrow">{tile.label}</span>
            <span className="truncate font-mono text-sm font-semibold tabular-nums text-foreground">
              {tile.value}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="eyebrow flex items-center justify-between">
          <span>Progress</span>
          <span className="font-mono tabular-nums text-primary">
            {d.progressPercent}%
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted/40">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${d.progressPercent}%` }}
          />
        </div>
        <span className="eyebrow text-muted-foreground/60">
          Step {d.currentStepIndex + 1} of {d.totalSteps}
        </span>
      </div>
    </aside>
  );
}
