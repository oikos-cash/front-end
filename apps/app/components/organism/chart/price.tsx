// Components
import Skeleton from "@/components/atoms/skeleton";

// Hooks
import { useTranslations } from "next-intl";

// Types
import type { PriceChartRendererProps } from "@/types/interfaces";

export default function PriceChart({
  ready,
  tooltipRef,
  containerRef,
  crosshairData,
}: PriceChartRendererProps) {
  const t = useTranslations("priceChart");

  return (
    <div className="relative h-100">
      {!ready && <Skeleton className="absolute inset-0 z-10 rounded-md" />}
      <div
        ref={containerRef}
        className={`chart-reset ${!ready ? "invisible" : ""}`}
      />
      {crosshairData.visible && (
        <div
          ref={tooltipRef}
          className="pointer-events-none absolute z-50 rounded border border-border bg-background px-3 py-2 text-xs shadow-lg"
          style={{ left: crosshairData.x, top: crosshairData.y }}
        >
          <p className="text-muted-foreground">{crosshairData.time}</p>
          <p>
            <span className="text-muted-foreground">{t("price")}:</span>{" "}
            <span className="font-mono">{crosshairData.price}</span>
          </p>
          <p>
            <span className="text-muted-foreground">{t("volume")}:</span>{" "}
            <span className="font-mono">{crosshairData.volume}</span>
          </p>
        </div>
      )}
    </div>
  );
}
