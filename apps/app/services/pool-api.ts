import { API_BASE_URL } from "@/types/constants";
import type { PoolConfig } from "@/types/interfaces";

const BASE_URL = API_BASE_URL;

export async function fetchPools(): Promise<PoolConfig[]> {
  try {
    const res = await fetch(`${BASE_URL}/pools`);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const data = await res.json();
    return data.pools ?? [];
  } catch (error) {
    console.error("[PoolApiService] fetchPools:", error);
    return [];
  }
}

export async function savePool(
  poolConfig: PoolConfig,
): Promise<{ message: string; pool: PoolConfig }> {
  const res = await fetch(`${BASE_URL}/pools`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(poolConfig),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to save pool: ${res.statusText}`);
  }
  return await res.json();
}
