"use client";

// Components
import Card from "@/components/atoms/card";
import Select from "@/components/atoms/select";
import Button from "@/components/atoms/button";
import Tooltip from "@/components/atoms/tooltip";
import Skeleton from "@/components/atoms/skeleton";
import ButtonGroup from "@/components/atoms/button-group";
import PriceChartRenderer from "@/components/organism/chart/price";

// Hooks
import { useTranslations } from "next-intl";
import usePriceChart from "@/hooks/use-price-chart";

// Types
import {
  CHART_PERIODS,
  CHART_INTERVALS,
  type ChartPeriod,
  type PriceChartProps,
} from "@/types/interfaces";

// Icons
import { BarChart3, TrendingUp, RefreshCw } from "lucide-react";

export default function PriceChart({}: PriceChartProps) {
  const t = useTranslations("priceChart");
  const {
    ready,
    chartType,
    setChartType,
    setInterval,
    setPeriod,
    crosshairData,
    containerRef,
    tooltipRef,
    handleRefresh,
  } = usePriceChart();

  return (
    <Card
      header={
        <div className="flex w-full flex-wrap items-center gap-2">
          {!ready ? (
            <>
              <Skeleton className="h-9 w-28 rounded-md" />
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-20 rounded-md" />
              <div className="flex-1" />
              <Skeleton className="size-7 rounded-md" />
            </>
          ) : (
            <>
              <Select
                defaultValue="1h"
                placeholder={t("interval")}
                onValueChange={setInterval}
                className="w-28"
                items={CHART_INTERVALS.map((v) => ({
                  value: v,
                  label: v.toUpperCase(),
                }))}
              />
              <Select
                defaultValue="1m"
                placeholder={t("period")}
                onValueChange={(v) => setPeriod(v as ChartPeriod)}
                className="w-20"
                items={CHART_PERIODS.map((p) => ({ value: p, label: t(p) }))}
              />
              <ButtonGroup>
                <Tooltip content={t("bars")}>
                  <Button
                    size="icon"
                    onClick={() => setChartType("bars")}
                    variant={chartType === "bars" ? "secondary" : "outline"}
                  >
                    <BarChart3 className="size-3.5" />
                  </Button>
                </Tooltip>
                <Tooltip content={t("line")}>
                  <Button
                    size="icon"
                    onClick={() => setChartType("line")}
                    variant={chartType === "line" ? "secondary" : "outline"}
                  >
                    <TrendingUp className="size-3.5" />
                  </Button>
                </Tooltip>
              </ButtonGroup>

              <div className="flex-1" />

              <Tooltip content={t("refresh")}>
                <Button variant="ghost" size="icon-xs" onClick={handleRefresh}>
                  <RefreshCw className="size-3.5" />
                </Button>
              </Tooltip>
            </>
          )}
        </div>
      }
    >
      <PriceChartRenderer
        ready={ready}
        crosshairData={crosshairData}
        containerRef={containerRef}
        tooltipRef={tooltipRef}
      />
    </Card>
  );
}
