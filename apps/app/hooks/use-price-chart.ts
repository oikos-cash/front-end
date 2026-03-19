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

// Types
import type { ChartPeriod, ChartType, CrosshairData } from "@/types/interfaces";

// Utils
import { generateMockOHLCV } from "@/utils/number";
import { getThemeColors } from "@/utils/color";

const CROSSHAIR_INITIAL: CrosshairData = {
  visible: false,
  x: 0,
  y: 0,
  time: "",
  price: "",
  volume: "",
};

export default function usePriceChart() {
  // State
  const [ready, setReady] = useState(false);
  const [period, setPeriod] = useState<ChartPeriod>("1m");
  const [interval, setInterval] = useState("1h");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [crosshairData, setCrosshairData] =
    useState<CrosshairData>(CROSSHAIR_INITIAL);

  // DOM refs
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Chart instance refs — stored in refs to avoid re-renders on chart mutations
  const chartRef = useRef<IChartApi | null>(null);
  const priceSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const colorsRef = useRef<ReturnType<typeof getThemeColors> | null>(null);

  // Pushes new OHLCV data into the existing series without recreating the chart
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

  // Full chart creation — re-runs when chartType changes because
  // lightweight-charts requires a new series type (Line vs Bar)
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

    // Price series — type depends on chartType
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

    // Volume series — always a histogram pinned to the bottom 20% of the chart
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: colors.chart1,
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    volumeSeriesRef.current = volumeSeries;

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    // Populate initial data
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
          b.close >= b.open
            ? colors.success + "66"
            : colors.destructive + "66",
      })),
    );
    chart.timeScale().fitContent();
    setReady(true);

    // Tooltip follows the crosshair, repositioning to stay within bounds
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
      const vol =
        volumePoint && "value" in volumePoint ? volumePoint.value : 0;

      const date = new Date((param.time as number) * 1000);
      const timeStr = date.toISOString().replace("T", " ").slice(0, 16);

      const tooltipWidth = tooltipRef.current?.offsetWidth ?? 180;
      const tooltipHeight = tooltipRef.current?.offsetHeight ?? 70;
      const containerWidth = container.clientWidth;

      // Flip tooltip to the left side if it would overflow the container
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

  // Skip the first mount since the chart init effect already loaded data
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

  const handleRefresh = useCallback(() => {
    updateData();
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [updateData]);

  return {
    ready,
    period,
    setPeriod,
    interval,
    setInterval,
    chartType,
    setChartType,
    crosshairData,
    containerRef,
    tooltipRef,
    handleRefresh,
  };
}
