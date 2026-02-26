import type { OHLCVBar, ChartPeriod, LiquidityBar, LiquidityData } from "@/types/interfaces";
import type { UTCTimestamp } from "lightweight-charts";

/**
 * Returns the number of days for a given chart period.
 */
export function getPeriodDays(period: ChartPeriod): number {
  switch (period) {
    case "1d":
      return 1;
    case "5d":
      return 5;
    case "1m":
      return 30;
    case "3m":
      return 90;
    case "6m":
      return 180;
    case "1y":
      return 365;
  }
}

/**
 * Returns the number of minutes for a given chart interval string.
 */
export function getIntervalMinutes(interval: string): number {
  switch (interval) {
    case "1h":
      return 60;
    case "4h":
      return 240;
    case "1d":
      return 1440;
    case "1w":
      return 10080;
    default:
      return 60;
  }
}

/**
 * Generates mock OHLCV data for a given period and interval.
 */
export function generateMockOHLCV(
  period: ChartPeriod,
  interval: string,
): OHLCVBar[] {
  const days = getPeriodDays(period);
  const intervalMinutes = getIntervalMinutes(interval);
  const totalMinutes = days * 24 * 60;
  const count = Math.max(Math.floor(totalMinutes / intervalMinutes), 20);

  const now = Math.floor(Date.now() / 1000);
  const intervalSeconds = intervalMinutes * 60;
  const startTime = now - count * intervalSeconds;

  let price = 0.15 + Math.random() * 0.05;
  const bars: OHLCVBar[] = [];

  for (let i = 0; i < count; i++) {
    const time = (startTime + i * intervalSeconds) as UTCTimestamp;
    const open = price;
    const change1 = (Math.random() - 0.48) * 0.008;
    const change2 = (Math.random() - 0.48) * 0.008;
    const mid = Math.max(0.01, open + change1);
    const close = Math.max(0.01, mid + change2);
    const high = Math.max(open, close, mid) + Math.random() * 0.003;
    const low = Math.min(open, close, mid) - Math.random() * 0.003;
    const volume = Math.floor(Math.random() * 50000) + 5000;

    bars.push({
      time,
      open: parseFloat(open.toFixed(6)),
      high: parseFloat(Math.max(0.01, high).toFixed(6)),
      low: parseFloat(Math.max(0.01, low).toFixed(6)),
      close: parseFloat(close.toFixed(6)),
      volume,
    });
    price = close;
  }

  return bars;
}

export const LIQUIDITY_CHART_MARGIN = { top: 10, right: 10, bottom: 30, left: 10 };

export function generateMockLiquidity(): LiquidityData {
  const spotBnb = 0.0002 + Math.random() * 0.0003;
  const spotPrice = spotBnb * (580 + Math.random() * 80);
  const liquidityRatio = 1.0 + Math.random() * 1.5;
  const circulatingSupply = Math.floor(140000 + Math.random() * 60000);
  const imvPrice = spotPrice * (0.3 + Math.random() * 0.3);

  const boundary = spotBnb + 0.0001 + Math.random() * 0.0002;
  const bars: LiquidityBar[] = [
    { from: spotBnb * 0.8, to: spotBnb * 0.85, height: 0.7 + Math.random() * 0.3, fill: "#f5c843" },
    { from: spotBnb * 0.85, to: boundary, height: 0.1 + Math.random() * 0.2, fill: "#d4a84b" },
    { from: boundary + 0.0001, to: 0.0012, height: 0.2 + Math.random() * 0.2, fill: "#86efac" },
  ];

  return { spotPrice, spotBnb, liquidityRatio, circulatingSupply, imvPrice, bars };
}
