import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Types
import type { MarketToken } from "@/types/interfaces";

// Utils
import { generateMockMarketTokens } from "@/utils/number";

// Constants
import { MARKETS_PAGE_SIZE, MARKETS_MAX_TOKENS } from "@/types/constants";

export type FilterType = "all" | "presale" | "graduated";
export type SortType = "default" | "marketCap" | "newest" | "raised";

export function useMarketsCatalog() {
  const [tokens, setTokens] = useState<MarketToken[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("default");
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Apply search, filter, and sort in a single pass to avoid redundant iterations
  const processed = useMemo(() => {
    let result = tokens;

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
  }, [tokens, search, filter, sort]);

  const presaleTokens = useMemo(
    () => processed.filter((tk) => tk.isPresale),
    [processed],
  );
  const graduatedTokens = useMemo(
    () => processed.filter((tk) => tk.status === "graduated"),
    [processed],
  );

  // Only show presale/graduated sections when no filters or sorting are active
  const showSections =
    filter === "all" && !search.trim() && sort === "default";

  // Simulates paginated token loading; will be replaced with real API calls
  const loadTokens = useCallback(
    (reset?: boolean) => {
      setIsLoading(true);
      const currentLength = reset ? 0 : tokens.length;
      const remaining = MARKETS_MAX_TOKENS - currentLength;

      if (remaining <= 0) {
        setHasMore(false);
        setIsLoading(false);
        return;
      }

      const count = Math.min(MARKETS_PAGE_SIZE, remaining);
      setTimeout(() => {
        const newTokens = generateMockMarketTokens(count, currentLength);
        setTokens((prev) => (reset ? newTokens : [...prev, ...newTokens]));
        setHasMore(currentLength + count < MARKETS_MAX_TOKENS);
        setIsLoading(false);
      }, 300);
    },
    [tokens.length],
  );

  useEffect(() => {
    loadTokens(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Infinite scroll: load next page when the sentinel element enters the viewport
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          hasMore &&
          !isLoading &&
          !search.trim()
        ) {
          loadTokens();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, loadTokens, search]);

  return {
    // State
    tokens,
    search,
    filter,
    sort,
    isLoading,
    hasMore,

    // Setters
    setSearch,
    setFilter,
    setSort,

    // Computed
    processed,
    presaleTokens,
    graduatedTokens,
    showSections,

    // Refs
    sentinelRef,
  };
}
