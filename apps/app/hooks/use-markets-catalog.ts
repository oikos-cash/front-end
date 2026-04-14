import { useMemo, useState } from "react";
import type { Address } from "viem";

// Types
import type { MarketToken } from "@/types/interfaces";

// Hooks
import { useBnbPrice } from "@/hooks/use-bnb-price";
import { useMarketPrices } from "@/hooks/use-market-prices";
import { useBalances } from "@/hooks/use-balances";
import { useWallet } from "@/stores/wallet";

export type FilterType = "all" | "presale" | "graduated";
export type SortType = "default" | "marketCap" | "newest" | "raised";

/**
 * @param initialTokens — SSR-fetched tokens from the server.
 *   Empty array means the API is not available.
 */
export function useMarketsCatalog(initialTokens: MarketToken[] = []) {
  const hasData = initialTokens.length > 0;

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("default");

  // ----- BNB price for USD conversion -----
  const { bnbPrice } = useBnbPrice();

  // ----- Real-time WS prices per pool -----
  const poolAddresses = useMemo(
    () => initialTokens.map((t) => t.poolAddress).filter(Boolean) as string[],
    [initialTokens],
  );
  const livePrices = useMarketPrices(poolAddresses);

  // ----- Balances for connected wallet -----
  const { address } = useWallet();
  const tokenAddresses = useMemo(
    () => initialTokens.map((t) => t.vaultAddress).filter(Boolean) as Address[],
    [initialTokens],
  );
  const { tokens: balanceMap } = useBalances(
    address as Address | null,
    tokenAddresses,
  );

  // ----- Enrich tokens with live data -----
  const enriched = useMemo(() => {
    if (!hasData) return [];

    return initialTokens.map((token) => {
      const poolKey = token.poolAddress?.toLowerCase();
      const livePrice = poolKey ? livePrices[poolKey] : undefined;
      const price = livePrice ?? token.price;

      const priceInUsd = price ? price * bnbPrice : undefined;
      const marketCap =
        priceInUsd && token.circulatingSupply
          ? priceInUsd * token.circulatingSupply
          : token.marketCap;

      return { ...token, price, marketCap };
    });
  }, [initialTokens, hasData, livePrices, bnbPrice]);

  // ----- Search, filter, sort -----
  const processed = useMemo(() => {
    let result = enriched;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (tk) =>
          tk.name.toLowerCase().includes(q) ||
          tk.symbol.toLowerCase().includes(q) ||
          tk.description.toLowerCase().includes(q),
      );
    }

    if (filter === "presale") {
      result = result.filter((tk) => tk.isPresale);
    } else if (filter === "graduated") {
      result = result.filter((tk) => tk.status === "graduated");
    }

    if (sort === "marketCap") {
      result = [...result].sort(
        (a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0),
      );
    } else if (sort === "newest") {
      result = [...result].sort(
        (a, b) =>
          (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
      );
    } else if (sort === "raised") {
      result = [...result].sort((a, b) => (b.raised ?? 0) - (a.raised ?? 0));
    }

    return result;
  }, [enriched, search, filter, sort]);

  const presaleTokens = useMemo(
    () => processed.filter((tk) => tk.isPresale),
    [processed],
  );
  const graduatedTokens = useMemo(
    () => processed.filter((tk) => tk.status === "graduated"),
    [processed],
  );

  const showSections =
    filter === "all" && !search.trim() && sort === "default";

  return {
    tokens: enriched,
    hasData,
    search,
    filter,
    sort,
    setSearch,
    setFilter,
    setSort,
    processed,
    presaleTokens,
    graduatedTokens,
    showSections,
    bnbPrice,
    balanceMap,
  };
}
