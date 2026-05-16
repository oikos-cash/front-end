import { fetchApi } from "@/utils/fetcher";
import type { PoolConfig } from "@/types/interfaces";

/**
 * Fetch all configured pools.
 * Backend: GET /api/pools — returns Pool[] (wrapped by TransformInterceptor,
 * unwrapped by fetchApi).
 */
export async function fetchPools(): Promise<PoolConfig[]> {
  try {
    return await fetchApi<PoolConfig[]>(`/api/pools`);
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
