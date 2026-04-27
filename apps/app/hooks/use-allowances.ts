"use client";

import useSWR from "swr";
import type { Address } from "viem";

import { fetchAllowances } from "@/services/multicall";
import type { AllowanceResult } from "@/services/multicall";

/**
 * SWR hook to fetch ERC20 allowances via multicall.
 *
 * @example
 * const { allowances, isLoading } = useAllowances(
 *   address,
 *   [{ token: "0xOKS...", spender: "0xRouter..." }],
 *   56,
 * );
 * const oksAllowance = allowances[0];
 * if (!oksAllowance.isMaxApproved) { // show approve button }
 */
export function useAllowances(
  ownerAddress: Address | null | undefined,
  pairs: Array<{ token: Address; spender: Address }>,
  chainId?: number,
) {
  const key =
    ownerAddress && pairs.length > 0
      ? [
          "allowances",
          ownerAddress,
          pairs.map((p) => `${p.token}:${p.spender}`).join(","),
          chainId,
        ]
      : null;

  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => fetchAllowances(ownerAddress!, pairs, chainId),
    { refreshInterval: 30_000 },
  );

  return {
    allowances: (data ?? []) as AllowanceResult[],
    isLoading,
    error: error as Error | null,
    refetch: mutate,
  };
}
