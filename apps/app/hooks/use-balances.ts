"use client";

import useSWR from "swr";
import type { Address } from "viem";

import { fetchBalances } from "@/services/multicall";
import type { TokenBalanceResult } from "@/services/multicall";

/**
 * SWR hook to fetch native (BNB) + ERC20 balances via multicall.
 * Automatically deduplicates and caches (SWR handles both).
 *
 * @example
 * const { native, tokens, isLoading } = useBalances(
 *   address,
 *   ["0xToken1...", "0xToken2..."],
 *   56,
 * );
 */
export function useBalances(
  userAddress: Address | null | undefined,
  tokenAddresses: Address[],
  chainId?: number,
) {
  const key =
    userAddress && tokenAddresses.length > 0
      ? ["balances", userAddress, tokenAddresses.join(","), chainId]
      : null;

  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => fetchBalances(userAddress!, tokenAddresses, chainId),
    { refreshInterval: 15_000 },
  );

  return {
    native: data?.native ?? null,
    tokens: (data?.tokens ?? {}) as Record<string, TokenBalanceResult>,
    isLoading,
    error: error as Error | null,
    refetch: mutate,
  };
}
