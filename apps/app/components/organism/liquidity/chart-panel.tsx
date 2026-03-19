"use client";

import { useState } from "react";

// Components
import Card from "@/components/atoms/card";
import { ParentSize } from "@visx/responsive";
import Skeleton from "@/components/atoms/skeleton";
import LiquidityBars from "@/components/organism/chart/liquidity-bars";

// Hooks
import { useTranslations } from "next-intl";

// Types
import type {
  LiquidityChartProps,
  LiquidityChartTooltipData,
} from "@/types/interfaces";

export default function LiquidityChart({
  bars,
  spotPrice,
}: LiquidityChartProps) {
  const t = useTranslations("liquidity");
  const [ready, setReady] = useState(false);
  const [tooltip, setTooltip] = useState<LiquidityChartTooltipData | null>(
    null,
  );

  return (
    <Card title={t("chartTitle")} description={t("chartDescription")}>
      <div className="relative h-75">
        {!ready && <Skeleton className="absolute inset-0 z-10 rounded-md" />}
        <div className={!ready ? "invisible" : ""}>
          <ParentSize debounceTime={100}>
            {({ width }) => (
              <LiquidityBars
                width={width}
                height={300}
                bars={bars}
                spotPrice={spotPrice}
                onReady={() => setReady(true)}
                onHover={setTooltip}
                onLeave={() => setTooltip(null)}
              />
            )}
          </ParentSize>
        </div>
        {tooltip && (
          <div
            className="pointer-events-none absolute z-50 rounded border border-border bg-background px-3 py-2 text-xs shadow-lg"
            style={{ left: tooltip.x + 16, top: tooltip.y - 40 }}
          >
            <p className="font-bold">{tooltip.bar.name}</p>
            <p>
              <span className="text-muted-foreground">Amount0:</span>{" "}
              <span className="font-mono">
                {tooltip.bar.amount0.toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Amount1:</span>{" "}
              <span className="font-mono">
                {tooltip.bar.amount1.toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Price Range:</span>{" "}
              <span className="font-mono">
                {tooltip.bar.from.toFixed(16)} – {tooltip.bar.to.toFixed(16)}
              </span>
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
