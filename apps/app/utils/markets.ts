import { fetchServer, fetchVaultServer } from "@/utils/fetcher";
import { SSR_REVALIDATE_DEFAULT, SSR_REVALIDATE_LONG } from "@/types/constants";
import type {
  MarketToken,
  VaultInfo,
  TokenInfo,
  TokenHealth,
  TokenStatus,
} from "@/types/interfaces";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Fetch vaults + token metadata from the API and merge into MarketToken[].
 * Called from the Markets page Server Component.
 */
export async function fetchMarketTokens(): Promise<MarketToken[]> {
  try {
    const [vaults, tokensRes] = await Promise.all([
      fetchVaultServer<VaultInfo[]>("/vaults", {
        revalidate: SSR_REVALIDATE_DEFAULT,
      }),
      fetchServer<{ tokens: TokenInfo[] }>("/tokens", {
        revalidate: SSR_REVALIDATE_LONG,
      }),
    ]);

    const tokenMap = new Map<string, TokenInfo>();
    for (const t of tokensRes.tokens ?? []) {
      if (t.tokenSymbol) {
        tokenMap.set(t.tokenSymbol.toLowerCase(), t);
      }
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

  const marketCap =
    price && circulatingSupply ? price * circulatingSupply : undefined;

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
    createdAt: tokenInfo?.timestamp
      ? new Date(tokenInfo.timestamp)
      : undefined,
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
