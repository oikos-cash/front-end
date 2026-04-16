import { fetchVaultServer, fetchServer } from "@/utils/fetcher";
import { SSR_REVALIDATE_DEFAULT } from "@/types/constants";
import type { VaultInfo, TokenInfo, PriceTableToken } from "@/types/interfaces";

/**
 * Fetch the default vault for the Exchange home page (SSR).
 * Returns the first vault or null if API is unreachable.
 */
export async function fetchDefaultVault(): Promise<VaultInfo | null> {
  try {
    const vaults = await fetchVaultServer<VaultInfo[]>("/vaults", {
      revalidate: SSR_REVALIDATE_DEFAULT,
    });
    return vaults[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch vault by address (SSR).
 */
export async function fetchVaultByAddress(
  address: string,
): Promise<VaultInfo | null> {
  try {
    const vault = await fetchVaultServer<VaultInfo>(
      `/vaults/by-vault/${address}`,
      { revalidate: SSR_REVALIDATE_DEFAULT },
    );
    return vault ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch top tokens for the price table (SSR).
 * Maps API data to PriceTableToken shape.
 */
export async function fetchPriceTableTokens(): Promise<PriceTableToken[]> {
  try {
    const [vaults, tokensRes] = await Promise.all([
      fetchVaultServer<VaultInfo[]>("/vaults", {
        revalidate: SSR_REVALIDATE_DEFAULT,
      }),
      fetchServer<{ tokens: TokenInfo[] }>("/tokens", {
        revalidate: SSR_REVALIDATE_DEFAULT,
      }),
    ]);

    const tokenMap = new Map<string, TokenInfo>();
    for (const t of tokensRes.tokens ?? []) {
      if (t.tokenSymbol) tokenMap.set(t.tokenSymbol.toLowerCase(), t);
    }

    return vaults.slice(0, 20).map((vault, i) => {
      const info = tokenMap.get(vault.tokenSymbol.toLowerCase());
      const spotPriceX96 = BigInt(vault.spotPriceX96 || "0");
      const price =
        spotPriceX96 > BigInt(0) ? spotPriceToNumber(spotPriceX96) : 0;

      return {
        rank: i + 1,
        name: vault.tokenName,
        symbol: vault.tokenSymbol,
        price,
        change24h: 0, // Updated by WS stats
        volume24h: 0, // Updated by WS stats
        iconUrl: info?.logoUrl ?? info?.logoPreview,
        poolAddress: vault.poolAddress,
      };
    });
  } catch {
    return [];
  }
}

/** Convert vault spotPriceX96 (stored as wei-denominated BNB price) to a number. */
function spotPriceToNumber(spotPriceX96: bigint): number {
  return Number(spotPriceX96) / 1e18;
}
