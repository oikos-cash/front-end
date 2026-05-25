import { fetchApi } from "@/utils/fetcher";
import type { PoolConfig } from "@/types/interfaces";
import { isTokenBlocked } from "@/utils/token-blocklist";

/**
 * Drop any pool whose token0 or token1 hits the frontend blocklist
 * (see types/constants.ts → BLOCKED_TOKENS).
 */
function filterBlockedPools(pools: PoolConfig[]): PoolConfig[] {
  return pools.filter(
    (p) =>
      !isTokenBlocked({
        symbol: p.token0.symbol,
        addresses: [p.token0.address],
      }) &&
      !isTokenBlocked({
        symbol: p.token1.symbol,
        addresses: [p.token1.address],
      }),
  );
}

/**
 * Fetch all configured pools.
 * Backend: GET /api/pools — returns Pool[] (wrapped by TransformInterceptor,
 * unwrapped by fetchApi).
 */
export async function fetchPools(): Promise<PoolConfig[]> {
  try {
    const pools = await fetchApi<PoolConfig[]>(`/api/pools`);
    return filterBlockedPools(pools);
  } catch (error) {
    console.error("[PoolApiService] fetchPools:", error);
    return [];
  }
}

/**
 * Persist a new pool configuration. Protected route — caller must supply
 * EIP-191 auth headers via `buildAuthHeaders`.
 */
export async function savePool(
  poolConfig: PoolConfig,
  auth: Record<string, string>,
): Promise<{ message: string; pool: PoolConfig }> {
  return await fetchApi<{ message: string; pool: PoolConfig }>(`/api/pools`, {
    method: "POST",
    body: JSON.stringify(poolConfig),
    auth,
  });
}
