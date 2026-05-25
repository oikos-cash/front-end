import { fetchApi } from "@/utils/fetcher";
import type { TokenApiData, TokenApiResponse } from "@/types/interfaces";
import { isTokenBlocked } from "@/utils/token-blocklist";

/**
 * Filter out any token matching the frontend blocklist
 * (see types/constants.ts → BLOCKED_TOKENS). Runs at the service layer
 * so Markets, Exchange, Studio, and direct symbol routes all inherit it.
 */
function filterBlocked(tokens: TokenApiResponse[]): TokenApiResponse[] {
  return tokens.filter(
    (t) =>
      !isTokenBlocked({
        symbol: t.tokenSymbol,
        addresses: [
          t.tokenAddress,
          t.contractAddress,
          t.vaultAddress,
          t.poolAddress,
        ],
      }),
  );
}

/**
 * Fetch the catalog of tokens.
 * Backend: GET /api/tokens — returns Token[] (wrapped by TransformInterceptor,
 * unwrapped by fetchApi).
 */
export async function fetchTokens(options?: {
  includeAll?: boolean;
  chainId?: number;
}): Promise<TokenApiResponse[]> {
  try {
    const params = new URLSearchParams();
    if (options?.includeAll) params.set("includeAll", "true");
    if (options?.chainId) params.set("chainId", options.chainId.toString());

    const qs = params.toString();
    const tokens = await fetchApi<TokenApiResponse[]>(
      `/api/tokens${qs ? `?${qs}` : ""}`,
    );
    return filterBlocked(tokens);
  } catch (error) {
    console.error("[TokenService] fetchTokens:", error);
    return [];
  }
}

/**
 * Fetch a single token by its symbol.
 * Backend returns an array (zero or one match); we surface the first item.
 */
export async function fetchTokenBySymbol(
  symbol: string,
): Promise<TokenApiResponse | null> {
  try {
    const tokens = await fetchApi<TokenApiResponse[]>(
      `/api/tokens/by-symbol/${symbol}`,
    );
    const filtered = filterBlocked(tokens ?? []);
    return filtered[0] ?? null;
  } catch (error) {
    console.error("[TokenService] fetchTokenBySymbol:", error);
    return null;
  }
}

/**
 * Persist a new token. Protected route — requires EIP-191 auth headers built
 * by the caller (see `buildAuthHeaders` in @/utils/auth-fetch).
 */
export async function saveToken(
  tokenData: TokenApiData,
  auth: Record<string, string>,
): Promise<TokenApiResponse> {
  return await fetchApi<TokenApiResponse>(`/api/tokens`, {
    method: "POST",
    body: JSON.stringify(tokenData),
    auth,
  });
}

/**
 * Fetch tokens deployed by a specific address.
 */
export async function fetchTokensByDeployer(
  address: string,
): Promise<TokenApiResponse[]> {
  try {
    const tokens = await fetchApi<TokenApiResponse[]>(
      `/api/tokens/deployer/${address}`,
    );
    return filterBlocked(tokens);
  } catch (error) {
    console.error("[TokenService] fetchTokensByDeployer:", error);
    return [];
  }
}
