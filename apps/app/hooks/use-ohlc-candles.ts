"use client";

import useSWR from "swr";
import { swrFetcher } from "@/utils/fetcher";

export interface OhlcCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Polls OHLC candles from `GET /api/price/ohlc?pool=<addr>&interval=<i>&limit=<n>`.
 * The backend returns its last 200 candles unless `limit` (max 1000) is sent.
 *
 * SWR handles dedupe, error retry with exponential backoff, and skips the
 * request entirely when `poolAddress` is missing or zero. Replaces the
 * manual `setInterval` polling that used to live in `services/websocket.ts`.
 *
 * @returns `{ candles, isLoading, error }`. `candles` is an empty array
 * until the backend OHLC sync (`ENABLE_SYNC=true`) has produced data.
 */
/** Chart intervals the backend names differently (it has no "1d"). */
const API_INTERVAL: Record<string, string> = { "1d": "24h" };

export function useOhlcCandles(
  poolAddress: string | undefined | null,
  interval: string = "1h",
  limit?: number,
) {
  const apiInterval = API_INTERVAL[interval] ?? interval;
  const key =
    poolAddress && poolAddress !== "0x0000000000000000000000000000000000000000"
      ? `/api/price/ohlc?pool=${poolAddress.toLowerCase()}&interval=${apiInterval}${limit ? `&limit=${limit}` : ""}`
      : null;

  const { data, error, isLoading } = useSWR<OhlcCandle[]>(key, swrFetcher, {
    refreshInterval: 5_000,
    revalidateOnFocus: false,
  });

  return {
    candles: Array.isArray(data) ? data : [],
    isLoading,
    error,
  };
}
