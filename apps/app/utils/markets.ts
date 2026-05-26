import { fetchServer, fetchVaultServer } from "@/utils/fetcher";
import { SSR_REVALIDATE_DEFAULT, SSR_REVALIDATE_LONG } from "@/types/constants";
import {
  filterBlockedTokenInfo,
  filterBlockedVaults,
} from "@/utils/token-blocklist";
import type {
  MarketToken,
  VaultInfo,
  TokenInfo,
  TokenHealth,
  TokenStatus,
} from "@/types/interfaces";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Fallback creation dates for vaults the backend's `/api/tokens` feed
 * isn't populating with a real `timestamp` yet. Looked up by upper-
 * cased `tokenSymbol`. Remove entries here as the backend starts
 * persisting metadata on deploy.
 */
const HARDCODED_CREATED_AT: Record<string, Date | undefined> = {
  OKS: new Date("2025-06-17T00:00:00.000Z"),
  DWS: new Date("2026-05-25T00:00:00.000Z"),
};

/**
 * Fetch vaults + token metadata from the API and merge into MarketToken[].
 * Called from the Markets page Server Component.
 */
export async function fetchMarketTokens(): Promise<MarketToken[]> {
  try {
    // Fetch vaults (required) and tokens metadata (optional) separately
    // so that a failing token API doesn't break the entire page
    const rawVaults = await fetchVaultServer<VaultInfo[]>("/vaults", {
      revalidate: SSR_REVALIDATE_DEFAULT,
    });
    const vaults = filterBlockedVaults(rawVaults);

    let tokenMap = new Map<string, TokenInfo>();
    try {
      const tokensRes = await fetchServer<{ tokens: TokenInfo[] }>("/api/tokens", {
        revalidate: SSR_REVALIDATE_LONG,
      });
      for (const t of filterBlockedTokenInfo(tokensRes.tokens ?? [])) {
        if (t.tokenSymbol) {
          tokenMap.set(t.tokenSymbol.toLowerCase(), t);
        }
      }
    } catch {
      // Token metadata API is optional — vaults alone are enough
    }

    return vaults.map((vault) => mergeVaultToken(vault, tokenMap));
  } catch (err) {
    console.error("[fetchMarketTokens] Failed, returning empty:", err);
    return [];
  }
}

function mergeVaultToken(
  vault: VaultInfo,
  tokenMap: Map<string, TokenInfo>,
): MarketToken {
  const tokenInfo = tokenMap.get(vault.tokenSymbol.toLowerCase());

  const hasPresale =
    vault.presaleContract !== "" && vault.presaleContract !== ZERO_ADDRESS;
  const isGraduated = vault.isGraduated ?? false;

  const status = resolveStatus(vault, hasPresale, isGraduated);
  const health = resolveHealth(vault);

  const decimals = parseInt(vault.tokenDecimals || "18", 10);
  const rawTotalSupply = parseFloat(vault.token0TotalSupply ?? "0");
  const totalSupply = rawTotalSupply > 0 ? rawTotalSupply / 10 ** decimals : undefined;
  const rawCirculating = parseFloat(vault.circulatingSupply || vault.token0CirculatingSupply || "0");
  const circulatingSupply = rawCirculating > 0 ? rawCirculating / 10 ** decimals : undefined;

  const spotPriceX96 = BigInt(vault.spotPriceX96 || "0");
  const price =
    spotPriceX96 > BigInt(0) ? spotPriceToNumber(spotPriceX96) : undefined;

  // Market cap = price × totalSupply (same formula as old project)
  const marketCap =
    price && totalSupply ? price * totalSupply : undefined;

  return {
    id: vault.address,
    name: vault.tokenName,
    symbol: vault.tokenSymbol,
    description: tokenInfo?.tokenDescription ?? "",
    iconUrl: tokenInfo?.logoUrl ?? tokenInfo?.logoPreview,
    status,
    health,
    isPresale: hasPresale && !isGraduated,
    marketCap,
    totalSupply,
    circulatingSupply,
    // Hardcoded fallback creation dates for vaults the backend's
    // /api/tokens feed currently returns nothing for. Drop each entry
    // here once the backend starts persisting real `timestamp` values
    // on `saveToken`.
    createdAt: tokenInfo?.timestamp
      ? new Date(tokenInfo.timestamp)
      : HARDCODED_CREATED_AT[vault.tokenSymbol?.toUpperCase() ?? ""],
    raised: undefined, // Populated client-side from presale contract reads
    hardCap: tokenInfo?.softCap ? parseFloat(tokenInfo.softCap) : undefined,
    vaultAddress: vault.address,
    poolAddress: vault.poolAddress,
    presaleContract: hasPresale ? vault.presaleContract : undefined,
    price,
  };
}

function resolveStatus(
  vault: VaultInfo,
  hasPresale: boolean,
  isGraduated: boolean,
): TokenStatus {
  if (isGraduated) return "graduated";
  const ratio = parseFloat(vault.liquidityRatio || "0");
  if (ratio > 0 && ratio <= 200) return "finalized";
  if (hasPresale) return "inProgress";
  return "preparing";
}

function resolveHealth(vault: VaultInfo): TokenHealth {
  if (vault.health === "warning") return "warning";
  if (vault.health === "critical") return "critical";
  return "healthy";
}

/** Convert vault spotPriceX96 (stored as wei-denominated BNB price) to a number. */
function spotPriceToNumber(spotPriceX96: bigint): number {
  return Number(spotPriceX96) / 1e18;
}
