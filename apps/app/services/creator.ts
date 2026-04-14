import { VAULT_API_URL } from "@/types/constants";
import type {
  CreatorStatsResponse,
  EarningsHistoryPoint,
} from "@/types/interfaces";

const BASE_URL = VAULT_API_URL;

const EMPTY_STATS: CreatorStatsResponse = {
  success: false,
  data: {
    deployer: "",
    vaults: [],
    totals: {
      totalEarnings: "0",
      totalEarningsFormatted: "0",
      vaultCount: 0,
    },
    earningsHistory: [],
  },
};

export async function fetchCreatorStats(
  deployerAddress: string,
  options?: {
    vaultAddress?: string;
    timeRange?: "24h" | "7d" | "30d" | "90d" | "all";
    interval?: "1h" | "6h" | "1d" | "1w";
    chainId?: number;
  },
): Promise<CreatorStatsResponse> {
  try {
    const params = new URLSearchParams();
    if (options?.vaultAddress) params.set("vaultAddress", options.vaultAddress);
    if (options?.timeRange) params.set("timeRange", options.timeRange);
    if (options?.interval) params.set("interval", options.interval);
    if (options?.chainId) params.set("chainId", options.chainId.toString());

    const qs = params.toString();
    const url = `${BASE_URL}/api/creator/${deployerAddress}${qs ? `?${qs}` : ""}`;

    const res = await fetch(url);

    if (res.status === 404) {
      return { ...EMPTY_STATS, success: true, data: { ...EMPTY_STATS.data, deployer: deployerAddress } };
    }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    return await res.json();
  } catch (error) {
    console.error("[CreatorService] fetchCreatorStats:", error);
    return { ...EMPTY_STATS, data: { ...EMPTY_STATS.data, deployer: deployerAddress } };
  }
}

export async function fetchVaultEarningsHistory(
  vaultAddress: string,
  options?: {
    timeRange?: "24h" | "7d" | "30d" | "90d" | "all";
    interval?: "1h" | "6h" | "1d" | "1w";
    chainId?: number;
  },
): Promise<EarningsHistoryPoint[]> {
  try {
    const params = new URLSearchParams();
    if (options?.timeRange) params.set("timeRange", options.timeRange);
    if (options?.interval) params.set("interval", options.interval);
    if (options?.chainId) params.set("chainId", options.chainId.toString());

    const url = `${BASE_URL}/api/creator/vault/${vaultAddress}/history?${params.toString()}`;
    const res = await fetch(url);

    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    const data = await res.json();
    return data.earningsHistory ?? [];
  } catch (error) {
    console.error("[CreatorService] fetchVaultEarningsHistory:", error);
    return [];
  }
}
