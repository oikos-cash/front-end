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
 * Polls OHLC candles from `GET /api/price/ohlc?pool=<addr>&interval=<i>`.
 *
 * SWR handles dedupe, error retry with exponential backoff, and skips the
 * request entirely when `poolAddress` is missing or zero. Replaces the
 * manual `setInterval` polling that used to live in `services/websocket.ts`.
 *
 * @returns `{ candles, isLoading, error }`. `candles` is an empty array
 * until the backend OHLC sync (`ENABLE_SYNC=true`) has produced data.
 */
export function useOhlcCandles(
  poolAddress: string | undefined | null,
  interval: string = "1h",
) {
  const key =
    poolAddress && poolAddress !== "0x0000000000000000000000000000000000000000"
      ? `/api/price/ohlc?pool=${poolAddress.toLowerCase()}&interval=${interval}`
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
