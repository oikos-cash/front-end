"use client";

import useSWR from "swr";
import { swrFetcher } from "@/utils/fetcher";

interface SpotPriceResponse {
  pool: string;
  price: number | null;
  timestamp: number;
}

/**
 * Polls the spot price of a pool from `GET /api/price?pool=<addr>`.
 *
 * SWR handles dedupe (`dedupingInterval`), error retry with exponential
 * backoff, focus revalidation, and request cancellation on unmount.
 * Replaces the manual `setInterval` polling that used to live in
 * `services/websocket.ts`.
 *
 * @returns `{ price, timestamp, isLoading, error }`. `price` is `null`
 * until the backend has indexed at least one swap for the pool.
 */
export function useSpotPrice(poolAddress: string | undefined | null) {
  const key =
    poolAddress && poolAddress !== "0x0000000000000000000000000000000000000000"
      ? `/api/price?pool=${poolAddress.toLowerCase()}`
      : null; // null key = SWR skips the request entirely

  const { data, error, isLoading } = useSWR<SpotPriceResponse>(key, swrFetcher, {
    refreshInterval: 5_000,
    revalidateOnFocus: false,
  });

  return {
    price: data?.price ?? null,
    timestamp: data?.timestamp ?? null,
    isLoading,
    error,
  };
}
