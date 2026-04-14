import { useEffect, useMemo, useState } from "react";

// Hooks
import { useWallet } from "@/stores/wallet";

// Services
import { fetchCreatorStats } from "@/services/creator";

// Types
import type {
  CreatorStatsResponse,
  StudioToken,
  StudioStats,
} from "@/types/interfaces";

/**
 * Fetches creator stats from the API and transforms into StudioToken[] + StudioStats.
 * Depends on the connected wallet — shows tokens deployed by the current user.
 */
export function useStudioData() {
  const { address, isConnected } = useWallet();
  const [isLoading, setIsLoading] = useState(true);
  const [creatorData, setCreatorData] = useState<CreatorStatsResponse | null>(
    null,
  );

  useEffect(() => {
    if (!isConnected || !address) {
      setIsLoading(false);
      setCreatorData(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const data = await fetchCreatorStats(address!);
        if (!cancelled) setCreatorData(data);
      } catch (err) {
        console.error("[useStudioData] fetch error:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isConnected, address]);

  const tokens = useMemo<StudioToken[]>(() => {
    if (!creatorData?.data?.vaults) return [];

    return creatorData.data.vaults.map((vault, i) => ({
      id: vault.vaultAddress,
      name: vault.tokenSymbol,
      symbol: vault.tokenSymbol,
      status: "active" as const,
      price: 0,
      change24h: 0,
      volume24h: 0,
      totalVolume: 0,
      holders: 0,
      liquidity: 0,
      earnings: parseFloat(vault.currentEarningsFormatted || "0"),
      createdAt: new Date(),
    }));
  }, [creatorData]);

  const stats = useMemo<StudioStats>(() => {
    if (!creatorData?.data) {
      return {
        totalTokens: 0,
        totalVolume: 0,
        totalHolders: 0,
        totalLiquidity: 0,
        totalEarnings: 0,
      };
    }

    return {
      totalTokens: creatorData.data.totals.vaultCount,
      totalVolume: 0,
      totalHolders: 0,
      totalLiquidity: 0,
      totalEarnings: parseFloat(
        creatorData.data.totals.totalEarningsFormatted || "0",
      ),
    };
  }, [creatorData]);

  return { tokens, stats, isLoading };
}
