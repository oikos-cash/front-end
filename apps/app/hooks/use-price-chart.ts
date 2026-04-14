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
import type {
  ChartPeriod,
  ChartType,
  CrosshairData,
  OHLCVBar,
  WSOHLCUpdate,
} from "@/types/interfaces";

// Hooks
import { useWebSocket } from "@/hooks/use-websocket";

// Utils
import { getThemeColors } from "@/utils/color";

const CROSSHAIR_INITIAL: CrosshairData = {
  visible: false,
  x: 0,
  y: 0,
  time: "",
  price: "",
  volume: "",
};

export default function usePriceChart(poolAddress?: string) {
  // State
  const [ready, setReady] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [period, setPeriod] = useState<ChartPeriod>("1m");
  const [interval, setInterval] = useState("1h");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [crosshairData, setCrosshairData] =
    useState<CrosshairData>(CROSSHAIR_INITIAL);

  // DOM refs
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Chart instance refs
  const chartRef = useRef<IChartApi | null>(null);
  const priceSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const colorsRef = useRef<ReturnType<typeof getThemeColors> | null>(null);
  const barsRef = useRef<OHLCVBar[]>([]);

  // Receive OHLC data from WS
  const onOhlc = useCallback(
    (data: WSOHLCUpdate) => {
      const intervalBars = data.data[interval];
      if (!intervalBars || intervalBars.length === 0) return;

      const bars: OHLCVBar[] = intervalBars.map((b) => ({
        time: b.timestamp as OHLCVBar["time"],
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
        volume: b.volume,
      }));

      barsRef.current = bars;
      setHasData(true);
      pushBarsToChart(bars);
    },
    [interval, chartType],
  );

  useWebSocket({
    poolAddress,
    channels: ["ohlc"],
    ohlcInterval: interval,
    onOhlc,
    enabled: !!poolAddress,
  });

  function pushBarsToChart(bars: OHLCVBar[]) {
    if (!priceSeriesRef.current || !volumeSeriesRef.current) return;
    const c = colorsRef.current;

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

    chartRef.current?.timeScale().fitContent();
  }

  // Full chart creation
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
      rightPriceScale: { borderColor: colors.borderColor },
      timeScale: { borderColor: colors.borderColor, timeVisible: true },
      width: container.clientWidth,
      height: 400,
    });

    chartRef.current = chart;

    if (chartType === "line") {
      priceSeriesRef.current = chart.addSeries(LineSeries, {
        color: colors.success,
        lineWidth: 2,
        lineType: LineType.WithSteps,
        crosshairMarkerRadius: 4,
        priceScaleId: "right",
      });
    } else {
      priceSeriesRef.current = chart.addSeries(BarSeries, {
        upColor: colors.success,
        downColor: colors.destructive,
        priceScaleId: "right",
      });
    }

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: colors.chart1,
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    volumeSeriesRef.current = volumeSeries;

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    // If we already have bars from WS, render them
    if (barsRef.current.length > 0) {
      pushBarsToChart(barsRef.current);
    }

    setReady(true);

    // Tooltip crosshair
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
  }, [chartType]);

  const handleRefresh = useCallback(() => {
    if (barsRef.current.length > 0) {
      pushBarsToChart(barsRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartType]);

  return {
    ready,
    hasData,
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
