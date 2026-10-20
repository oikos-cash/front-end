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
import {
  CHART_INTERVALS,
  type ChartInterval,
  type ChartPeriod,
  type ChartType,
  type CrosshairData,
  type OHLCVBar,
} from "@/types/interfaces";

// Hooks
import { useOhlcCandles } from "@/hooks/use-ohlc-candles";

// Utils
import { getThemeColors } from "@/utils/color";

const DAY_MS = 86_400_000;

/** Span of each period; "max" asks for as much history as the API returns. */
const PERIOD_MS: Record<ChartPeriod, number> = {
  "1d": DAY_MS,
  "5d": 5 * DAY_MS,
  "1m": 30 * DAY_MS,
  "3m": 90 * DAY_MS,
  "6m": 180 * DAY_MS,
  "1y": 365 * DAY_MS,
  "2y": 730 * DAY_MS,
  max: Infinity,
};

const INTERVAL_MS: Record<ChartInterval, number> = {
  "1h": 3_600_000,
  "6h": 21_600_000,
  "1d": DAY_MS,
  "1w": 7 * DAY_MS,
};

/** Backend cap on candles per request (`MAX_LIMIT` in the OHLC service). */
const MAX_CANDLES = 1000;

/** Periods long enough to reach before the pool's first trade. */
const LONG_PERIODS: ChartPeriod[] = ["1y", "2y", "max"];

function candlesNeeded(period: ChartPeriod, interval: ChartInterval): number {
  return Math.ceil(PERIOD_MS[period] / INTERVAL_MS[interval]) + 1;
}

/** Finest interval at or above `current` that fits `period` in one request. */
function fitInterval(period: ChartPeriod, current: ChartInterval): ChartInterval {
  const start = CHART_INTERVALS.indexOf(current);
  for (const interval of CHART_INTERVALS.slice(start)) {
    if (period !== "max" && candlesNeeded(period, interval) <= MAX_CANDLES) {
      return interval;
    }
  }
  // "max" (or anything too long): daily candles cover ~2.7 years.
  return INTERVAL_MS[current] >= DAY_MS ? current : "1d";
}

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
  const [period, setPeriod] = useState<ChartPeriod>("max");
  const [interval, setInterval] = useState<ChartInterval>("1w");
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

  // OHLC data: SWR poll of /api/price/ohlc — handles dedupe + refresh.
  const limit = Math.min(candlesNeeded(period, interval), MAX_CANDLES);
  const { candles } = useOhlcCandles(poolAddress, interval, limit);

  // Switching to a longer period coarsens the interval when the finer one
  // would need more candles than the API returns in one request.
  const selectPeriod = useCallback((next: ChartPeriod) => {
    setPeriod(next);
    setInterval((current) => fitInterval(next, current));
  }, []);

  useEffect(() => {
    if (candles.length === 0) return;

    // Filter to selected period
    const cutoff = Date.now() - PERIOD_MS[period];
    let filtered = candles.filter((c) => c.timestamp >= cutoff);
    // The API flat-fills empty periods back past the pool's creation; drop
    // that leading zero-volume stretch so long periods start at the first trade.
    if (LONG_PERIODS.includes(period)) {
      const firstTrade = filtered.findIndex((c) => c.volume > 0);
      if (firstTrade > 0) filtered = filtered.slice(firstTrade);
    }
    if (filtered.length === 0) return;

    const bars: OHLCVBar[] = filtered.map((b) => ({
      time: Math.floor(b.timestamp / 1000) as OHLCVBar["time"],
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: b.volume,
    }));

    barsRef.current = bars;
    setHasData(true);
    pushBarsToChart(bars);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, period, chartType]);

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

    // OKS-side prices are denominated in BNB and sit in the 1e-4 range,
    // so the default 2-decimal price scale renders every value as "0.00".
    // Use 8 decimals with a minMove of 1e-8 instead.
    const priceFormat = {
      type: "price" as const,
      precision: 8,
      minMove: 0.00000001,
    };

    if (chartType === "line") {
      priceSeriesRef.current = chart.addSeries(LineSeries, {
        color: colors.success,
        lineWidth: 2,
        lineType: LineType.WithSteps,
        crosshairMarkerRadius: 4,
        priceScaleId: "right",
        priceFormat,
      });
    } else {
      priceSeriesRef.current = chart.addSeries(BarSeries, {
        upColor: colors.success,
        downColor: colors.destructive,
        priceScaleId: "right",
        priceFormat,
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
      // The volume series renders along the bottom band of the chart; its
      // own price-axis label (e.g. "0.02") was showing up as a second badge
      // beside the price scale and read as a stray number. Hide it.
      visible: false,
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
    setPeriod: selectPeriod,
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
