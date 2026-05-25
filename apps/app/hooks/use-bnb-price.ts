"use client";

import useSWR from "swr";
import { type Address } from "viem";

import { getPublicClient } from "@/services/multicall";
import {
  BNB_USDT_POOL_ADDRESS,
  BNB_PRICE_CACHE_KEY,
  BNB_PRICE_CACHE_DURATION,
  BNB_PRICE_REFRESH_INTERVAL,
  BNB_PRICE_FALLBACK,
  BNB_PRICE_API_URL,
} from "@/types/constants";

const POOL_ABI = [
  {
    inputs: [],
    name: "slot0",
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "observationIndex", type: "uint16" },
      { name: "observationCardinality", type: "uint16" },
      { name: "observationCardinalityNext", type: "uint16" },
      { name: "feeProtocol", type: "uint8" },
      { name: "unlocked", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

interface CachedPrice {
  price: number;
  timestamp: number;
}

// -------------------------------------------------------
//                  LOCAL STORAGE CACHE
// -------------------------------------------------------

function getCachedPrice(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(BNB_PRICE_CACHE_KEY);
    if (!raw) return null;
    const cached: CachedPrice = JSON.parse(raw);
    if (Date.now() - cached.timestamp < BNB_PRICE_CACHE_DURATION) {
      return cached.price;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function setCachedPrice(price: number): void {
  if (typeof window === "undefined") return;
  try {
    const payload: CachedPrice = { price, timestamp: Date.now() };
    localStorage.setItem(BNB_PRICE_CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

// -------------------------------------------------------
//               PRICE FROM ON-CHAIN (slot0)
// -------------------------------------------------------

function sqrtPriceX96ToPrice(sqrtPriceX96: bigint): number {
  // sqrtPrice = sqrtPriceX96 / 2^96
  // price = sqrtPrice^2
  // adjust for decimal diff: WBNB (18) - USDT (6) = 12
  const sqrtPrice = Number(sqrtPriceX96) / 2 ** 96;
  const rawPrice = sqrtPrice * sqrtPrice;
  return rawPrice * 10 ** 12;
}

async function fetchPriceOnChain(): Promise<number> {
  const client = getPublicClient(56); // BNB Chain
  const result = await client.readContract({
    address: BNB_USDT_POOL_ADDRESS as Address,
    abi: POOL_ABI,
    functionName: "slot0",
  });
  const sqrtPriceX96 = result[0];
  return sqrtPriceX96ToPrice(sqrtPriceX96);
}

// -------------------------------------------------------
//          PRICE FROM BACKEND API (primary)
// -------------------------------------------------------

async function fetchPriceBackendApi(): Promise<number> {
  const res = await fetch(BNB_PRICE_API_URL);
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  return typeof data.price === "number" ? data.price : Number(data.price);
}

// -------------------------------------------------------
//                  COMBINED FETCHER
// -------------------------------------------------------

async function fetchBnbPrice(): Promise<number> {
  // 1. Try localStorage cache first
  const cached = getCachedPrice();
  if (cached) return cached;

  // 2. Try backend API first (most reliable)
  try {
    const price = await fetchPriceBackendApi();
    if (price > 0.01 && price < 100_000) {
      setCachedPrice(price);
      return price;
    }
  } catch {
    /* fall through to on-chain */
  }

  // 3. Try on-chain read (direct RPC)
  try {
    const price = await fetchPriceOnChain();
    if (price > 0.01 && price < 100_000) {
      setCachedPrice(price);
      return price;
    }
  } catch {
    /* fall through to default */
  }

  // 4. Emergency fallback
  return BNB_PRICE_FALLBACK;
}

// -------------------------------------------------------
//                      HOOK
// -------------------------------------------------------

/**
 * Global BNB/USD price hook. Reads from on-chain slot0 with API fallback.
 * Cached in localStorage for 5 min, SWR refreshes every 30s.
 *
 * @example
 * const { bnbPrice, isLoading } = useBnbPrice();
 * const usdValue = tokenAmount * bnbPrice;
 */
export function useBnbPrice() {
  // `fallbackData` must be identical on SSR and the first client render —
  // otherwise downstream `bnbPrice * x` calculations (market caps, USD
  // values, …) diverge and React aborts hydration. Reading the
  // localStorage cache here breaks that contract: it's `null` on the
  // server and a real number on the client. The SWR fetcher *itself*
  // reads the cache as its first step, so the live price still
  // populates without a network round-trip after mount.
  const { data, error, isLoading } = useSWR("bnb-price", fetchBnbPrice, {
    refreshInterval: BNB_PRICE_REFRESH_INTERVAL,
    dedupingInterval: BNB_PRICE_REFRESH_INTERVAL,
    fallbackData: BNB_PRICE_FALLBACK,
    revalidateOnFocus: false,
    errorRetryCount: 1,
  });

  return {
    bnbPrice: data ?? BNB_PRICE_FALLBACK,
    isLoading,
    error: error as Error | null,
  };
}
