"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  LineType,
  LineStyle,
  LineSeries,
  BarSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
} from "lightweight-charts";

// Components
import Select from "@/components/atoms/select";
import Button from "@/components/atoms/button";
import ButtonGroup from "@/components/atoms/button-group";
import Tooltip from "@/components/atoms/tooltip";
import Skeleton from "@/components/atoms/skeleton";

// Hooks
import { useTranslations } from "next-intl";

// Icons
import { BarChart3, TrendingUp, RefreshCw } from "lucide-react";

// Types
import {
  type PriceChartProps,
  type ChartPeriod,
  type ChartType,
  CHART_INTERVALS,
  CHART_PERIODS,
} from "@/types/interfaces";

// Utils
import { generateMockOHLCV } from "@/utils/number";
import { getThemeColors } from "@/utils/color";

export default function PriceChart({}: PriceChartProps) {
  const t = useTranslations("priceChart");

  // State
  const [ready, setReady] = useState(false);
  const [period, setPeriod] = useState<ChartPeriod>("1m");
  const [interval, setInterval] = useState("1h");
  const [chartType, setChartType] = useState<ChartType>("line");

  // Crosshair tooltip state
  const [crosshairData, setCrosshairData] = useState<{
    visible: boolean;
    x: number;
    y: number;
    time: string;
    price: string;
    volume: string;
  }>({ visible: false, x: 0, y: 0, time: "", price: "", volume: "" });

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const priceSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const colorsRef = useRef<ReturnType<typeof getThemeColors> | null>(null);

  // Update data
  const updateData = useCallback(() => {
    if (!priceSeriesRef.current || !volumeSeriesRef.current) return;
    const bars = generateMockOHLCV(period, interval);

    if (chartType === "line") {
      priceSeriesRef.current.setData(
        bars.map((b) => ({ time: b.time, value: b.close })),
      );
    } else {
      priceSeriesRef.current.setData(
        bars.map((b) => ({
          time: b.time,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
        })),
      );
    }

    const c = colorsRef.current;
    volumeSeriesRef.current.setData(
      bars.map((b) => ({
        time: b.time,
        value: b.volume,
        color:
          b.close >= b.open
            ? (c?.success ?? "#22c55e") + "66"
            : (c?.destructive ?? "#ef4444") + "66",
      })),
    );
  }, [period, interval, chartType]);

  // Initialize chart
  useEffect(() => {
    setReady(false);
    const container = containerRef.current;
    if (!container) return;

    const colors = getThemeColors();
    colorsRef.current = colors;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: colors.textColor,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: colors.borderColor },
        horzLines: { color: colors.borderColor },
      },
      crosshair: {
        horzLine: { style: LineStyle.Dashed, color: colors.textColor },
        vertLine: { style: LineStyle.Dashed, color: colors.textColor },
      },
      rightPriceScale: {
        borderColor: colors.borderColor,
      },
      timeScale: {
        borderColor: colors.borderColor,
        timeVisible: true,
      },
      width: container.clientWidth,
      height: 400,
    });

    chartRef.current = chart;

    // Price series
    if (chartType === "line") {
      const priceSeries = chart.addSeries(LineSeries, {
        color: colors.success,
        lineWidth: 2,
        lineType: LineType.WithSteps,
        crosshairMarkerRadius: 4,
        priceScaleId: "right",
      });
      priceSeriesRef.current = priceSeries;
    } else {
      const priceSeries = chart.addSeries(BarSeries, {
        upColor: colors.success,
        downColor: colors.destructive,
        priceScaleId: "right",
      });
      priceSeriesRef.current = priceSeries;
    }

    // Volume series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: colors.chart1,
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    volumeSeriesRef.current = volumeSeries;

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    // Generate initial data
    const bars = generateMockOHLCV(period, interval);

    if (chartType === "line") {
      priceSeriesRef.current.setData(
        bars.map((b) => ({ time: b.time, value: b.close })),
      );
    } else {
      priceSeriesRef.current.setData(
        bars.map((b) => ({
          time: b.time,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
        })),
      );
    }

    volumeSeries.setData(
      bars.map((b) => ({
        time: b.time,
        value: b.volume,
        color:
          b.close >= b.open ? colors.success + "66" : colors.destructive + "66",
      })),
    );
    chart.timeScale().fitContent();
    setReady(true);

    // Crosshair tooltip
    chart.subscribeCrosshairMove((param) => {
      if (
        !param.time ||
        !param.point ||
        !priceSeriesRef.current ||
        !volumeSeriesRef.current
      ) {
        setCrosshairData((prev) => ({ ...prev, visible: false }));
        return;
      }

      const pricePoint = param.seriesData.get(priceSeriesRef.current);
      const volumePoint = param.seriesData.get(volumeSeriesRef.current);

      const price =
        pricePoint && "value" in pricePoint
          ? pricePoint.value
          : pricePoint && "close" in pricePoint
            ? pricePoint.close
            : 0;
      const vol = volumePoint && "value" in volumePoint ? volumePoint.value : 0;

      const date = new Date((param.time as number) * 1000);
      const timeStr = date.toISOString().replace("T", " ").slice(0, 16);

      const tooltipWidth = tooltipRef.current?.offsetWidth ?? 180;
      const tooltipHeight = tooltipRef.current?.offsetHeight ?? 70;
      const containerWidth = container.clientWidth;

      let x = param.point.x + 16;
      let y = param.point.y - tooltipHeight / 2;

      if (x + tooltipWidth > containerWidth) {
        x = param.point.x - tooltipWidth - 16;
      }
      if (y < 0) y = 0;
      if (y + tooltipHeight > container.clientHeight) {
        y = container.clientHeight - tooltipHeight;
      }

      setCrosshairData({
        visible: true,
        x,
        y,
        time: timeStr,
        price: price.toFixed(6),
        volume: vol.toLocaleString(),
      });
    });

    const handleResize = () => {
      chart.applyOptions({ width: container.clientWidth });
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      priceSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartType]); // recreate chart when type changes

  // Update data when period/interval changes (but not on first mount since chart init handles it)
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    updateData();
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [period, interval, updateData]);

  // Handlers
  const handleRefresh = () => {
    updateData();
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
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

      {/* Chart */}
      <div className="relative h-100 border rounded-md">
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
    </div>
  );
}
