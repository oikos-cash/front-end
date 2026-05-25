import { fetchServer, fetchVaultServer } from "@/utils/fetcher";
import { SSR_REVALIDATE_DEFAULT, SSR_REVALIDATE_LONG } from "@/types/constants";
import {
  filterBlockedTokenInfo,
  filterBlockedVaults,
} from "@/utils/token-blocklist";
import type { VaultInfo, TokenInfo, SwapToken } from "@/types/interfaces";

/**
 * Fetch vaults + token metadata and merge into SwapToken[] for the Swap page (SSR).
 * Each vault becomes a swappable token. WBNB is always included as base pair.
 */
export async function fetchSwapTokens(): Promise<SwapToken[]> {
  try {
    const [rawVaults, tokensRes] = await Promise.all([
      fetchVaultServer<VaultInfo[]>("/vaults", {
        revalidate: SSR_REVALIDATE_DEFAULT,
      }),
      fetchServer<{ tokens: TokenInfo[] }>("/api/tokens", {
        revalidate: SSR_REVALIDATE_LONG,
      }),
    ]);
    const vaults = filterBlockedVaults(rawVaults);

    const tokenMap = new Map<string, TokenInfo>();
    for (const t of filterBlockedTokenInfo(tokensRes.tokens ?? [])) {
      if (t.tokenSymbol) tokenMap.set(t.tokenSymbol.toLowerCase(), t);
    }

    const tokens: SwapToken[] = vaults.map((vault) => {
      const info = tokenMap.get(vault.tokenSymbol.toLowerCase());
      const spotPriceX96 = BigInt(vault.spotPriceX96 || "0");
      const price =
        spotPriceX96 > BigInt(0) ? spotPriceToNumber(spotPriceX96) : 0;

      return {
        symbol: vault.tokenSymbol,
        name: vault.tokenName,
        iconUrl: info?.logoUrl ?? info?.logoPreview ?? "",
        balance: 0,
        price,
        poolAddress: vault.poolAddress,
        vaultAddress: vault.address,
        token0: vault.token0,
        spotPriceX96: vault.spotPriceX96,
      };
    });

    // Always include both native BNB and Wrapped BNB as base pair options.
    // BNB has no contract address (token0 stays empty); the swap form
    // recognises the symbol and switches the ExchangeHelper mode accordingly.
    const hasWbnb = tokens.some((t) => t.symbol.toUpperCase() === "WBNB");
    if (!hasWbnb) {
      tokens.unshift({
        symbol: "WBNB",
        name: "Wrapped BNB",
        iconUrl: "",
        balance: 0,
        price: 1,
        poolAddress: "",
        vaultAddress: "",
        token0: "",
      });
    }
    const hasBnb = tokens.some((t) => t.symbol.toUpperCase() === "BNB");
    if (!hasBnb) {
      tokens.unshift({
        symbol: "BNB",
        name: "BNB",
        iconUrl: "",
        balance: 0,
        price: 1,
        poolAddress: "",
        vaultAddress: "",
        token0: "",
      });
    }

    return tokens;
  } catch (err) {
    console.error("[fetchSwapTokens] Failed:", err);
    return [];
  }
}

/** Convert vault spotPriceX96 (stored as wei-denominated BNB price) to a number. */
function spotPriceToNumber(spotPriceX96: bigint): number {
  return Number(spotPriceX96) / 1e18;
}
