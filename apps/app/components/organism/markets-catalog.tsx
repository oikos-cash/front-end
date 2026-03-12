"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Components
import Empty from "@/components/atoms/empty";
import TokenCard from "@/components/molecules/token-card";
import TokenCardSkeleton from "@/components/molecules/token-card-skeleton";

// Hooks
import { useTranslations } from "next-intl";

// Icons
import { Loader2, Search, SearchX } from "lucide-react";

// Types
import { MarketToken } from "@/types/interfaces";

// Utils
import { generateMockMarketTokens } from "@/utils/number";

// Constants
const PAGE_SIZE = 12;
const MAX_TOKENS = 60;

export default function MarketsCatalog() {
  const t = useTranslations("markets");

  // State
  const [tokens, setTokens] = useState<MarketToken[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  // Refs
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Filter tokens by search
  const filtered = useMemo(() => {
    if (!search.trim()) return tokens;
    const q = search.toLowerCase();
    return tokens.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.symbol.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    );
  }, [tokens, search]);

  // Load tokens
  const loadTokens = useCallback(
    (reset?: boolean) => {
      setIsLoading(true);
      const currentLength = reset ? 0 : tokens.length;
      const remaining = MAX_TOKENS - currentLength;

      if (remaining <= 0) {
        setHasMore(false);
        setIsLoading(false);
        return;
      }

      const count = Math.min(PAGE_SIZE, remaining);
      setTimeout(() => {
        const newTokens = generateMockMarketTokens(count, currentLength);
        setTokens((prev) => (reset ? newTokens : [...prev, ...newTokens]));
        setHasMore(currentLength + count < MAX_TOKENS);
        setIsLoading(false);
      }, 300);
    },
    [tokens.length],
  );

  // Initial load
  useEffect(() => {
    loadTokens(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // IntersectionObserver for infinite scroll
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

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="sticky top-13 z-30 -mx-4 bg-white px-4 py-4 border-b">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-10 w-full rounded-md border border-border bg-background pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
          />
        </div>
      </div>

      {/* Grid */}
      {tokens.length === 0 && isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <TokenCardSkeleton count={8} />
        </div>
      ) : filtered.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((token) => (
              <TokenCard key={token.id} token={token} />
            ))}
          </div>
          <div ref={sentinelRef} className="h-1" />
          {isLoading && (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </>
      ) : (
        <Empty
          className="py-16"
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          icon={<SearchX className="size-6 text-muted-foreground" />}
        />
      )}
    </div>
  );
}
