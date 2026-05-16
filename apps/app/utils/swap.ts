import { fetchServer, fetchVaultServer } from "@/utils/fetcher";
import { SSR_REVALIDATE_DEFAULT, SSR_REVALIDATE_LONG } from "@/types/constants";
import type { VaultInfo, TokenInfo, SwapToken } from "@/types/interfaces";

/**
 * Fetch vaults + token metadata and merge into SwapToken[] for the Swap page (SSR).
 * Each vault becomes a swappable token. WBNB is always included as base pair.
 */
export async function fetchSwapTokens(): Promise<SwapToken[]> {
  try {
    const [vaults, tokensRes] = await Promise.all([
      fetchVaultServer<VaultInfo[]>("/vaults", {
        revalidate: SSR_REVALIDATE_DEFAULT,
      }),
      fetchServer<{ tokens: TokenInfo[] }>("/api/tokens", {
        revalidate: SSR_REVALIDATE_LONG,
      }),
    ]);

    const tokenMap = new Map<string, TokenInfo>();
    for (const t of tokensRes.tokens ?? []) {
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
      };
    });

    // Always include WBNB as the base pair token
    const hasWbnb = tokens.some(
      (t) => t.symbol.toUpperCase() === "WBNB" || t.symbol.toUpperCase() === "BNB",
    );
    if (!hasWbnb) {
      tokens.unshift({
        symbol: "WBNB",
        name: "Wrapped BNB",
        iconUrl:
          "https://assets-cdn.trustwallet.com/blockchains/binance/info/logo.png",
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
