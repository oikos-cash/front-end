"use client";

import useSWR from "swr";
import { swrFetcher } from "@/utils/fetcher";

interface SpotPriceResponse {
  pool: string;
  price: number | null;
  timestamp: number;
}

const REFRESH_MS = 5_000;

/**
 * Subscribe to real-time price updates for multiple pool addresses.
 * Returns a map of `poolAddress` (lowercased) → latest price.
 *
 * One independent SWR request per pool. SWR's `dedupingInterval`
 * collapses concurrent renders that ask for the same key, and
 * `refreshInterval` polls each pool every 5s.
 *
 * @example
 * const prices = useMarketPrices(["0xPool1...", "0xPool2..."]);
 * const price = prices["0xpool1..."]; // number | undefined
 */
export function useMarketPrices(
  poolAddresses: string[],
): Record<string, number> {
  const pools = poolAddresses
    .filter(
      (p): p is string =>
        !!p && p !== "0x0000000000000000000000000000000000000000",
    )
    .map((p) => p.toLowerCase());

  // Single SWR key per pool address. We cap at a sane number to keep the
  // hook count predictable; React requires a fixed number of hooks per
  // render, so we materialize a small fixed array here.
  // To support arbitrary list sizes, callers should batch their pool list
  // into chunks.
  return useSwrPriceMap(pools);
}

// Wrapper hook to keep the React hook order stable: we pre-allocate up to
// 32 SWR slots and pass the corresponding pool (or null when unused).
const MAX_POOLS = 32;

function useSwrPriceMap(pools: string[]): Record<string, number> {
  const padded: (string | null)[] = Array(MAX_POOLS)
    .fill(null)
    .map((_, i) => pools[i] ?? null);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const responses = padded.map((pool) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useSWR<SpotPriceResponse>(
      pool ? `/api/price?pool=${pool}` : null,
      swrFetcher,
      { refreshInterval: REFRESH_MS, revalidateOnFocus: false },
    ),
  );

  const prices: Record<string, number> = {};
  responses.forEach((r, i) => {
    const pool = padded[i];
    const price = r.data?.price;
    if (pool && typeof price === "number") {
      prices[pool] = price;
    }
  });

  return prices;
}
