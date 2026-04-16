import { API_BASE_URL } from "@/types/constants";
import type { TokenApiData, TokenApiResponse } from "@/types/interfaces";

const BASE_URL = API_BASE_URL;

export async function fetchTokens(options?: {
  includeAll?: boolean;
  chainId?: number;
}): Promise<TokenApiResponse[]> {
  try {
    const params = new URLSearchParams();
    if (options?.includeAll) params.set("includeAll", "true");
    if (options?.chainId) params.set("chainId", options.chainId.toString());

    const qs = params.toString();
    const res = await fetch(`${BASE_URL}/tokens${qs ? `?${qs}` : ""}`);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const data = await res.json();
    return data.tokens ?? [];
  } catch (error) {
    console.error("[TokenService] fetchTokens:", error);
    return [];
  }
}

export async function fetchTokenBySymbol(
  symbol: string,
): Promise<TokenApiResponse | null> {
  try {
    const res = await fetch(`${BASE_URL}/tokens/by-symbol/${symbol}`);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const data = await res.json();
    return data.tokens?.[0] ?? null;
  } catch (error) {
    console.error("[TokenService] fetchTokenBySymbol:", error);
    return null;
  }
}

export async function saveToken(
  tokenData: TokenApiData,
): Promise<TokenApiResponse> {
  const res = await fetch(`${BASE_URL}/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tokenData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to save token: ${res.statusText}`);
  }
  const data = await res.json();
  return data.token;
}

export async function fetchTokensByDeployer(
  address: string,
): Promise<TokenApiResponse[]> {
  try {
    const res = await fetch(`${BASE_URL}/tokens/deployer/${address}`);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const data = await res.json();
    return data.tokens ?? [];
  } catch (error) {
    console.error("[TokenService] fetchTokensByDeployer:", error);
    return [];
  }
}
