"use client";

import useSWR from "swr";
import type { Address } from "viem";

import {
  readPoolState,
  readVaultPositions,
  readVaultFees,
  type PoolState,
  type VaultPosition,
  type VaultFees,
} from "@/services/pool";

/**
 * SWR hook for pool slot0 + liquidity. Refreshes every 15s.
 */
export function usePoolState(poolAddress: Address | undefined, chainId?: number) {
  const { data, error, isLoading, mutate } = useSWR(
    poolAddress ? ["pool-state", poolAddress, chainId] : null,
    () => readPoolState(poolAddress!, chainId),
    { refreshInterval: 15_000 },
  );

  return {
    poolState: data as PoolState | undefined,
    isLoading,
    error: error as Error | null,
    refetch: mutate,
  };
}

/**
 * SWR hook for vault's 3 positions (Floor/Anchor/Discovery). Refreshes every 30s.
 */
export function useVaultPositions(
  vaultAddress: Address | undefined,
  chainId?: number,
) {
  const { data, error, isLoading, mutate } = useSWR(
    vaultAddress ? ["vault-positions", vaultAddress, chainId] : null,
    () => readVaultPositions(vaultAddress!, chainId),
    { refreshInterval: 30_000 },
  );

  return {
    positions: (data ?? []) as VaultPosition[],
    isLoading,
    error: error as Error | null,
    refetch: mutate,
  };
}

/**
 * SWR hook for vault accumulated fees. Refreshes every 30s.
 */
export function useVaultFees(
  vaultAddress: Address | undefined,
  chainId?: number,
) {
  const { data, error, isLoading, mutate } = useSWR(
    vaultAddress ? ["vault-fees", vaultAddress, chainId] : null,
    () => readVaultFees(vaultAddress!, chainId),
    { refreshInterval: 30_000 },
  );

  return {
    fees: data as VaultFees | undefined,
    isLoading,
    error: error as Error | null,
    refetch: mutate,
  };
}
