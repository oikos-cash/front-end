import { formatEther } from "viem";

import { VAULT_API_URL } from "@/types/constants";
import { fetchApi, ApiError } from "@/utils/fetcher";
import { fetchTokensByDeployer } from "@/services/token";
import type {
  CreatorStatsResponse,
  CreatorVaultStats,
  EarningsHistoryPoint,
  TokenApiResponse,
} from "@/types/interfaces";

/**
 * Creator service — talks to NestJS @Controller('api/creator'),
 * `CreatorCompatController` (alias kept per plan §5 #4). Both routes are
 * @Public() and delegate to `EarningsService`.
 *
 * INTERCEPTOR PATH (verified): `creator-compat.controller.ts` does NOT use
 * @Res() and returns the service result directly, so responses pass through
 * the global `TransformInterceptor` and arrive as { data, timestamp }.
 * `fetchApi` unwraps the envelope to the bare service payload.
 *
 * SHAPE NOTE: the NestJS `EarningsService` returns a flat
 * `EarningsHistoryPoint[]` for both endpoints — NOT the rich legacy
 * `{ success, data: { deployer, vaults, totals, earningsHistory } }` object.
 * To preserve the public API of these functions for existing callers
 * (notably `useStudioData`, which projects vaults+totals into Studio cards
 * and KPIs), `fetchCreatorStats` makes a parallel call to the token service
 * to get the deployer's tokens, joins them against the earnings history,
 * and assembles the legacy `CreatorStatsResponse` shape from both inputs.
 */

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

/**
 * Pick the latest cumulative-earnings point for each vault from a flat
 * history. Assumes `earnings` is cumulative; if the backend ever switches
 * to per-period deltas this needs to sum instead of pick.
 */
function latestPerVault(
  history: EarningsHistoryPoint[],
): Map<string, EarningsHistoryPoint> {
  const out = new Map<string, EarningsHistoryPoint>();
  for (const point of history) {
    const key = point.vaultAddress.toLowerCase();
    const prev = out.get(key);
    if (!prev || point.timestamp > prev.timestamp) {
      out.set(key, point);
    }
  }
  return out;
}

/**
 * Project a deployer's tokens + earnings history into the legacy
 * CreatorStatsResponse shape consumed by `useStudioData`.
 */
function buildStatsResponse(
  deployer: string,
  tokens: TokenApiResponse[],
  earningsHistory: EarningsHistoryPoint[],
): CreatorStatsResponse {
  const earningsByVault = latestPerVault(earningsHistory);

  const vaults: CreatorVaultStats[] = tokens
    .filter((t) => !!t.vaultAddress)
    .map((t) => {
      const point = earningsByVault.get(t.vaultAddress!.toLowerCase());
      const currentEarnings = point?.earnings ?? "0";
      const currentEarningsFormatted =
        point?.earningsFormatted ?? safeFormatEther(currentEarnings);
      return {
        vaultAddress: t.vaultAddress!,
        tokenAddress: t.tokenAddress ?? "",
        tokenSymbol: t.tokenSymbol,
        tokenDecimals: t.tokenDecimals,
        currentEarnings,
        currentEarningsFormatted,
      };
    });

  // Totals: sum currentEarnings across vaults using BigInt for precision.
  // (Using BigInt(0) rather than `0n` to stay within the project's TS target.)
  let totalRaw = BigInt(0);
  for (const v of vaults) {
    try {
      totalRaw = totalRaw + BigInt(v.currentEarnings);
    } catch {
      // ignore non-numeric strings
    }
  }
  const totalEarnings = totalRaw.toString();
  const totalEarningsFormatted = safeFormatEther(totalEarnings);

  return {
    success: true,
    data: {
      deployer,
      vaults,
      totals: {
        totalEarnings,
        totalEarningsFormatted,
        vaultCount: vaults.length,
      },
      earningsHistory,
    },
  };
}

function safeFormatEther(value: string): string {
  try {
    return formatEther(BigInt(value));
  } catch {
    return "0";
  }
}

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
    const path = `/api/creator/${deployerAddress}${qs ? `?${qs}` : ""}`;

    // Fetch both in parallel — earnings history and the deployer's tokens.
    // Tokens come from /api/tokens/deployer/:address; earnings from the
    // creator alias endpoint.
    const [earningsHistory, tokens] = await Promise.all([
      fetchApi<EarningsHistoryPoint[]>(path, { baseUrl: VAULT_API_URL }).catch(
        (err) => {
          if (err instanceof ApiError && err.status === 404) return [];
          throw err;
        },
      ),
      fetchTokensByDeployer(deployerAddress).catch(() => [] as TokenApiResponse[]),
    ]);

    return buildStatsResponse(
      deployerAddress,
      tokens ?? [],
      earningsHistory ?? [],
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return {
        ...EMPTY_STATS,
        success: true,
        data: { ...EMPTY_STATS.data, deployer: deployerAddress },
      };
    }
    console.error("[CreatorService] fetchCreatorStats:", error);
    return {
      ...EMPTY_STATS,
      data: { ...EMPTY_STATS.data, deployer: deployerAddress },
    };
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

    const qs = params.toString();
    const path = `/api/creator/vault/${vaultAddress}/history${qs ? `?${qs}` : ""}`;

    const earningsHistory = await fetchApi<EarningsHistoryPoint[]>(path, {
      baseUrl: VAULT_API_URL,
    });
    return earningsHistory ?? [];
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return [];
    console.error("[CreatorService] fetchVaultEarningsHistory:", error);
    return [];
  }
}
